(() => {
 const $=id=>document.getElementById(id),host=$('telegraph-art'),manual=$('manual-key');
 const message=$('message'),unit=$('unit'),send=$('send'),stop=$('stop');
 const sound=new TelegraphSound(),soundToggle=$('sound-toggle');
 try{sound.setEnabled(localStorage.getItem('telegraph-sound')!=='off');}catch{}
 function soundLabel(){
  soundToggle.disabled=!sound.available;soundToggle.setAttribute('aria-pressed',String(sound.enabled&&sound.available));
  const label=!sound.available?'Звук недоступен':sound.enabled?'Звук включён':'Звук выключен';
  soundToggle.querySelector('span').textContent=label;soundToggle.setAttribute('aria-label',label);soundToggle.title=label;
 }
 soundLabel();
 soundToggle.addEventListener('click',()=>{
  sound.setEnabled(!sound.enabled);if(sound.enabled)sound.unlock();soundLabel();
  try{localStorage.setItem('telegraph-sound',sound.enabled?'on':'off');}catch{}
 });
 let closed=false,playing=false,manualSince=null,lastManualRelease=null,animation=0,letter=-1;
 let inputCode='',letterTimer=0,startsWord=false,manualHasText=false,pressUnit=160,activePointer=null,activeKey=null;
 function setClosed(on){
  if(closed!==on)sound.click(on);
  closed=on;host.dataset.closed=String(on);
  $('telegraph-up').hidden=on;$('telegraph-down').hidden=!on;
  manual.setAttribute('aria-pressed',String(on));
  $('circuit-state').textContent=on?'Ключ нажат · цепь замкнута':'Ключ отпущен · цепь разомкнута';
 }
 const marks=code=>code.replace(/\./g,'·').replace(/-/g,'−');
 function preview(){
  $('message-error').hidden=true;message.removeAttribute('aria-invalid');
  let plan;try{plan=MorseModel.encode(message.value);}catch(error){
   $('encoded-message').replaceChildren();return null;
  }
  $('encoded-message').replaceChildren(...plan.letters.map(item=>{
   const span=document.createElement('span');span.className='encoded-letter'+(item.wordStart?' word-start':'');
   const char=document.createElement('span'),code=document.createElement('span');char.textContent=item.char;code.textContent=marks(item.code);code.className='morse-marks';span.append(char,code);return span;
  }));return plan;
 }
 function trace(on,units){
  const span=document.createElement('span');span.className=on?'signal-mark':'signal-gap';span.style.width=`${Math.max(2,units*6)}px`;
  const strip=$('signal-trace');strip.append(span);while(strip.children.length>220)strip.firstElementChild.remove();strip.scrollLeft=strip.scrollWidth;
 }
 function lock(on){playing=on;manual.disabled=on;message.disabled=on;unit.disabled=on;send.disabled=on;stop.disabled=!on;}
 function clearEntry(resetGap=false){
  clearTimeout(letterTimer);letterTimer=0;inputCode='';startsWord=false;
  if(resetGap){lastManualRelease=null;manualHasText=false;}
 }
 function finishLetter(){
  if(manualSince!==null)return;
  const code=inputCode,wordStart=startsWord;clearEntry();if(!code)return;
  const char=MorseModel.decode(code);
  if(!char){$('transmission-state').textContent=`${marks(code)} — такой буквы или цифры нет. Попробуйте ещё раз.`;return;}
  const separator=wordStart&&message.value&&!/\s$/.test(message.value)?' ':'';
  const text=message.value+separator+char;
  if(text.length>message.maxLength){$('transmission-state').textContent='Лимит сообщения — 32 знака. Удалите часть текста, чтобы продолжить.';return;}
  try{MorseModel.encode(text);}catch(error){$('message-error').textContent=error.message;$('message-error').hidden=false;message.setAttribute('aria-invalid','true');return;}
  message.value=text;manualHasText=true;message.setSelectionRange(text.length,text.length);message.scrollLeft=message.scrollWidth;
  preview();$('transmission-state').textContent=`${marks(code)} → ${char} · добавлено в сообщение`;
 }
 function abortManual(){
  const hadEntry=manualSince!==null||inputCode.length>0;
  manualSince=null;activePointer=null;activeKey=null;clearEntry(true);setClosed(false);
  if(hadEntry)$('transmission-state').textContent='Ручной ввод прерван';
 }
 function cancel(status='Передача остановлена'){
  cancelAnimationFrame(animation);animation=0;manualSince=null;activePointer=null;activeKey=null;clearEntry(true);lock(false);setClosed(false);
  [...$('encoded-message').children].forEach(e=>e.removeAttribute('aria-current'));letter=-1;
  $('transmission-state').textContent=status;
 }
 function startManual(){
  if(playing||manualSince!==null)return;
  const now=performance.now(),period=Number(unit.value),gap=lastManualRelease===null?Infinity:now-lastManualRelease;
  // The timestamp check also handles timers delayed by a busy browser.
  if(gap>=period*3)finishLetter();
  clearTimeout(letterTimer);letterTimer=0;
  if(!inputCode)startsWord=!manualHasText||gap>=period*7;
  sound.unlock();soundLabel();
  if(lastManualRelease!==null)trace(false,Math.min(30,gap/period));
  pressUnit=period;manualSince=now;setClosed(true);$('transmission-state').textContent=inputCode?`Ручной ввод: ${marks(inputCode)}`:'Ручной ввод';
 }
 function endManual(){
  if(manualSince===null)return;
  const duration=performance.now()-manualSince;manualSince=null;lastManualRelease=performance.now();setClosed(false);trace(true,Math.min(30,duration/Number(unit.value)));
  // Halfway between a one-unit dot and a three-unit dash is the threshold.
  inputCode=(inputCode+(duration<pressUnit*2?'.':'-')).slice(0,6);
  const char=MorseModel.decode(inputCode);
  $('transmission-state').textContent=`Ручной ввод: ${marks(inputCode)}${char?' → '+char:''} · пауза завершит букву`;
  letterTimer=setTimeout(()=>{if(!playing&&manualSince===null)finishLetter();},pressUnit*3);
 }
 function bindPointer(element){
  element.addEventListener('pointerdown',event=>{if(event.button!==0||playing||manualSince!==null)return;event.preventDefault();activePointer=event.pointerId;element.setPointerCapture(event.pointerId);startManual();});
  element.addEventListener('pointerup',event=>{if(activePointer!==event.pointerId)return;activePointer=null;endManual();});
  element.addEventListener('pointercancel',event=>{if(activePointer===event.pointerId)abortManual();});
  element.addEventListener('lostpointercapture',event=>{if(activePointer===event.pointerId)abortManual();});
 }
 bindPointer(manual);bindPointer(host);
 // Assistive activation can emit a click without pointer or keyboard events.
 manual.addEventListener('click',event=>{if(event.detail===0&&!event.pointerType&&!playing&&manualSince===null){startManual();endManual();}});
 manual.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat&&!playing&&manualSince===null){activeKey=event.key;startManual();}}});
 window.addEventListener('keyup',event=>{if(activeKey===event.key){activeKey=null;endManual();}});
 window.addEventListener('blur',()=>{if(playing)cancel();else abortManual();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(playing)cancel();else abortManual();sound.stop();}});
 function play(){
  if(playing)return;
  endManual();finishLetter();activePointer=null;activeKey=null;clearEntry(true);let plan;
  try{plan=MorseModel.encode(message.value);}catch(error){$('message-error').textContent=error.message;$('message-error').hidden=false;message.setAttribute('aria-invalid','true');message.focus();return;}
  sound.unlock();soundLabel();
  message.value=plan.text;preview();$('signal-trace').replaceChildren();letter=-1;lastManualRelease=null;
  const period=Number(unit.value);lock(true);const began=performance.now();let current=-1;
  function tick(now){
   if(!playing)return;
   const elapsed=(now-began)/period;
   if(elapsed>=plan.units){cancel('Сообщение передано');return;}
   let index=plan.events.findIndex(event=>elapsed<event.start+event.units);if(index<0)index=plan.events.length-1;
   if(index!==current){
    for(let i=current+1;i<=index;i++)trace(plan.events[i].on,plan.events[i].units);
    current=index;const event=plan.events[index];setClosed(event.on);
    if(letter!==event.letter){letter=event.letter;[...$('encoded-message').children].forEach((e,i)=>{if(i===letter)e.setAttribute('aria-current','true');else e.removeAttribute('aria-current');});}
    $('transmission-state').textContent=event.on?`Передаём ${plan.letters[event.letter].char} · ${event.symbol==='.'?'точка':'тире'}`:`Пауза · ${event.units} ${event.units===1?'единица':event.units===3?'единицы':'единиц'}`;
   }
   animation=requestAnimationFrame(tick);
  }
  animation=requestAnimationFrame(tick);
 }
 $('message-form').addEventListener('submit',event=>{event.preventDefault();play();});stop.addEventListener('click',()=>cancel());
 message.addEventListener('input',()=>{abortManual();preview();$('transmission-state').textContent='Готов к передаче';});
 unit.addEventListener('change',()=>{finishLetter();$('timing-readout').textContent=`Тире — ${Number(unit.value)*3} мс`;});
 $('try-hi').addEventListener('click',()=>{if(playing)cancel();else abortManual();message.value='HI';preview();message.focus({preventScroll:true});});
 for(const [char,code] of Object.entries(MorseModel.alphabet).sort((a,b)=>{const an=/\d/.test(a[0]),bn=/\d/.test(b[0]);return an!==bn?an?1:-1:a[0].localeCompare(b[0]);})){
  const cell=document.createElement('div'),title=document.createElement('span'),value=document.createElement('code');title.textContent=char;value.textContent=marks(code);cell.append(title,value);$('alphabet').append(cell);
 }
 setClosed(false);host.removeAttribute('aria-busy');preview();
 globalThis.telegraphQA={state:()=>({closed,playing}),encode:MorseModel.encode};
})();
