// Two damped mechanical clicks: the armature lands, then returns to its stop.
// The audio context is created only from a deliberate user interaction.
(() => {
 class TelegraphSound {
  constructor(){
   this.available=!!(globalThis.AudioContext||globalThis.webkitAudioContext);
   this.enabled=true;this.context=null;this.voices=new Set();this.pending=0;
  }
  setEnabled(on){this.enabled=on;if(!on)this.stop();}
  unlock(){
   if(!this.enabled||!this.available)return;
   try{
    if(!this.context){
     const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
     this.context=new Context({latencyHint:'interactive'});
     this.buffers=[this.makeClick(false),this.makeClick(true)];
     this.output=this.context.createGain();this.output.gain.value=.22;
     this.output.connect(this.context.destination);
    }
    if(this.context.state!=='running')this.ready=this.context.resume().catch(()=>{});
   }catch{this.available=false;}
  }
  makeClick(pressed){
   const rate=this.context.sampleRate,duration=pressed?.065:.05;
   const buffer=this.context.createBuffer(1,Math.ceil(rate*duration),rate),samples=buffer.getChannelData(0);
   let seed=pressed?3107:907,low=0,peak=0;
   for(let i=0;i<samples.length;i++){
    const t=i/rate;seed=(1664525*seed+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=.32*(noise-low);
    const attack=1-Math.exp(-t/.00035),frequency=pressed?940:1380;
    const transient=(noise-low)*Math.exp(-t/.0045)*.65;
    const metal=(Math.sin(2*Math.PI*frequency*t)+.35*Math.sin(2*Math.PI*frequency*2.27*t))*Math.exp(-t/.009)*.24;
    const body=Math.sin(2*Math.PI*(pressed?185:275)*t)*Math.exp(-t/.008)*.22;
    samples[i]=(transient+metal+body)*attack*Math.min(1,(duration-t)/.004);
    peak=Math.max(peak,Math.abs(samples[i]));
   }
   for(let i=0;i<samples.length;i++)samples[i]*=(pressed?.7:.55)/peak;
   return buffer;
  }
  click(pressed){
   if(!this.enabled||!this.available||!this.context||document.hidden)return;
   const pending=++this.pending;
   const play=()=>{
    if(pending!==this.pending||!this.enabled||document.hidden||this.context.state!=='running')return;
    const voice=this.context.createBufferSource();voice.buffer=this.buffers[Number(pressed)];
    voice.connect(this.output);this.voices.add(voice);
    voice.onended=()=>{this.voices.delete(voice);voice.disconnect();};
    voice.start();
   };
   if(this.context.state==='running')play();else this.ready?.then(play);
  }
  stop(){
   this.pending++;
   for(const voice of this.voices){try{voice.stop();}catch{}}
   this.voices.clear();
  }
 }
 globalThis.TelegraphSound=TelegraphSound;
})();
