// A functional educational station, not a replica of one museum instrument.
(() => {
 const {Scene,add,sub,mul,dot,unit,cross}=PressSolid;
 const ring=(x,y,z,r,n=24)=>Array.from({length:n},(_,i)=>[x+r*Math.cos(i/n*2*Math.PI),y+r*Math.sin(i/n*2*Math.PI),z]);
 function makeTelegraph({key=0}={}){
  key=Math.max(0,Math.min(1,key));
  const s=new Scene({azimuth:45,elevation:30});
  const geometry={boxes:[],wires:[],cylinders:[]};
  const box=(name,x,y,z,w,d,h,options={})=>{
   geometry.boxes.push({name,x,y,z,w,d,h,transform:options.transform||((p)=>p)});
   const solid=s.box(name,x,y,z,w,d,h,options);
   if(['key-base','battery-plinth','receiver-base'].includes(name)){
    s.contactShadow(bench.top,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]]);
   }
   return solid;
  };
  const round=(name,p,axis,r,h,options={})=>{geometry.cylinders.push({name,p,axis,r,h,transform:options.transform||((p)=>p)});return s.cylinder(name,p,axis,r,h,{segments:24,...options});};
  const groove=(f,x,y,z,w,d)=>s.line(f,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],{closed:true,color:'#d4d4d6',width:.6});
  const screw=(f,x,y,z,r=1.8)=>{s.line(f,ring(x,y,z,r),{closed:true,width:.6});s.line(f,[[x-r*.65,y-r*.45,z],[x+r*.65,y+r*.45,z]],{width:.6,color:'#8a8a8f'});};
  const post=(name,x,y,z)=>{
   round(name+'-washer',[x,y,z],[0,0,1],5,1.5);
   round(name+'-stem',[x,y,z+1.5],[0,0,1],2.2,8.5,{material:'iron'});
   const cap=round(name+'-cap',[x,y,z+10],[0,0,1],4,2.5);
   screw(cap.top,x,y,z+12.5,1.7);
   return [x,y,z+12.5];
  };
  const tube=(name,points,r=.85)=>{
   geometry.wires.push({name,points,r});
   for(let i=1;i<points.length;i++){
    const delta=sub(points[i],points[i-1]),length=Math.hypot(...delta);
    if(length>1e-4)round(name+'/'+i,points[i-1],unit(delta),r,length,{segments:8});
   }
  };
  // A quadratic fillet keeps wire runs tangent at each bend.
  const cable=(name,vertices,r=.85)=>{
   const p=[vertices[0]];
   for(let i=1;i<vertices.length-1;i++){
    const v=vertices[i],before=vertices[i-1],after=vertices[i+1];
    const a=sub(before,v),b=sub(after,v),radius=Math.min(4,Math.hypot(...a)/3,Math.hypot(...b)/3);
    const from=add(v,mul(unit(a),radius)),to=add(v,mul(unit(b),radius));
    p.push(from);
    for(let j=1;j<=4;j++){const t=j/4;p.push(add(add(mul(from,(1-t)**2),mul(v,2*t*(1-t))),mul(to,t*t)));}
   }
   p.push(vertices.at(-1));tube(name,p,r);
  };
  const spring=(name,bottom,top,r,turns=4)=>{
   const p=Array.from({length:turns*12+1},(_,i)=>{
    const t=i/(turns*12),theta=t*turns*2*Math.PI;
    return [bottom[0]+(top[0]-bottom[0])*t+r*Math.cos(theta),bottom[1]+(top[1]-bottom[1])*t+r*Math.sin(theta),bottom[2]+(top[2]-bottom[2])*t];
   });tube(name,p,.34);
  };
  // Heavy bench, four feet and a thin inset edge.
  for(const x of [-178,162])for(const y of [-80,104])round('bench-foot'+x+','+y,[x,y,0],[0,0,1],7,5);
  const bench=box('bench',-190,-92,5,380,210,9,{bevel:1.3});
  groove(bench.top,-186,-88,14,372,202);
  for(const x of [-182,182])for(const y of [-84,110])screw(bench.top,x,y,14);
  const label=box('label',-19,94,14,54,13,.6,{bevel:.2});
  groove(label.top,-17,96,14.6,50,9);
  for(let i=0;i<3;i++)s.line(label.top,[[-12,98+i*2,14.6],[25-i*5,98+i*2,14.6]],{color:'#b4b4b8',width:.6,free:true});
  // The sender's wooden/insulating base supports each bearing and contact.
  const base=box('key-base',-126,0,14,102,110,7,{bevel:1});
  groove(base.top,-122,4,21,94,102);
  for(const x of [-119,-31])for(const y of [7,103])screw(base.top,x,y,21);
  for(const x of [-94,-63])box('key-bearing'+x,x,28,21,7,14,25,{bevel:.6});
  round('key-axle',[-94,35,46],[1,0,0],2.1,38,{material:'iron'});
  for(const x of [-96,-58])round('key-bearing-cap'+x,[x,35,46],[1,0,0],3.5,2);
  // Lowest rim of the tilted moving contact meets the fixed contact, not its body.
  const a=Math.asin(6.5/Math.hypot(47.4,5))-Math.atan2(5,47.4),angle=-a*key;
  const lever=([x,y,z])=>[x,35+(y-35)*Math.cos(angle)-(z-46)*Math.sin(angle),46+(y-35)*Math.sin(angle)+(z-46)*Math.cos(angle)];
  const bar=box('key-lever',-80,24,44,10,68,4,{bevel:.6,transform:lever});
  groove(bar.top,-78,26,48,6,62);
  round('key-grip-stem',[-75,88,48],[0,0,1],4,6,{transform:lever});
  round('key-grip-flange',[-75,88,54],[0,0,1],12,2,{transform:lever});
  const knob=round('key-grip',[-75,88,56],[0,0,1],13,4,{segments:48,material:'ink',transform:lever});
  s.line(knob.top,ring(-75,88,60,10.5),{closed:true,color:'#8a8a8f',width:.6});
  round('key-contact-insulator',[-75,80,21],[0,0,1],6,2);
  round('key-contact-stem',[-75,80,23],[0,0,1],2.5,14.5,{material:'iron'});
  round('key-contact-head',[-75,80,37.5],[0,0,1],4,2,{material:'iron'});
  round('key-moving-contact',[-75,80,41],[0,0,1],2.4,3,{material:'iron',transform:lever});
  round('key-spring-seat',[-75,60,21],[0,0,1],5,2);
  round('key-spring-cup',[-75,60,43],[0,0,1],4.8,1,{transform:lever});
  const springTop=lever([-75,60,43.4]);spring('key-spring',[-75,60,23.4],springTop,3.7);
  // Upper stop limits upward travel; pressing the grip moves away from it.
  for(const x of [-87,-66])box('key-stop-pillar'+x,x,43,21,3,4,29,{bevel:.3});
  box('key-stop-bridge',-87,43,50,24,4,3,{bevel:.3});
  round('key-stop-screw',[-75,45,48],[0,0,1],1.3,8,{material:'iron'});
  round('key-stop-nut',[-75,45,56],[0,0,1],3,2);
  const keyIn=post('key-in',-113,11,21),keyOut=post('key-out',-37,11,21);
  // Closed battery case: cells inside are schematic, not a claimed 1844 design.
  box('battery-plinth',-160,-78,14,66,58,3,{bevel:.7});
  const battery=box('battery-case',-157,-75,17,60,52,45,{bevel:1});
  for(const side of [battery.front,battery.right]){
   if(side===battery.front)s.line(side,[[-157,-23,58],[-97,-23,58]],{color:'#b4b4b8',width:.6});
   else s.line(side,[[-97,-75,58],[-97,-23,58]],{color:'#b4b4b8',width:.6});
  }
  const lid=box('battery-lid',-159,-77,62,64,56,4,{bevel:.7});groove(lid.top,-155,-73,66,56,48);
  const batteryPlus=post('battery-positive',-143,-48,66),batteryMinus=post('battery-negative',-111,-48,66);
  // Sounder: paired coils, common yoke and a pivoted iron armature.
  const rb=box('receiver-base',45,-16,14,102,104,7,{bevel:1});groove(rb.top,49,-12,21,94,96);
  for(const x of [52,140])for(const y of [-9,81])screw(rb.top,x,y,21);
  box('receiver-yoke',63,2,21,65,29,4,{bevel:.5,material:'iron'});
  for(const x of [77,114]){
   round('receiver-bobbin-bottom'+x,[x,16,25],[0,0,1],13,3);
   round('receiver-coil'+x,[x,16,28],[0,0,1],10.5,23,{thread:2.1});
   round('receiver-bobbin-top'+x,[x,16,51],[0,0,1],13,2);
   round('receiver-core'+x,[x,16,53],[0,0,1],4.5,2,{material:'iron'});
  }
  for(const x of [65,122])box('receiver-bearing'+x,x,-8,21,5,10,41,{bevel:.5});
  round('receiver-axle',[65,-3,62],[1,0,0],2,62,{material:'iron'});
  const receiverAngle=-.035*key;
  const arm=([x,y,z])=>[x,-3+(y+3)*Math.cos(receiverAngle)-(z-62)*Math.sin(receiverAngle),62+(y+3)*Math.sin(receiverAngle)+(z-62)*Math.cos(receiverAngle)];
  box('receiver-lever',92,-7,60,7,65,3,{bevel:.4,transform:arm});
  box('receiver-armature',63,8,57,65,16,3,{bevel:.5,material:'iron',transform:arm});
  round('receiver-return-seat',[95.5,47,21],[0,0,1],4,2);
  round('receiver-spring-cup',[95.5,47,59],[0,0,1],3.8,1,{transform:arm});
  spring('receiver-spring',[95.5,47,23.5],arm([95.5,47,59.5]),2.8);
  box('receiver-stop-pillar',118,48,21,6,8,45,{bevel:.4});
  box('receiver-stop-arm',95.5,48,66,28.5,8,3,{bevel:.4});
  round('receiver-stop-screw',[95.5,52,63],[0,0,1],1.5,9,{material:'iron'});
  round('receiver-stop-nut',[95.5,52,72],[0,0,1],3,2);
  const receiverIn=post('receiver-in',53,-3,21),receiverOut=post('receiver-out',139,-3,21);
  // Leads run outside cases and bases, then land on binding-post caps.
  cable('lead-battery-key',[batteryPlus,[-143,-48,85],[-167,-48,85],[-167,-48,16],[-167,-7,16],[-113,-7,16],[-113,-7,35],keyIn]);
  cable('lead-key-receiver',[keyOut,[-18,11,35],[-18,-31,35],[53,-31,35],receiverIn]);
  cable('lead-receiver-battery',[receiverOut,[155,-3,35],[155,-3,16],[155,-48,16],[-87,-48,16],[-87,-48,85],[-111,-48,85],batteryMinus]);
  s.telegraphGeometry=geometry;
  s.contactGap=46-47.4*Math.sin(a*key)-5*Math.cos(a*key)-39.5;
  s.keyPosition=lever([-75,88,60]);
  return s;
 }
 makeTelegraph.viewBox='-250 -175 500 330';
 globalThis.makeTelegraph=makeTelegraph;
})();
