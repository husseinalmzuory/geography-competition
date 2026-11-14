'use strict';
const rounds=[{name:'تو چی دزانی؟',description:'پرسیار و چار هەلبژارتن',seconds:30,points:2},{name:'چاڤێ جوگرافیناسی',description:'دیاردەیێ بناسە',seconds:30,points:2},{name:'ئاریشا لەزاتیێ',description:'پترین ژمارە د ٣٠ چرکەیان دا',seconds:30,points:2},{name:'پرسیارا لەزاتیێ',description:'١٠ پرسیار بۆ تیما ب لەزتر',seconds:30,points:2}];
const defaults=window.GEOGRAPHY_BANK;
const BANK_VERSION=7;
const KEY='geography-competition-v1';
const DEFAULT_TEAM_NAMES=['هێزا جوگراڤی','لێدانا جوگرافیایێ'];
function fresh(){return {names:[...DEFAULT_TEAM_NAMES],scores:[0,0],index:-1,resumeIndex:null,questions:structuredClone(defaults),awarded:{},revealed:{},sound:true,choices:{},speedCounts:{},buzzerAwards:{},bankVersion:BANK_VERSION};}
let state;try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&!saved.bankVersion)saved.bankVersion=1;state=saved&&Array.isArray(saved.questions)&&saved.questions.length&&Array.isArray(saved.names)&&Array.isArray(saved.scores)?{...fresh(),...saved}:fresh();}catch{state=fresh();}
// Update old generic names, preserving names already customized in Settings.
let namesUpdated=false;
state.names=state.names.map((name,i)=>{if(!name||name===['الفريق الأول','الفريق الثاني'][i]){namesUpdated=true;return DEFAULT_TEAM_NAMES[i];}return name;});
if(namesUpdated)save();
// Keep accumulated scores and custom questions; remap progress by question ID once.
if(state.bankVersion<4){
 const previous=state.questions,active=previous[state.index],finished=state.index>=previous.length;
 const originalVersion=state.bankVersion;
 state.questions=previous.filter(q=>q.round!==2).map(q=>({...q,round:q.round===3?2:q.round}));
 if(originalVersion<3){state.questions=state.questions.map(q=>{const d=defaults.find(x=>x.id===q.id);return q.round===0&&!q.options&&d&&d.q===q.q&&d.answer===q.answer?{...q,options:d.options,correctIndex:d.correctIndex}:q;});}
 const ids=new Set(state.questions.map(q=>q.id));
 // Store the actual historical award so Undo never subtracts the new amount from an old award.
 state.awarded=Object.fromEntries(Object.entries(state.awarded).filter(([id])=>ids.has(id)).map(([id,value])=>[id,typeof value==='number'?value:(previous.find(q=>q.id===id)?.round===1?4:2)]));
 for(const key of ['revealed','choices'])state[key]=Object.fromEntries(Object.entries(state[key]||{}).filter(([id])=>ids.has(id)));
 state.index=state.index<0?-1:finished?state.questions.length:state.questions.findIndex(q=>q.id===active?.id);
 if(active?.round===2)state.index=state.questions.findIndex(q=>q.round===2);
 if(!state.questions.length){state.questions=structuredClone(defaults);state.index=-1;}
 delete state.orders;state.bankVersion=4;save();
}
// Append the shared speed-question round once, without resetting existing scores or questions.
if(state.bankVersion<5){
 const oldLength=state.questions.length;
 if(!state.questions.some(q=>q.round===3)){
  const ids=new Set(state.questions.map(q=>q.id));
  state.questions.push(...structuredClone(defaults.filter(q=>q.round===3&&!ids.has(q.id))));
  if(state.index===oldLength)state.index=state.questions.length;
  if(state.resumeIndex===oldLength)state.resumeIndex=state.questions.length;
 }
 state.bankVersion=5;save();
}
// Add choices to existing visual challenges without changing saved progress or scores.
if(state.bankVersion<6){
 state.questions=state.questions.map(q=>{
  if(q.round!==1||q.options)return q;
  const source=defaults.find(d=>d.id===q.id&&d.round===1&&d.answer===q.answer);
  return source?{...q,options:structuredClone(source.options),correctIndex:source.correctIndex}:q;
 });
 state.bankVersion=6;save();
}
// Install the new Kurdish competition bank for installations still using the old built-in questions.
if(state.bankVersion<7){
 const oldBuiltIn=state.questions.some(q=>q.id==='term0'&&q.q.startsWith('احترار غير اعتيادي'));
 if(oldBuiltIn){
  state.questions=structuredClone(defaults);
  state.index=-1;
  state.resumeIndex=null;
  state.scores=[0,0];
  state.awarded={};state.revealed={};state.choices={};state.speedCounts={};state.buzzerAwards={};
 }
 state.bankVersion=7;save();
}
if(!state.buzzerAwards||typeof state.buzzerAwards!=='object'||Array.isArray(state.buzzerAwards))state.buzzerAwards={};
if(!state.speedCounts||typeof state.speedCounts!=='object'||Array.isArray(state.speedCounts))state.speedCounts={};
if(!Number.isInteger(state.resumeIndex)||state.resumeIndex<0||state.resumeIndex>state.questions.length){
 state.resumeIndex=state.index>=0?Math.min(state.index,state.questions.length):
 (state.scores.some(n=>n>0)||Object.keys(state.awarded).length||Object.keys(state.speedCounts).length?0:null);
}
save();
window.addEventListener('pagehide',save);

