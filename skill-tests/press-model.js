// Functional proportions for an explanatory reconstruction, not shop drawings.
(() => {
  const {Scene,add,mul}=PressSolid;
  const ring=(cx,cy,z,r,n=32)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(i/n*Math.PI*2),cy+r*Math.sin(i/n*Math.PI*2),z]);
  const circleY=(x,y,z,r,n=24)=>Array.from({length:n},(_,i)=>[x+r*Math.cos(i/n*Math.PI*2),y,z+r*Math.sin(i/n*Math.PI*2)]);
  const geometry=Object.freeze({frameLift:48,carriageTravel:166,hingeZ:153,paperZ:157,viewBox:'-365 -445 570 620'});
  function makePress(input={}){
    const state={fold:0,travel:0,press:0,printed:false,apart:0,...input};
    const s=new Scene({azimuth:48,elevation:30});
    const {frameLift,carriageTravel,hingeZ,paperZ}=geometry;
    const split=state.apart,shift=carriageTravel*(1-state.travel),drop=(176+frameLift-hingeZ)*state.press;
    const railExtension=carriageTravel-58;
    const lift=(dz)=>p=>[p[0],p[1],p[2]+dz];
    const carriage=p=>[p[0],p[1]+shift,p[2]+split*20];
    const platen=p=>[p[0],p[1],p[2]+frameLift-drop+split*54];
    const head=lift(frameLift+split*42);
    const box=(name,x,y,z,w,d,h,options={})=>s.box(name,x,y,z,w,d,h,options);
    const groove=(f,x,y,z,w,d)=>s.line(f,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],{closed:true,color:'#c9c9cd',width:.48});
    const peg=(f,x,y,z,r=2.1)=>{s.line(f,circleY(x,y,z,r),{closed:true,color:'#9c9ca3',width:.6});s.line(f,[[x-r*.45,y,z-r*.4],[x+r*.45,y,z+r*.4]],{color:'#b0b0b6',width:.4});};
    // 01. Two broad sleepers and crossmembers. Every vertical cheek lands on a
    // foot block; rail trestles touch the ground rather than floating above it.
    for(const x of [-124,76]){
      const foot=box('sleeper'+x,x,-57,0,48,215,15,{bevel:1});
      groove(foot.top,x+3,-54,15,42,209);
      s.line(foot.front,[[x,158,6],[x+48,158,6]],{color:'#c8c8cd'});
      const pedestal=box('cheek-foot'+x,x+7,-25,15,34,48,12,{bevel:.7});
      groove(pedestal.top,x+10,-22,27,28,42);
    }
    box('cross-sleeper-back',-76,-38,0,152,22,15,{bevel:.7});
    box('cross-sleeper-front',-76,116,0,152,22,15,{bevel:.7});
    for(const x of [-110,86]){
      const cheek=box('cheek'+x,x,-18,27,24,38,251+frameLift,{bevel:.7});
      for(const z of [45,102,263+frameLift])peg(cheek.front,x+12,20,z);
      s.line(cheek.front,[[x+3,20,27],[x+3,20,277.3+frameLift]],{color:'#d1d1d4',width:.4});
      // Lower shoulder on which the bed-support winter is seated.
      const cleat=box('winter-cleat'+x,x,20,96,24,7,13,{bevel:.4});
      peg(cleat.front,x+12,27,103,1.5);
    }
    const winter=box('winter',-86,-13,86,172,39,26,{bevel:.8});
    s.line(winter.front,[[-86,26,94],[86,26,94]],{color:'#c1c1c7'});
    // Head beam includes an actual bore. No plate or spindle is painted through
    // a solid beam, and the inner wall occludes the far side of the screw.
    const headBeam=s.boredBeam('head',-121,-22,278,242,95,30,0,26,11.5,{transform:head});
    for(const top of headBeam.tops){
      groove(top,-117,-18,308,234,87);
      for(const x of [-110,110])for(const y of [-11,62])s.line(top,ring(x,y,308,1.9,24),{closed:true,color:'#a5a5ad',width:.6});
    }
    s.boredBeam('nut',-21,5,266,42,42,12,0,26,10.4,{transform:head});
    for(const x of [-109,88]){
      const wedge=box('head-wedge'+x,x,20,272,21,14,6,{bevel:.25,transform:head});
      peg(wedge.front,x+10.5,34,275,1.2);
    }
    // 02. Continuous rails, front trestle, and two guide runners below the bed.
    // The whole folding envelope stays beyond the platen while the bed is out.
    const frontSupport=p=>[p[0],p[1]+railExtension,p[2]];
    for(const x of [-65,51]){
      const rail=box('rail'+x,x,-19,112,14,221+railExtension,10,{bevel:.6});
      s.line(rail.top,[[x+3,-18,122],[x+3,201+railExtension,122]],{color:'#b7b7bf'});
      const shoe=box('rail-shoe'+x,x-3,177,104,20,24,8,{bevel:.4,transform:frontSupport});
      groove(shoe.top,x,180,112,14,18);
      const leg=box('trestle-leg'+x,x+1,181,8,12,16,88,{bevel:.6,transform:frontSupport});
      peg(leg.front,x+7,197,86,1.4);
      box('trestle-foot'+x,x-4,176,0,22,27,8,{bevel:.7,transform:frontSupport});
    }
    const crossbar=box('trestle-crossbar',-72,176,96,144,26,8,{bevel:.5,transform:frontSupport});
    s.line(crossbar.front,[[-72,202,99],[72,202,99]],{color:'#c2c2c8'});
    for(const x of [-65,51])box('runner'+x,x,-43,122,14,155,4,{bevel:.3,material:'iron',transform:carriage});
    const bed=box('carriage-bed',-74,-50,126,148,162,10,{bevel:.9,transform:carriage});
    groove(bed.top,-70,-46,136,140,154);
    const stone=box('bed-stone',-68,-44,136,136,150,5,{bevel:.6,material:'iron',transform:carriage});
    // The stone rests directly on the bed, without decorative floating layers.
    s.line(stone.front,[[-68,106,138.5],[68,106,138.5]],{color:'#b5b5bd'});
    // 03. Chase, quoins, two columns of type and surrounding furniture.
    const form=p=>carriage([p[0],p[1],p[2]+split*27]);
    for(const [name,x,y,w,d] of [['left',-62,-38,5,138],['right',57,-38,5,138],['back',-57,-38,114,5],['front',-57,95,114,5]])
      box('chase-'+name,x,y,141,w,d,7,{bevel:.35,material:'iron',transform:form});
    for(const [name,x,y,w,d] of [['left',-56,-32,9,126],['right',47,-32,9,126],['back',-47,-32,94,8],['front',-47,86,94,8]])
      box('furniture-'+name,x,y,141,w,d,4,{bevel:.3,transform:form});
    for(const col of [-45,3]){
      const types=box('type-column'+col,col,-22,141,42,106,7.5,{bevel:0,material:'iron',transform:form});
      // The rhythm of individual sorts stays subordinate to the platen and frame.
      for(let row=0;row<32;row++){
        const y=-20+row*3.2;
        s.line(types.top,[[col,y,148.5],[col+42,y,148.5]],{color:'#a6a6ad',width:.42});
        for(let word=0;word<4;word++){
          const start=col+1+word*10.1,len=7.3-(row+word)%3*.6;
          s.line(types.top,[[start,y+1,148.5],[start+len,y+1,148.5]],{color:'#77777f',width:.75,free:true});
        }
      }
    }
    for(const y of [-11,64]){
      const q=box('quoin'+y,50,y,145,5,17,3,{bevel:.25,transform:form});
      s.line(q.top,[[51,y,148],[51,y+17,148]],{color:'#b2b2ba'});
    }
    // 04. Tympan and paper: a single hinge transform is used by the frame, sheet,
    // protective frisket and printed lines. Both sides are real closed geometry.
    const angle=.11+(Math.PI-.11)*state.fold;
    const fold=([x,y,z])=>{
      const dy=y-112,dz=z-hingeZ;
      return carriage([x,112+dy*Math.cos(angle)-dz*Math.sin(angle),hingeZ+dy*Math.sin(angle)+dz*Math.cos(angle)]);
    };
    for(const [name,x,y,w,d] of [['hinge',-62,112,124,4],['left',-62,116,4,144],['right',58,116,4,144],['end',-62,260,124,4]])
      box('tympan-'+name,x,y,hingeZ,w,d,4,{bevel:.35,transform:fold});
    // Mount the sheet on the upper face of the open frame. Once folded, its
    // underside meets the type while the wooden frame clears the chase.
    const sheet=box('sheet',-57,117,paperZ,114,142,.45,{bevel:0,material:'paper',transform:fold});
    for(const [name,x,y,w,d] of [['back',-57,131,114,2],['front',-57,253,114,2],['left',-57,133,2,120],['right',55,133,2,120]])
      box('frisket-'+name,x,y,paperZ+1,w,d,1.7,{bevel:.15,transform:fold});
    for(const x of [-62,54]){
      box('hinge-block'+x,x,104,136,8,8,hingeZ-137,{bevel:.3,transform:carriage});
      const hinge=box('hinge-strap'+x,x,106,hingeZ-1,8,10,1,{bevel:.15,material:'iron',transform:carriage});
      s.line(hinge.top,ring(x+4,110,hingeZ,1.4),{closed:true,color:'#97979e'});
    }
    if(state.printed){
      for(let col=0;col<2;col++)for(let row=0;row<32;row++)for(let word=0;word<4;word++){
        const x=-45+col*48+word*10.1,y=130+row*3.5;
        s.line(sheet.top,[[x,y,paperZ+.45],[x+7-(row+word)%3*.6,y,paperZ+.45]],{color:'#525259',width:.65,free:true});
      }
    }
    // 05. The platen, swivel seat and spindle are one pressure assembly. The
    // cylindrical spindle is continuous, with the helical texture attached to
    // each owner surface so its far half cannot jump in front of the nut.
    const plate=box('platen',-67,-45,176,134,150,12,{bevel:1.1,transform:platen});
    groove(plate.top,-63,-41,188,126,142);
    const saddle=box('saddle',-32,-8,188,64,68,7,{bevel:.8,transform:platen});
    groove(saddle.top,-29,-5,195,58,62);
    s.cylinder('swivel-seat',[0,26,195],[0,0,1],17,6,{material:'iron',transform:platen});
    s.cylinder('swivel-neck',[0,26,201],[0,0,1],9,3,{transform:platen});
    const rotation=state.press*1.35;
    s.cylinder('spindle',[0,26,204],[0,0,1],9.5,140+frameLift,{segments:40,thread:7.5,phase:rotation,transform:platen});
    // Lever with turned grips; its bearing fits around the screw rather than
    // covering the shaft with a flat square floating in front of the head.
    const rotate=([x,y,z])=>platen([x*Math.cos(rotation)-(y-26)*Math.sin(rotation),26+x*Math.sin(rotation)+(y-26)*Math.cos(rotation),z]);
    s.boredBeam('handle-hub',-15,11,229,30,30,14,0,26,9.6,{transform:rotate});
    for(const [x,len] of [[-22,7],[15,88]]){
      const handle=box('lever'+x,x,22,233,len,8,6,{bevel:.7,transform:rotate});
      s.line(handle.top,[[x,24,239],[x+len,24,239]],{color:'#cacacf',width:.4});
    }
    s.cylinder('handle-grip',[106,26,228],[0,0,1],5.3,16,{segments:24,transform:rotate});
    s.modelState=state;
    return s;
  }
  makePress.geometry=geometry;
  globalThis.makeGutenbergPress=makePress;
})();
