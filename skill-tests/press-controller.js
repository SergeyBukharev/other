// One state drives geometry, the impression and the accessible readout.
(() => {
  const host=document.getElementById('press-art');
  const root=document.querySelector('.press-figure');
  const printButton=document.getElementById('press-print');
  const apartButton=document.getElementById('press-apart');
  const readout=document.getElementById('press-readout');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const state={fold:0,travel:0,press:0,printed:false,apart:0};
  let running=false,lastScene=null;
  function draw(){
    const scene=makeGutenbergPress(state);
    host.innerHTML=scene.render({viewBox:makeGutenbergPress.geometry.viewBox});
    root.dataset.parts=scene.parts.size;
    root.dataset.pose=state.apart>.5?'apart':state.press>.7?'pressing':state.printed?'printed':'ready';
    root.dataset.surfaces=scene.stats.surfaces;
    lastScene=scene;
  }
  function animate(target,duration){
    if(Object.entries(target).every(([key,value])=>state[key]===value))return Promise.resolve();
    if(reduce.matches){Object.assign(state,target);draw();return Promise.resolve();}
    const from={...state};let start,last=-Infinity;
    return new Promise(resolve=>{
      const tick=now=>{
        start??=now;const t=Math.min(1,(now-start)/duration);
        if(now-last>=1000/24||t===1){
          const e=t*t*(3-2*t);Object.entries(target).forEach(([key,value])=>state[key]=from[key]+(value-from[key])*e);
          draw();last=now;
        }
        if(t<1)requestAnimationFrame(tick);else resolve();
      };requestAnimationFrame(tick);
    });
  }
  async function locked(action){
    if(running)return;running=true;printButton.disabled=true;apartButton.disabled=true;
    try{await action();}finally{running=false;printButton.disabled=false;apartButton.disabled=false;}
  }
  function apartLabel(){
    const apart=state.apart>.5;apartButton.setAttribute('aria-pressed',String(apart));
    apartButton.innerHTML=apart?'Собрать <span aria-hidden="true">↙</span>':'Рассмотреть узлы <span aria-hidden="true">↗</span>';
  }
  apartButton.addEventListener('click',()=>locked(async()=>{
    const apart=state.apart>.5?0:1;
    readout.textContent=apart?'Разнесённые узлы · учебный вид':'Собранный пресс';
    await animate({apart},800);apartLabel();
  }));
  printButton.addEventListener('click',()=>locked(async()=>{
    state.printed=false;
    if(state.apart){await animate({apart:0},500);apartLabel();}
    // The frame may rotate only outside the press. Retract before opening it,
    // and raise the platen before the bed moves in either direction.
    await animate({press:0},350);
    await animate({travel:0},500);
    readout.textContent='Лист закрывается над формой';await animate({fold:1},1150);
    readout.textContent='Каретка подводит форму';await animate({travel:1},800);
    readout.textContent='Винт опускает прижимную плиту';await animate({press:1},1100);
    state.printed=true;readout.textContent='Прижим выполнен · краска перенесена';await animate({press:0},900);
    readout.textContent='Каретка выходит из-под плиты';await animate({travel:0},900);
    readout.textContent='Готовый оттиск';await animate({fold:0},1150);
  }));
  globalThis.pressIllustrationQA={
    pose:async(patch)=>{Object.assign(state,patch);draw();return lastScene.audit({samples:5000});},
    audit:()=>lastScene.audit({samples:8000}),
    state:()=>({...state})
  };
  draw();
})();
