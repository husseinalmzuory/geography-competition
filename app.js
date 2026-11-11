'use strict';
const rounds=[{name:'ماذا تعرف؟',description:'سؤال وأربعة اختيارات',seconds:30,points:2},{name:'عين الجغرافي',description:'تعرّف على الظاهرة',seconds:30,points:2},{name:'تحدّي السرعة',description:'أكبر عدد في ٣٠ ثانية',seconds:30,points:2}];
const defaults=window.GEOGRAPHY_BANK;
const BANK_VERSION=4;
const KEY='geography-competition-v1';
const DEFAULT_TEAM_NAMES=['هێزا جوگراڤی','لێدانا جوگرافیایێ'];
function fresh(){return {names:[...DEFAULT_TEAM_NAMES],scores:[0,0],index:-1,questions:structuredClone(defaults),awarded:{},revealed:{},sound:true,choices:{},speedCounts:{},bankVersion:BANK_VERSION};}
let state;try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&!saved.bankVersion)saved.bankVersion=1;state=saved&&Array.isArray(saved.questions)&&saved.questions.length&&Array.isArray(saved.names)&&Array.isArray(saved.scores)?{...fresh(),...saved}:fresh();}catch{state=fresh();}
// Update old generic names, preserving names already customized in Settings.
let namesUpdated=false;
state.names=state.names.map((name,i)=>{if(!name||name===['الفريق الأول','الفريق الثاني'][i]){namesUpdated=true;return DEFAULT_TEAM_NAMES[i];}return name;});
if(namesUpdated)save();
// Keep accumulated scores and custom questions; remap progress by question ID once.
if(state.bankVersion<BANK_VERSION){
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
 delete state.orders;state.bankVersion=BANK_VERSION;save();
}
if(!state.speedCounts||typeof state.speedCounts!=='object'||Array.isArray(state.speedCounts))state.speedCounts={};
let remaining=0,interval=null,deadline=0,audio;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function beep(){if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();for(let i=0;i<3;i++){let o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=660;g.gain.value=.15;o.start(audio.currentTime+i*.22);o.stop(audio.currentTime+i*.22+.12);}}catch{}}
function score(team,n){state.scores[team]=Math.max(0,state.scores[team]+n);save();renderScores();}
function renderScores(){['A','B'].forEach((v,i)=>{$('#name'+v).textContent=state.names[i];$('#score'+v).textContent=state.scores[i];});}
function stop(){if(interval)clearInterval(interval);interval=null;}
function tick(){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));updateTimer();if(remaining===0){stop();beep();$('#timerStatus').textContent='انتهى الوقت';$('#startTimer').textContent='انتهى الوقت';$('#startTimer').disabled=true;}}
function updateTimer(){if(!$('#timer'))return;$('#timer').textContent=remaining;$('#timer').classList.toggle('urgent',remaining<=5);const ratio=Math.max(0,Math.min(1,remaining/rounds[state.questions[state.index].round].seconds));$('#bar').style.width=(ratio*100)+'%';$('#bar').classList.toggle('time-warning',remaining<=5);}
function startTimer(){if(interval){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));stop();$('#startTimer').textContent='استئناف المؤقت';$('#timerStatus').textContent='المؤقت متوقف';}else if(remaining>0){deadline=Date.now()+remaining*1000;interval=setInterval(tick,100);$('#startTimer').textContent='إيقاف مؤقت';$('#timerStatus').textContent='الوقت جارٍ';}}
function redrawQuestion(){const seconds=remaining;stop();render();remaining=seconds;updateTimer();if(remaining===0){$('#startTimer').disabled=true;$('#startTimer').textContent='انتهى الوقت';$('#timerStatus').textContent='انتهى الوقت';}else if(remaining<30){$('#startTimer').textContent='استئناف المؤقت';$('#timerStatus').textContent='المؤقت متوقف';}}
function go(index){stop();state.index=Math.max(-1,Math.min(index,state.questions.length));save();render();}
function render(){renderScores();const active=state.questions[state.index];$('#headerTurn').hidden=!active;$('#headerTurn').classList.toggle('b',active?.team===1);$('#headerTeamName').textContent=active?state.names[active.team]:'';const host=$('#stage');document.body.classList.toggle('question-view',state.index>=0&&state.index<state.questions.length);if(state.index<0||state.index>=state.questions.length)document.body.classList.remove('presentation-fit');if(state.index<0){host.innerHTML=`<div class="hero"><p class="eyebrow">تحدّي المعرفة الجغرافية</p><h1>أسبوع التوعية الجغرافية<span class="gaw-word" lang="en" dir="ltr">GAW</span></h1><p>من الخرائط والظواهر إلى سرعة البديهة. ثلاث جولات تجمع المعرفة والملاحظة وسرعة البديهة.</p><button class="primary" id="begin">${Object.keys(state.awarded).length?'العودة إلى الأسئلة':'لنبدأ المنافسة'} ←</button><p class="resume">تُحفظ الدرجات والتقدّم تلقائيًا على هذا المتصفح.</p></div><div class="rounds">${rounds.map((r,i)=>`<button class="roundtile" data-round="${i}"><small>الجولة ${['الأولى','الثانية','الثالثة'][i]}</small><strong>${r.name}</strong><span>${r.description} · ${state.questions.filter(q=>q.round===i).length} تحدّيًا</span></button>`).join('')}</div>`;$('#begin').onclick=()=>go(0);host.querySelectorAll('[data-round]').forEach(x=>x.onclick=()=>go(state.questions.findIndex(q=>q.round===+x.dataset.round)));return;}
if(state.index>=state.questions.length){let tie=state.scores[0]===state.scores[1],winner=state.names[state.scores[0]>state.scores[1]?0:1];host.innerHTML=`<div class="end"><p class="eyebrow">ختام المنافسة</p><div class="big">${tie?'◎':'✦'}</div><h1>${tie?'تعادل الفريقين':'مبارك '+esc(winner)}</h1><p>${state.scores[0]} : ${state.scores[1]}</p>${tie?'<button id="tie">تحدّي كسر التعادل</button><div id="tieBox"></div>':'<p class="hint">شكرًا لجميع المشاركين</p>'}<div class="controls"><button id="back">العودة للجولة الأخيرة</button><button id="lobby">الواجهة الرئيسية</button></div></div>`;$('#back').onclick=()=>go(state.questions.length-1);$('#lobby').onclick=()=>go(-1);if(tie)$('#tie').onclick=()=>{$('#tieBox').innerHTML='<p>يكتب الفريقان خلال ٣٠ ثانية: أيهما يمثل مسافة أكبر، ١ سم بمقياس ١ : ٢٠٠٬٠٠٠ أم ٣ سم بمقياس ١ : ٥٠٬٠٠٠؟</p><button id="tieAnswer">كشف الإجابة</button>';$('#tieAnswer').onclick=()=>{$('#tieBox').innerHTML='<p>الأول ٢ كم، والثاني ١٫٥ كم. الأول أكبر.</p><p class="hint">امنح الفريق الفائز درجتين من لوحة الدرجات، ثم حدّث النتيجة.</p><button id="refreshWinner">تحديث النتيجة</button>';$('#refreshWinner').onclick=render;};};return;}
const q=state.questions[state.index],r=rounds[q.round],current=state.questions.filter(x=>x.round===q.round),n=current.indexOf(q)+1,revealed=!!state.revealed[q.id],awarded=!!state.awarded[q.id],speed=q.round===2;
remaining=r.seconds;
const mcq=q.round===0&&Array.isArray(q.options)&&q.options.length===4;
const picked=state.choices[q.id];
const timerHtml=`<div class="timer" id="timer" role="timer">${remaining}</div><span class="hint" id="timerStatus">المؤقت جاهز</span>`;
const choiceHtml=mcq?`<fieldset class="choices"><legend>اختر إجابة واحدة</legend>${q.options.map((option,i)=>`<label class="choice ${picked===i?'selected':''} ${revealed&&i===q.correctIndex?'correct':''} ${revealed&&picked===i&&i!==q.correctIndex?'incorrect':''}" data-choice-label="${i}"><input type="radio" name="choice" value="${i}" ${picked===i?'checked':''} ${revealed?'disabled':''}><b>${['أ','ب','ج','د'][i]}</b><span>${esc(option)}</span>${revealed&&i===q.correctIndex?'<em>✓ الإجابة الصحيحة</em>':''}${revealed&&picked===i&&i!==q.correctIndex?'<em>✕ اختيار الفريق</em>':''}</label>`).join('')}</fieldset>`:'';
host.innerHTML=`<div class="arena ${mcq?'mcq-arena':''}"><h1>${esc(q.q)}</h1>${mcq?`<div class="mcq-layout">${choiceHtml}<div class="mcq-clock">${timerHtml}</div></div>`:''}${speed?`<div class="speed-count-panel"><output id="speedCount" class="speed-count" aria-label="عدد الإجابات المذكورة" aria-live="polite">${Number.isSafeInteger(state.speedCounts[q.id])&&state.speedCounts[q.id]>=0?state.speedCounts[q.id]:0}</output><p class="hint">عدد الظواهر أو النقاط المذكورة</p></div>`:''}${q.image?`<img src="${esc(q.image)}" alt="صورة التحدي الجغرافي">`:''}${mcq?'':timerHtml}${revealed?`<div class="answer">${esc(q.answer)}</div>`:''}<div class="clockline"><div id="bar" style="width:100%"></div></div></div><div class="controls"><button id="startTimer" class="primary">بدء المؤقت</button><button id="resetTimer">إعادة الوقت</button>${speed?'<button id="countAnswer" class="primary">إضافة ظاهرة أو نقطة ＋١</button>':`<button id="reveal">${revealed?'إخفاء الإجابة':'كشف الإجابة'}</button><button id="award" ${awarded?'disabled':''}>${awarded?'✓ احتُسبت الدرجات':'إجابة صحيحة ＋'+r.points}</button>${awarded?'<button id="undo">تراجع عن المنح</button>':''}`}<button id="prev" ${state.index===0?'disabled':''}>السابق</button><button id="next">${state.index===state.questions.length-1?'إعلان النتيجة':'التالي ←'}</button><button id="nextRound">${q.round===2?'إنهاء المسابقة':'الجولة التالية'}</button></div>`;
fitQuestion();
if(speed)$('#countAnswer').onclick=()=>{const previous=state.speedCounts[q.id];const count=Number.isSafeInteger(previous)&&previous>=0?previous:0;if(count===Number.MAX_SAFE_INTEGER)return;state.speedCounts[q.id]=count+1;$('#speedCount').textContent=String(count+1);save();};
if(mcq)host.querySelectorAll('input[name="choice"]').forEach(input=>input.onchange=()=>{state.choices[q.id]=Number(input.value);save();host.querySelectorAll('[data-choice-label]').forEach(label=>label.classList.toggle('selected',Number(label.dataset.choiceLabel)===Number(input.value)));});
$('#startTimer').onclick=startTimer;$('#resetTimer').onclick=()=>{stop();remaining=r.seconds;updateTimer();$('#timerStatus').textContent='المؤقت جاهز';$('#startTimer').textContent='بدء المؤقت';$('#startTimer').disabled=false;};$('#nextRound').onclick=()=>{const next=state.questions.findIndex(x=>x.round>q.round);go(next<0?state.questions.length:next);};$('#prev').onclick=()=>go(state.index-1);$('#next').onclick=()=>go(state.index+1);
if(!speed){$('#reveal').onclick=()=>{stop();state.revealed[q.id]=!revealed;save();redrawQuestion();};$('#award').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;score(q.team,r.points);redrawQuestion();};if($('#undo'))$('#undo').onclick=()=>{const amount=state.awarded[q.id];delete state.awarded[q.id];score(q.team,-amount);redrawQuestion();};}
}
function returnHome(){if($('#config').open)$('#config').close();go(-1);window.scrollTo({top:0,behavior:'smooth'});}
$('#home').onclick=e=>{e.preventDefault();returnHome();};$('#goHome').onclick=returnHome;$('#dialogHome').onclick=returnHome;document.querySelectorAll('[data-score]').forEach(btn=>btn.onclick=()=>score(...btn.dataset.score.split(',').map(Number)));$('#full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};$('#settings').onclick=()=>{stop();$('#teamA').value=state.names[0];$('#teamB').value=state.names[1];$('#editor').value=JSON.stringify(state.questions,null,2);$('#error').textContent='';$('#config').showModal();};$('#close').onclick=()=>$('#config').close();$('#form').onsubmit=e=>{e.preventDefault();try{let qs=JSON.parse($('#editor').value);if(!Array.isArray(qs)||qs.length<4||new Set(qs.map(q=>q.id)).size!==qs.length||qs.some(q=>!q.id||typeof q.q!=='string'||typeof q.answer!=='string'||![0,1,2].includes(q.round)||![0,1].includes(q.team)||(q.image&&!/^assets\/[a-z0-9_.-]+$/i.test(q.image))||(q.options&&(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options).size!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||q.options[q.correctIndex]!==q.answer)))||rounds.some((_,i)=>!qs.some(q=>q.round===i)))throw Error('تحقق من بنية الأسئلة ومعرّفاتها، ومن وجود الجولات الثلاث.');state.names=[$('#teamA').value.trim()||DEFAULT_TEAM_NAMES[0],$('#teamB').value.trim()||DEFAULT_TEAM_NAMES[1]];state.questions=qs;state.index=Math.min(state.index,qs.length);state.choices={};save();$('#config').close();render();}catch(e){$('#error').textContent=e.message;}};$('#reset').onclick=()=>{if(confirm('هل تريد بدء مسابقة جديدة؟ ستُصفّر الدرجات ويُحذف تقدّم المسابقة، مع الاحتفاظ بالأسئلة والأسماء.')){stop();state={...fresh(),names:state.names,questions:state.questions,sound:state.sound};save();$('#config').close();render();}};render();

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
