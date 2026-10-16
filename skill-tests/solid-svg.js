/* Exact vector hidden-surface renderer for the Gutenberg figure.
 * Camera and restrained light palette follow Anatomy (Ryan, MIT, 2026).
 * No average-depth painter keys: each face is cut by the nearer surface's
 * depth plane. Decorations use their owner's visibility clip as well.
 */
(() => {
  const EPS=1e-7, RAD=Math.PI/180;
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2;
  const path=p=>'M'+p.map(v=>v.map(n=>n.toFixed(3)).join(' ')).join('L')+'Z';
  const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
  const overlaps=(a,b)=>a[0]<b[2]-EPS&&a[2]>b[0]+EPS&&a[1]<b[3]-EPS&&a[3]>b[1]+EPS;
  // Split a convex polygon by ax + by + c = 0; retain the positive side.
  function half(p,a,b,c){
    if(!p.length)return [];
    const out=[];
    for(let i=0;i<p.length;i++){
      const x=p[i],y=p[(i+1)%p.length],u=a*x[0]+b*x[1]+c,v=a*y[0]+b*y[1]+c;
      if(u>=-EPS)out.push(x);
      if((u>EPS&&v<-EPS)||(u<-EPS&&v>EPS)){
        const t=u/(u-v);out.push([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t]);
      }
    }
    return out.length>2&&Math.abs(area(out))>EPS?out:[];
  }
  function subtract(p,clip){
    let current=p;const rest=[];
    for(let i=0;i<clip.length&&current.length;i++){
      const a=clip[i],b=clip[(i+1)%clip.length],dx=b[0]-a[0],dy=b[1]-a[1];
      const outside=half(current,dy,-dx,dx*a[1]-dy*a[0]);
      if(outside.length)rest.push(outside);
      current=half(current,-dy,dx,dy*a[0]-dx*a[1]);
    }
    return rest;
  }
  function plane(p,d){
    for(let i=1;i<p.length-1;i++){
      const a=p[0],b=p[i],c=p[i+1];
      const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
      if(Math.abs(det)<EPS)continue;
      const x=((d[i]-d[0])*(c[1]-a[1])-(d[i+1]-d[0])*(b[1]-a[1]))/det;
      const y=((b[0]-a[0])*(d[i+1]-d[0])-(c[0]-a[0])*(d[i]-d[0]))/det;
      return [x,y,d[0]-x*a[0]-y*a[1]];
    }
    return null;
  }
  class Scene{
    constructor({azimuth=42,elevation=30}={}){
      const a=azimuth*RAD,e=elevation*RAD;
      this.R=[Math.sin(a),-Math.cos(a),0];
      this.D=[Math.cos(a)*Math.sin(e),Math.sin(a)*Math.sin(e),-Math.cos(e)];
      this.V=[Math.cos(a)*Math.cos(e),Math.sin(a)*Math.cos(e),Math.sin(e)];
      this.faces=[];this.parts=new Set();this.groundCasters=[];
    }
    project(p){return [dot(p,this.R),dot(p,this.D)]}
    face(points,{name='',material='timber',edges=true,transform=p=>p}={}){
      const world=points.map(transform),normal=unit(cross(sub(world[1],world[0]),sub(world[2],world[0])));
      // Near-ground undersides cast onto the floor in world coordinates.
      // Collect before back-face culling: contact faces point away from camera.
      const height=world[0][2];
      if(normal[2]<-.999&&height>=-EPS&&height<=6&&world.every(p=>Math.abs(p[2]-height)<EPS)){
        this.groundCasters.push({name,height,world:world.map(p=>[...p])});
      }
      if(dot(normal,this.V)<1e-6)return null;
      let p=world.map(v=>this.project(v)),d=world.map(v=>dot(v,this.V));
      const edgePoints=points.map((v,i)=>[transform(v),transform(points[(i+1)%points.length])]);
      const equation=plane(p,d);if(!equation)return null;
      if(area(p)<0)p.reverse();
      const f={name,p,world,plane:equation,normal,material,box:bounds(p),lines:[],shadows:[],edgePoints,transform};
      this.faces.push(f);this.parts.add(name.split('/')[0]);return f;
    }
    contactShadow(face,points,{softness=1.2,opacity=.12}={}){
      if(!face)return;
      face.shadows.push({p:points.map(face.transform).map(p=>this.project(p)),softness,opacity});
    }
    line(face,points,{color='#b4b4b8',width=.48,closed=false,free=false}={}){
      if(!face)return;
      const p=points.map(face.transform).map(v=>this.project(v));
      face.lines.push(`<path d="M${p.map(v=>v.map(n=>n.toFixed(3)).join(' ')).join('L')}${closed?'Z':''}" fill="none" stroke="${color}" stroke-width="${width}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"${free?' data-free="true"':''}/>`);
    }
    box(name,x,y,z,w,d,h,{bevel=.55,material='timber',transform=p=>p}={}){
      const b=Math.min(bevel,w/4,d/4,h/3),ring=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],inner=[[x+b,y+b],[x+w-b,y+b],[x+w-b,y+d-b],[x+b,y+d-b]];
      const faces={};
      for(let i=0;i<4;i++){
        const j=(i+1)%4,a=ring[i],c=ring[j];
        faces[['back','right','front','left'][i]]=this.face([[...a,z],[...c,z],[...c,z+h-b],[...a,z+h-b]],{name:name+'/side'+i,material,transform});
        if(b)this.face([[...a,z+h-b],[...c,z+h-b],[...inner[j],z+h],[...inner[i],z+h]],{name:name+'/bevel'+i,material:'bevel',transform,edges:[false,false,true,false]});
      }
      faces.top=this.face(inner.map(v=>[...v,z+h]),{name:name+'/top',material,transform,edges:!b});
      faces.bottom=this.face([...ring].reverse().map(v=>[...v,z]),{name:name+'/bottom',material,transform});
      return faces;
    }
    cylinder(name,centre,axis,r,length,{material='timber',segments=40,transform=p=>p,thread=0,phase=0}={}){
      const a=unit(axis),u=unit(cross(Math.abs(a[2])>.9?[0,1,0]:[0,0,1],a)),v=cross(a,u);
      const at=(t,s)=>add(add(centre,mul(a,s)),add(mul(u,r*Math.cos(t)),mul(v,r*Math.sin(t))));
      const top=[],bottom=[];
      for(let i=0;i<segments;i++){
        const t=i/segments*Math.PI*2,tt=(i+1)/segments*Math.PI*2;
        const quad=[at(t,0),at(tt,0),at(tt,length),at(t,length)];
        const n1=dot(transform(add(centre,add(mul(u,Math.cos(t)),mul(v,Math.sin(t))))).map((x,k)=>x-transform(centre)[k]),this.V);
        const n2=dot(transform(add(centre,add(mul(u,Math.cos(tt)),mul(v,Math.sin(tt))))).map((x,k)=>x-transform(centre)[k]),this.V);
        const f=this.face(quad,{name:name+'/side'+i,material,transform,edges:[true,n1*n2<0,true,false]});
        if(thread&&f){
          const pitch=thread;
          for(let turn=-2;turn<length/pitch+2;turn++){
            const z1=turn*pitch+(t-phase)/Math.PI/2*pitch,z2=turn*pitch+(tt-phase)/Math.PI/2*pitch;
            if(z1>=.8&&z2<=length-.8){
              this.line(f,[at(t,z1),at(tt,z2)],{color:'#9a9a9f',width:.6});
              this.line(f,[at(t,z1+1.4),at(tt,z2+1.4)],{color:'#d4d4d6',width:.45});
            }
          }
        }
        bottom.push(at(t,0));top.push(at(t,length));
      }
      return {top:this.face(top,{name:name+'/top',material,transform}),bottom:this.face(bottom.reverse(),{name:name+'/bottom',material,transform})};
    }
    // A real round bore through a rectangular beam, with opaque inner walls.
    boredBeam(name,x,y,z,w,d,h,cx,cy,r,{transform=p=>p}={}){
      const ring=[],outer=[],tops=[];
      const angles=Array.from({length:48},(_,i)=>i/48*Math.PI*2);
      for(const [px,py] of [[x,y],[x+w,y],[x+w,y+d],[x,y+d]])angles.push((Math.atan2(py-cy,px-cx)+Math.PI*2)%(Math.PI*2));
      angles.sort((a,b)=>a-b);const N=angles.length;
      for(let i=0;i<N;i++){
        const t=angles[i],dx=Math.cos(t),dy=Math.sin(t);
        const reach=Math.min(dx>0?(x+w-cx)/dx:dx<0?(x-cx)/dx:Infinity,dy>0?(y+d-cy)/dy:dy<0?(y-cy)/dy:Infinity);
        ring.push([cx+dx*r,cy+dy*r]);outer.push([cx+dx*reach,cy+dy*reach]);
      }
      for(let i=0;i<N;i++){
        const j=(i+1)%N,a=ring[i],b=ring[j],c=outer[i],dd=outer[j];
        tops.push(this.face([[...a,z+h],[...c,z+h],[...dd,z+h],[...b,z+h]],{name:name+'/top'+i,transform,edges:[false,true,false,true]}));
        this.face([[...a,z],[...b,z],[...dd,z],[...c,z]],{name:name+'/bottom'+i,transform,edges:[true,false,true,false]});
        this.face([[...b,z],[...a,z],[...a,z+h],[...b,z+h]],{name:name+'/bore'+i,transform,edges:[false,false,true,false]});
      }
      const edge=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
      for(let i=0;i<4;i++){const j=(i+1)%4;this.face([[...edge[i],z],[...edge[j],z],[...edge[j],z+h],[...edge[i],z+h]],{name:name+'/edge'+i,transform});}
      return {tops};
    }
    color(f){
      if(f.material==='ink')return '#5c5c61';
      if(f.material==='paper')return '#fffefa';
      if(f.material==='bevel')return '#f5f5f2';
      const n=f.normal;
      const value=n[2]>.8?255:Math.round(223+18*(.5+.5*dot(n,unit([-.2,-.45,.86]))));
      const delta=f.material==='iron'?-8:0;
      return `rgb(${value+delta},${value+delta},${value+delta-2})`;
    }
    solve(){
      const faces=this.faces;let comparisons=0,clipped=0;
      for(const f of faces){
        let fragments=[f.p];
        // Bounding boxes prune the exact vector cuts. The result is independent
        // of this traversal and of DOM paint order, even at interlocking parts.
        const nearby=faces.filter(g=>g!==f&&overlaps(f.box,g.box)).sort((a,b)=>b.plane[2]-a.plane[2]);
        for(const g of nearby){
          const diff=g.plane.map((v,i)=>v-f.plane[i]);
          if(Math.max(...g.p.map(p=>diff[0]*p[0]+diff[1]*p[1]+diff[2]))<.00001)continue;
          const near=half(g.p,diff[0],diff[1],diff[2]-.00001);
          if(!near.length)continue;const bb=bounds(near);comparisons++;
          const next=[];
          for(const fragment of fragments){
            if(!overlaps(bounds(fragment),bb)){next.push(fragment);continue;}
            next.push(...subtract(fragment,near));
          }
          fragments=next;if(!fragments.length)break;
        }
        f.visible=fragments.filter(p=>Math.abs(area(p))>1e-5);
        if(f.visible.length!==1||Math.abs(Math.abs(area(f.visible[0]||[]))-Math.abs(area(f.p)))>.001)clipped++;
      }
      this.stats={surfaces:faces.length,visible:faces.filter(f=>f.visible.length).length,comparisons,clipped};
      return this;
    }
    // One geometric edge per solid. Collinear pieces are split at T junctions
    // before classification, so the radial mesh of a bored beam stays invisible.
    contours(){
      const groups=new Map(),round=n=>Math.round(n*1e4);
      for(const f of this.faces)for(const [a,b] of f.edgePoints){
        let dir=unit(sub(b,a));
        if(Math.hypot(...sub(b,a))<1e-5)continue;
        if(dir.find(n=>Math.abs(n)>1e-7)<0)dir=mul(dir,-1);
        const moment=cross(a,dir),key=f.name.split('/')[0]+'/'+[...dir,...moment].map(round).join(',');
        const t1=dot(a,dir),t2=dot(b,dir);
        if(!groups.has(key))groups.set(key,{dir,origin:sub(a,mul(dir,t1)),segments:[]});
        groups.get(key).segments.push({lo:Math.min(t1,t2),hi:Math.max(t1,t2),f});
      }
      const edges=[];
      for(const {dir,origin,segments} of groups.values()){
        const ends=segments.flatMap(e=>[e.lo,e.hi]).sort((a,b)=>a-b).filter((n,i,arr)=>!i||n-arr[i-1]>1e-5);
        for(let i=1;i<ends.length;i++){
          const lo=ends[i-1],hi=ends[i],mid=(lo+hi)/2;
          const owners=segments.filter(e=>e.lo<mid&&e.hi>mid).map(e=>e.f);
          if(!owners.length||owners.every(f=>!f.visible.length))continue;
          const silhouette=owners.length===1;
          if(!silhouette&&owners.every(f=>dot(f.normal,owners[0].normal)>.965))continue;
          const name=owners[0].name;
          const color=silhouette?(name.startsWith('platen/')?'#26262a':/^(sleeper|cross-sleeper|trestle-foot)/.test(name)?'#b4b4b8':'#8a8a8f'):'#d4d4d6';
          edges.push({a:add(origin,mul(dir,lo)),b:add(origin,mul(dir,hi)),color,silhouette});
        }
      }
      return edges;
    }
    // Clip the centreline by actual foreground planes, without cutting half
    // the stroke off at each owner's boundary or depending on DOM paint order.
    visibleEdge(a,b){
      const p=this.project(a),q=this.project(b),da=dot(a,this.V),db=dot(b,this.V),hidden=[];
      const bb=bounds([p,q]);
      for(const f of this.faces){
        if(bb[0]>f.box[2]+EPS||bb[2]<f.box[0]-EPS||bb[1]>f.box[3]+EPS||bb[3]<f.box[1]-EPS)continue;
        let lo=0,hi=1;
        const clip=(u,v)=>{
          if(u<0&&v<0)return false;
          if(u>=0&&v>=0)return true;
          const t=u/(u-v);
          if(u<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
          return hi-lo>1e-7;
        };
        const depth=p=>f.plane[0]*p[0]+f.plane[1]*p[1]+f.plane[2];
        if(!clip(depth(p)-da-.00002,depth(q)-db-.00002))continue;
        let inside=true;
        for(let i=0;i<f.p.length;i++){
          const c=f.p[i],d=f.p[(i+1)%f.p.length],dx=d[0]-c[0],dy=d[1]-c[1];
          if(!clip(dx*(p[1]-c[1])-dy*(p[0]-c[0])+EPS,dx*(q[1]-c[1])-dy*(q[0]-c[0])+EPS)){inside=false;break;}
        }
        if(inside&&hi>lo)hidden.push([lo,hi]);
      }
      hidden.sort((a,b)=>a[0]-b[0]);
      const spans=[];let cursor=0;
      for(const [lo,hi] of hidden){if(lo>cursor+1e-6)spans.push([cursor,lo]);cursor=Math.max(cursor,hi);}
      if(cursor<1-1e-6)spans.push([cursor,1]);
      const at=t=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
      return spans.map(([lo,hi])=>`M${at(lo).map(n=>n.toFixed(3)).join(' ')}L${at(hi).map(n=>n.toFixed(3)).join(' ')}`).join('');
    }
    render({viewBox='-290 -345 580 570',label='Деревянный винтовой печатный пресс',order=null}={}){
      this.solve();let defs='',body='',surfaceShadows='',shadowId=0;const fills=new Map();
      const shadow=(polygons,softness,opacity)=>{
        const id='contact-shadow-'+shadowId++,bb=bounds(polygons.flat()),pad=softness*4;
        // Explicit user-space bounds keep the penumbra intact on narrow feet.
        defs+=`<filter id="${id}" filterUnits="userSpaceOnUse" x="${bb[0]-pad}" y="${bb[1]-pad}" width="${bb[2]-bb[0]+pad*2}" height="${bb[3]-bb[1]+pad*2}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${softness}"/></filter>`;
        return `<path d="${polygons.map(path).join('')}" fill="#000" opacity="${opacity}" filter="url(#${id})"/>`;
      };
      const floorGroups=new Map();
      for(const f of this.groundCasters){
        const height=Number(f.height.toFixed(3));
        if(!floorGroups.has(height))floorGroups.set(height,[]);
        floorGroups.get(height).push(f.world.map(([x,y])=>this.project([x,y,0])));
      }
      let groundShadows='';
      for(const [height,polygons] of floorGroups){
        // A low platform has a wider penumbra; feet have a tighter contact edge.
        groundShadows+=shadow(polygons,3+height*.35,height<.01?.075:.085);
        if(height<.01)groundShadows+=shadow(polygons,.9,.13);
      }
      const faces=order?order(this.faces):this.faces;
      for(let i=0;i<faces.length;i++){
        const f=faces[i];if(!f.visible.length)continue;
        const visible=f.visible.map(path).join('');
        const color=this.color(f);fills.set(color,(fills.get(color)||'')+visible);
        // Shared cut boundaries are not stroked: they are occlusion, not seams.
        defs+=`<clipPath id="sf${i}" clipPathUnits="userSpaceOnUse"><path d="${visible}"/></clipPath>`;
        if(f.shadows.length)surfaceShadows+=`<g data-contact-surface="${f.name}" clip-path="url(#sf${i})">${f.shadows.map(s=>shadow([s.p],s.softness,s.opacity)).join('')}</g>`;
        body+=`<g data-surface="${f.name}" clip-path="url(#sf${i})">`;
        body+=f.lines.join('')+'</g>';
      }
      const painted=[...fills].map(([fill,d])=>`<path d="${d}" fill="${fill}"/>`).join('');
      const strokes=new Map();
      for(const edge of this.contours()){
        const d=this.visibleEdge(edge.a,edge.b);
        if(d)strokes.set(edge.color,(strokes.get(edge.color)||'')+d);
      }
      const outlines=[...strokes].map(([stroke,d])=>`<path data-contour="${stroke}" d="${d}" fill="none" stroke="${stroke}" stroke-width=".6" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" class="press-svg"><defs>${defs}</defs><g data-ground-shadow="true">${groundShadows}</g>${painted}${surfaceShadows}${outlines}${body}</svg>`;
    }
    // Independent point-ray oracle for checking the vector visibility cuts.
    audit({samples=2500,seed=12345}={}){
      if(!this.stats)this.solve();let error=0,tested=0;let s=seed;
      const rand=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
      const inside=(p,poly)=>poly.length>2&&poly.every((a,i)=>{const b=poly[(i+1)%poly.length];return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>=-1e-6;});
      const all=bounds(this.faces.flatMap(f=>f.p));
      for(let i=0;i<samples;i++){
        const p=[all[0]+rand()*(all[2]-all[0]),all[1]+rand()*(all[3]-all[1])];
        const hit=this.faces.filter(f=>inside(p,f.p));if(!hit.length)continue;
        const depths=hit.map(f=>({f,d:f.plane[0]*p[0]+f.plane[1]*p[1]+f.plane[2]}));
        const max=Math.max(...depths.map(v=>v.d));
        const shown=hit.filter(f=>f.visible.some(v=>inside(p,v)));
        if(!shown.length||shown.some(f=>max-(f.plane[0]*p[0]+f.plane[1]*p[1]+f.plane[2])>.0001))error++;
        tested++;
      }
      return {tested,error,...this.stats};
    }
  }
  globalThis.PressSolid={Scene,add,sub,mul,dot,cross,unit};
})();
