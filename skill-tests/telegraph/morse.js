// International Morse, ITU-R M.1677-1. Gaps are complete intervals, not additions.
(() => {
 const alphabet=Object.freeze({A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'});
 function encode(input){
  const text=String(input).toUpperCase().trim().replace(/\s+/g,' ');
  if(!text)throw Error('Введите сообщение.');
  if(text.length>32)throw Error('Сообщение должно быть не длиннее 32 знаков.');
  if(!/^[A-Z0-9 ]+$/.test(text))throw Error('Используйте латинские буквы A–Z, цифры и пробелы.');
  const events=[],letters=[];let units=0;
  const push=(on,length,letter,symbol='')=>{events.push({on,units:length,start:units,letter,symbol});units+=length;};
  for(let i=0;i<text.length;i++){
   if(text[i]===' ')continue;
   const code=alphabet[text[i]],letter=letters.length;
   letters.push({char:text[i],code,wordStart:i>0&&text[i-1]===' '});
   if(events.length)push(false,text[i-1]===' '?7:3,letter);
   [...code].forEach((symbol,j)=>{if(j)push(false,1,letter);push(true,symbol==='.'?1:3,letter,symbol);});
  }
  return {text,letters,events,units,code:text.split(' ').map(word=>[...word].map(c=>alphabet[c]).join(' ')).join(' / ')};
 }
 const byCode=new Map(Object.entries(alphabet).map(([char,code])=>[code,char]));
 const decode=code=>byCode.get(code)||null;
 globalThis.MorseModel={alphabet,encode,decode};
})();