let remaining=0,interval=null,deadline=0,audio;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function beep(){if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();for(let i=0;i<3;i++){let o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=660;g.gain.value=.15;o.start(audio.currentTime+i*.22);o.stop(audio.currentTime+i*.22+.12);}}catch{}}
function score(team,n){state.scores[team]=Math.max(0,state.scores[team]+n);save();renderScores();}
function renderScores(){['A','B'].forEach((v,i)=>{$('#name'+v).textContent=state.names[i];$('#score'+v).textContent=state.scores[i];});}
function stop(){if(interval)clearInterval(interval);interval=null;}
function tick(){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));updateTimer();if(remaining===0){stop();beep();$('#timerStatus').textContent='دەم تەمام بوو';$('#startTimer').textContent='دەم تەمام بوو';$('#startTimer').disabled=true;}}
function updateTimer(){if(!$('#timer'))return;$('#timer').textContent=remaining;$('#timer').classList.toggle('urgent',remaining<=5);const ratio=Math.max(0,Math.min(1,remaining/rounds[state.questions[state.index].round].seconds));$('#bar').style.width=(ratio*100)+'%';$('#bar').classList.toggle('time-warning',remaining<=5);}
function startTimer(){if(interval){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));stop();$('#startTimer').textContent='دووبارە دەستپێکرن';$('#timerStatus').textContent='دەمژمێر راوه‌ستیایە';}else if(remaining>0){deadline=Date.now()+remaining*1000;interval=setInterval(tick,100);$('#startTimer').textContent='راوەستاندنا دەمژمێری';$('#timerStatus').textContent='دەم دچیت';}}
function redrawQuestion(){const seconds=remaining;stop();render();remaining=seconds;updateTimer();if(remaining===0){$('#startTimer').disabled=true;$('#startTimer').textContent='دەم تەمام بوو';$('#timerStatus').textContent='دەم تەمام بوو';}else if(remaining<30){$('#startTimer').textContent='دووبارە دەستپێکرن';$('#timerStatus').textContent='دەمژمێر راوه‌ستیایە';}}
function go(index){stop();state.revealed={};state.speedCounts={};state.index=Math.max(-1,Math.min(index,state.questions.length));if(state.index>=0)state.resumeIndex=state.index;save();render();}
function render(){renderScores();$('#homeLogos').hidden=state.index>=0;$('.scoreboard').hidden=state.index<0;const active=state.questions[state.index];$('#headerTurn').hidden=!active;$('#headerTurn').classList.toggle('b',active?.team===1);$('#headerTeamName').textContent=active?(active.round===3?'هەردوو تیم':state.names[active.team]):'';const host=$('#stage');document.body.classList.toggle('question-view',state.index>=0&&state.index<state.questions.length);if(state.index<0||state.index>=state.questions.length)document.body.classList.remove('presentation-fit');if(state.index<0){host.innerHTML=`<div class="hero"><p class="eyebrow">پێشبڕکیا زانینا جوگرافی</p><h1>هەفتییا هشیارییا جوگرافی<span class="gaw-word" lang="en" dir="ltr">GAW</span></h1><p>ژ نەخشە و دیاردەیان هەتا لەزاتییا هزرێ؛ چار قۆناغ یێن زانین، تێبینی و لەزاتیێ پێکڤە دئینن.</p><div class="actions"><button class="primary" id="beginNew">دەستپێکرنا پێشبڕکییەکا نوو</button><button class="primary" id="resumeCompetition" ${state.resumeIndex===null?'disabled':''}>زڤڕین بۆ پێشبڕکیێ</button></div></div><div class="rounds">${rounds.map((r,i)=>`<button class="roundtile" data-round="${i}"><small>قۆناغا ${['ئێکێ','دووێ','سێیێ','چارێ'][i]}</small><strong>${r.name}</strong><span>${r.description} · ${state.questions.filter(q=>q.round===i).length} پرسیار</span></button>`).join('')}</div>`;$('#beginNew').onclick=()=>{if(state.resumeIndex!==null&&!confirm('دەستپێکرنا پێشبڕکییەکا نوو دێ خاڵێن پێشبڕکییا نوکە و پێشڤەچوونا وێ بکەتە سفر. دێ بەردەوام بی؟'))return;stop();state={...fresh(),names:state.names,questions:state.questions,sound:state.sound};go(0);};$('#resumeCompetition').onclick=()=>{if(state.resumeIndex!==null)go(state.resumeIndex);};host.querySelectorAll('[data-round]').forEach(x=>x.onclick=()=>go(state.questions.findIndex(q=>q.round===+x.dataset.round)));return;}
if(state.index>=state.questions.length){let tie=state.scores[0]===state.scores[1],winner=state.names[state.scores[0]>state.scores[1]?0:1];host.innerHTML=`<div class="end"><p class="eyebrow">دوماهییا پێشبڕکیێ</p><div class="big">${tie?'◎':'✦'}</div><h1>${tie?'هەردوو تیم یەکسان بوون':'پیرۆز بیت '+esc(winner)}</h1><p>${state.scores[0]} : ${state.scores[1]}</p>${tie?'<button id="tie">پرسیارا چارەسەرکرنا یەکسانیێ</button><div id="tieBox"></div>':'<p class="hint">سوپاس بۆ هەمی پشکدارێن پێشبڕکیێ</p>'}<div class="controls"><button id="back">زڤڕین بۆ قۆناغا دوماهیێ</button><button id="lobby">لاپەڕا سەرەکی</button></div></div>`;$('#back').onclick=()=>go(state.questions.length-1);$('#lobby').onclick=()=>go(-1);if(tie)$('#tie').onclick=()=>{$('#tieBox').innerHTML='<p>يكتب هەردوو تیم خلال ٣٠ ثانية: أيهما يمثل مسافة أكبر، ١ سم بمقياس ١ : ٢٠٠٬٠٠٠ أم ٣ سم بمقياس ١ : ٥٠٬٠٠٠؟</p><button id="tieAnswer">دیارکرنا بەرسڤێ</button>';$('#tieAnswer').onclick=()=>{$('#tieBox').innerHTML='<p>یێ ئێکێ ٢ کیلۆمەترە و یێ دووێ ١٫٥ کیلۆمەترە؛ یێ ئێکێ مەزنترە.</p><p class="hint">دوو خاڵ ژ تەختەیا خاڵان بدە تیما سەرکەفتی، پاشی ئەنجامێ نوو بکە.</p><button id="refreshWinner">نووکرنا ئەنجامێ</button>';$('#refreshWinner').onclick=render;};};return;}
const q=state.questions[state.index],r=rounds[q.round],current=state.questions.filter(x=>x.round===q.round),n=current.indexOf(q)+1,revealed=!!state.revealed[q.id],awarded=!!state.awarded[q.id],speed=q.round===2,buzzer=q.round===3,buzzerAward=state.buzzerAwards[q.id];
remaining=r.seconds;
const visual=q.round===1&&!!q.image;
const mcq=(q.round===0||visual)&&Array.isArray(q.options)&&q.options.length===4;
const picked=state.choices[q.id];
const timerHtml=`<div class="timer" id="timer" role="timer">${remaining}</div><span class="hint" id="timerStatus">دەمژمێر ئامادەیە</span>`;
const choiceHtml=mcq?`<fieldset class="choices" aria-label="هەلبژارتن">${q.options.map((option,i)=>`<label class="choice ${picked===i?'selected':''} ${revealed&&i===q.correctIndex?'correct':''} ${revealed&&picked===i&&i!==q.correctIndex?'incorrect':''}" data-choice-label="${i}"><input type="radio" name="choice" value="${i}" ${picked===i?'checked':''} ${revealed?'disabled':''}><b>${['ئـ','ب','ج','د'][i]}</b><span>${esc(option)}</span>${revealed&&i===q.correctIndex?'<em>✓ بەرسڤا دروست</em>':''}${revealed&&picked===i&&i!==q.correctIndex?'<em>✕ هەلبژارتنا تیمێ</em>':''}</label>`).join('')}</fieldset>`:'';
const questionMain=`<h1>${esc(q.q)}</h1>${mcq?`<div class="mcq-layout">${choiceHtml}<div class="mcq-clock">${timerHtml}</div></div>`:''}`;
host.innerHTML=`<div class="arena ${mcq?'mcq-arena':''} ${visual?'visual-arena':''}">${visual?`<div class="visual-split"><div class="visual-question">${questionMain}</div><figure class="visual-image"><img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی"></figure></div>`:questionMain}${speed?`<div class="speed-count-panel"><output id="speedCount" class="speed-count" aria-label="ژمارا بەرسڤێن هاتینە گۆتن" aria-live="polite">${Number.isSafeInteger(state.speedCounts[q.id])&&state.speedCounts[q.id]>=0?state.speedCounts[q.id]:0}</output><p class="hint">ژمارا دیاردە یان خاڵێن هاتینە گۆتن</p></div>`:''}${q.image&&!visual?`<img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی">`:''}${mcq?'':timerHtml}${revealed?`<div class="answer">${esc(q.answer)}</div>`:''}<div class="clockline"><div id="bar" style="width:100%"></div></div></div><div class="controls"><button id="startTimer" class="primary">دەستپێکرنا دەمژمێری</button><button id="resetTimer">دووبارەکرنا دەمێ</button>${speed?'<button id="countAnswer" class="primary">زێدەکرنا بەرسڤەکێ ＋١</button>':`<button id="reveal">${revealed?'ڤەشارتنا بەرسڤێ':'دیارکرنا بەرسڤێ'}</button>${buzzer?`<button id="awardBuzzerA" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[0])}</button><button id="awardBuzzerB" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[1])}</button>${buzzerAward?`<button id="undoBuzzer">ڤەگەڕاندنا خاڵێن ${esc(state.names[buzzerAward.team])}</button>`:''}`:`<button id="award" ${awarded?'disabled':''}>${awarded?'✓ خاڵ هاتنە هەژمارتن':'بەرسڤا دروست ＋'+r.points}</button>${awarded?'<button id="undo">ڤەگەڕاندنا خاڵان</button>':''}`}`}<button id="prev" ${state.index===0?'disabled':''}>یا بەرێ</button><button id="next">${state.index===state.questions.length-1?'راگەهاندنا ئەنجامێ':'یا پاشێ ←'}</button><button id="nextRound">${q.round===rounds.length-1?'دوماهیکئینانا پێشبڕکیێ':'قۆناغا التالية'}</button></div>`;
fitQuestion();
if(speed)$('#countAnswer').onclick=()=>{const previous=state.speedCounts[q.id];const count=Number.isSafeInteger(previous)&&previous>=0?previous:0;if(count===Number.MAX_SAFE_INTEGER)return;state.speedCounts[q.id]=count+1;$('#speedCount').textContent=String(count+1);save();};
if(mcq)host.querySelectorAll('input[name="choice"]').forEach(input=>input.onchange=()=>{state.choices[q.id]=Number(input.value);save();host.querySelectorAll('[data-choice-label]').forEach(label=>label.classList.toggle('selected',Number(label.dataset.choiceLabel)===Number(input.value)));});
$('#startTimer').onclick=startTimer;$('#resetTimer').onclick=()=>{stop();remaining=r.seconds;updateTimer();$('#timerStatus').textContent='دەمژمێر ئامادەیە';$('#startTimer').textContent='دەستپێکرنا دەمژمێری';$('#startTimer').disabled=false;};$('#nextRound').onclick=()=>{const next=state.questions.findIndex(x=>x.round>q.round);go(next<0?state.questions.length:next);};$('#prev').onclick=()=>go(state.index-1);$('#next').onclick=()=>go(state.index+1);
if(!speed){$('#reveal').onclick=()=>{stop();state.revealed[q.id]=!revealed;save();redrawQuestion();};if(buzzer){
 const awardBuzzer=team=>{if(state.buzzerAwards[q.id])return;state.buzzerAwards[q.id]={team,points:r.points};score(team,r.points);redrawQuestion();};
 $('#awardBuzzerA').onclick=()=>awardBuzzer(0);$('#awardBuzzerB').onclick=()=>awardBuzzer(1);
 if($('#undoBuzzer'))$('#undoBuzzer').onclick=()=>{const award=state.buzzerAwards[q.id];if(!award)return;delete state.buzzerAwards[q.id];score(award.team,-award.points);redrawQuestion();};
}else{$('#award').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;score(q.team,r.points);redrawQuestion();};if($('#undo'))$('#undo').onclick=()=>{const amount=state.awarded[q.id];delete state.awarded[q.id];score(q.team,-amount);redrawQuestion();};}}
}
function returnHome(){if($('#config').open)$('#config').close();go(-1);window.scrollTo({top:0,behavior:'smooth'});}
$('#home').onclick=e=>{e.preventDefault();returnHome();};$('#goHome').onclick=returnHome;$('#dialogHome').onclick=returnHome;document.querySelectorAll('[data-score]').forEach(btn=>btn.onclick=()=>score(...btn.dataset.score.split(',').map(Number)));$('#full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};$('#settings').onclick=()=>{stop();$('#teamA').value=state.names[0];$('#teamB').value=state.names[1];$('#editor').value=JSON.stringify(state.questions,null,2);$('#error').textContent='';$('#config').showModal();};$('#close').onclick=()=>$('#config').close();$('#form').onsubmit=e=>{e.preventDefault();try{let qs=JSON.parse($('#editor').value);if(!Array.isArray(qs)||qs.length<4||new Set(qs.map(q=>q.id)).size!==qs.length||qs.some(q=>!q.id||typeof q.q!=='string'||typeof q.answer!=='string'||![0,1,2,3].includes(q.round)||(q.round===3?q.team!==null:![0,1].includes(q.team))||(q.image&&!/^assets\/[a-z0-9_.-]+$/i.test(q.image))||(q.options&&(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options).size!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||q.options[q.correctIndex]!==q.answer)))||rounds.some((_,i)=>!qs.some(q=>q.round===i))||qs.filter(q=>q.round===3).length!==10)throw Error('تحقق من بنية الأسئلة ومعرّفاتها، ومن وجود الجولات الأربع وعشرة أسئلة في پرسیارا لەزاتیێ.');state.names=[$('#teamA').value.trim()||DEFAULT_TEAM_NAMES[0],$('#teamB').value.trim()||DEFAULT_TEAM_NAMES[1]];state.questions=qs;state.index=Math.min(state.index,qs.length);state.choices={};save();$('#config').close();render();}catch(e){$('#error').textContent=e.message;}};$('#reset').onclick=()=>{if(confirm('هل تريد دەستپێکرنا پێشبڕکییەکا نوو؟ ستُصفّر الدرجات ويُحذف تقدّم المسابقة، مع الاحتفاظ بالأسئلة والأسماء.')){stop();state={...fresh(),names:state.names,questions:state.questions,sound:state.sound};save();$('#config').close();render();}};render();

var fitFrame;
function fitQuestion(){
 cancelAnimationFrame(fitFrame);
 fitFrame=requestAnimationFrame(()=>{
  const enabled=document.body.classList.contains('question-view')&&innerWidth>=1000&&innerHeight>=600;
  document.body.classList.toggle('presentation-fit',enabled);
  document.documentElement.style.setProperty('--fit','1');
  if(!enabled)return;
  const controls=document.querySelector('#stage > .controls');
  const arena=document.querySelector('.arena');
  const fits=()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1&&controls.scrollWidth<=controls.clientWidth+1&&arena.scrollHeight<=arena.clientHeight+1;
  for(let size=1;size>=.64;size-=.04){document.documentElement.style.setProperty('--fit',size.toFixed(2));if(fits())return;}
  // Prefer legible content and accessible controls over clipping at exceptional sizes/zoom.
  document.body.classList.remove('presentation-fit');
 });
}
window.addEventListener('resize',fitQuestion);
document.addEventListener('fullscreenchange',fitQuestion);
document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)fitQuestion();},true);
document.fonts?.ready.then(fitQuestion);
