'use strict';
const rounds=[{name:'هەلبژارتن',description:'پرسیار و چار هەلبژارتن',seconds:30,points:2},{name:'ئەڤ وێنە چییە؟',description:'دیاردەیێ بناسە',seconds:30,points:2},{name:'هەڤرکییا لەزاتیێ',description:'١٠ پرسیار بۆ تیما ب لەزتر',seconds:30,points:2},{name:'مۆزایەدە',description:'پترین ژمارە د ٣٠ چرکەیان دا',seconds:30,points:2}];
const defaults=window.GEOGRAPHY_BANK.map(q=>({...q,round:q.round===2?3:q.round===3?2:q.round})).sort((a,b)=>a.round-b.round);
const BANK_VERSION=9;
const KEY='geography-competition-v1';
const DEFAULT_TEAM_NAMES=['هێزا جوگراڤی','دلێ جوگرافيێ'];
const DEFAULT_TEAM_MEMBERS=[["پیلان کمال فخرالدین","رێژين فرحان حامد","دیدار خیر الدین نجم الدین","سفیان حازم خدر","دلفين نقيب صبري","جنان الياس جمعه","لؤي صدقي محمدسعيد"],["رويدة جاسم عمران","نقار عمران محمد صديق","دلگه ش أحمد زبير","مينا محمدعلي حازم","نەوزاد شاهين طه","رنگين سكتان محمد","شرمين مصطفى شينو"]];
const DEFAULT_AUDIENCE_QUESTION='مەزنترین ئۆقیانووسێ جیهانێ کیژە؟';
const DEFAULT_AUDIENCE_ANSWER='ئۆقیانووسا ئارام (Pacific)';
function fresh(){return {speedIntro:null,audience:null,audienceQuestion:DEFAULT_AUDIENCE_QUESTION,audienceAnswer:DEFAULT_AUDIENCE_ANSWER,names:[...DEFAULT_TEAM_NAMES],members:structuredClone(DEFAULT_TEAM_MEMBERS),scores:[0,0],index:-1,resumeIndex:null,questions:structuredClone(defaults),awarded:{},revealed:{},sound:true,choices:{},speedCounts:{},buzzerAwards:{},unlocked:{},bankVersion:BANK_VERSION};}
let state;try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&!saved.bankVersion)saved.bankVersion=1;state=saved&&Array.isArray(saved.questions)&&saved.questions.length&&Array.isArray(saved.names)&&Array.isArray(saved.scores)?{...fresh(),...saved}:fresh();}catch{state=fresh();}
// Update old generic names, preserving names already customized in Settings.
let namesUpdated=false;
state.names=state.names.map((name,i)=>{if(!name||name===['الفريق الأول','الفريق الثاني'][i]||(i===1&&name==='لێدانا جوگرافیایێ')){namesUpdated=true;return DEFAULT_TEAM_NAMES[i];}return name;});
if(namesUpdated)save();
// Preserve editable rosters in older locally saved games, without resetting scores.
if(!Array.isArray(state.members)||state.members.length!==2||state.members.some(m=>!Array.isArray(m)))state.members=structuredClone(DEFAULT_TEAM_MEMBERS);
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
// Move the two last rounds together with their question types, preserving saved results.
if(state.bankVersion<8){
 const oldQuestions=state.questions;
 const activeId=oldQuestions[state.index]?.id;
 const resumeId=state.resumeIndex===null?null:oldQuestions[state.resumeIndex]?.id;
 const activeFinished=state.index>=oldQuestions.length;
 const resumeFinished=state.resumeIndex===oldQuestions.length;
 state.questions=oldQuestions.map(q=>({...q,round:q.round===2?3:q.round===3?2:q.round}))
   .sort((a,b)=>a.round-b.round);
 state.index=state.index<0?-1:activeFinished?state.questions.length:state.questions.findIndex(q=>q.id===activeId);
 state.resumeIndex=state.resumeIndex===null?null:resumeFinished?state.questions.length:state.questions.findIndex(q=>q.id===resumeId);
 if(state.index<0&&activeId)state.index=0;
 if(state.resumeIndex<0&&resumeId)state.resumeIndex=0;
 state.bankVersion=8;
 save();
}
// Install the revised source document for every browser with an older saved bank.
// Start a clean session so answers/points from the previous wording are never mixed in.
if(state.bankVersion<9){
 state.questions=structuredClone(defaults);
 state.index=-1;
 state.resumeIndex=null;
 state.scores=[0,0];
 state.awarded={};
 state.revealed={};
 state.choices={};
 state.speedCounts={};
 state.buzzerAwards={};
 state.bankVersion=9;
 save();
}
if(!state.unlocked||typeof state.unlocked!=='object'||Array.isArray(state.unlocked))state.unlocked={};
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
// A persistent audience stop between rounds two and three, in both navigation directions.
function go(index,skipAudience=false,skipSpeedIntro=false){
 stop();
 const target=Math.max(-1,Math.min(index,state.questions.length));
 const current=state.questions[state.index],next=state.questions[target];
 const audience=state.audience;
 const exitsSecondRound=current?.round===1&&target>state.index&&(!next||next.round>1);
 const returnsToSecondRound=current?.round>=2&&target<state.index&&next?.round===1;
 const resumesAudience=audience?.pending&&target===audience.targetIndex;
 // Backward navigation follows: first speed question -> speed intro -> audience.
 if(!skipSpeedIntro&&returnsToSecondRound){
  const firstThird=state.questions.findIndex(q=>q.round===2);
  if(firstThird>=0){openSpeedIntro(firstThird);return;}
 }
 if(!skipAudience&&(exitsSecondRound||returnsToSecondRound||resumesAudience)){
  const thirdRoundStart=state.questions.findIndex(q=>q.round>1);
  const destination=returnsToSecondRound?(thirdRoundStart<0?state.questions.length:thirdRoundStart):resumesAudience?audience.targetIndex:target;
  state.audience={questionVisible:false,answerVisible:false,awardedTeam:null,completed:false,...audience,active:true,pending:true,targetIndex:destination};
  state.resumeIndex=destination;
  state.revealed={};state.speedCounts={};save();render();return;
 }
 if(!skipSpeedIntro&&next?.round===2&&((state.speedIntro?.pending&&target===state.speedIntro.targetIndex)||current?.round!==2)){
  openSpeedIntro(target);return;
 }
 if(state.speedIntro)state.speedIntro.active=false;
 if(audience)audience.active=false;
 state.revealed={};state.speedCounts={};state.index=target;
 if(state.index>=0)state.resumeIndex=state.index;
 save();render();
}
function openSpeedIntro(targetIndex){
 stop();
 if(state.audience){state.audience.active=false;state.audience.pending=false;}
 state.speedIntro={active:true,pending:true,targetIndex};
 state.resumeIndex=targetIndex;save();render();
}
function renderSpeedIntro(){
 const intro=state.speedIntro;
 $('#homeLogos').hidden=true;$('.scoreboard').hidden=false;
 $('#headerTurn').hidden=false;$('#headerTurn').classList.remove('b');
 $('#headerTeamName').textContent='قۆناغا سێیێ';
 document.body.classList.remove('question-view','presentation-fit');
 const clock=(x,y,r,fast)=>`<g transform="translate(${x} ${y})" class="speed-clock ${fast?'speed-clock-fast':''}"><circle r="${r}"/><circle r="${r-7}" class="speed-clock-inner"/><path d="M0-${r-10}v5M${r-10} 0h-5M0 ${r-10}v-5M-${r-10} 0h5"/><g class="speed-clock-hand"><path d="M0 9V-${r-15}"/></g><path d="M0 0 ${r*.35} ${-r*.2}"/><circle r="3" class="speed-clock-pin"/></g>`;
 $('#stage').innerHTML=`<style>
 .speed-intro{width:min(100%,1050px);position:relative;isolation:isolate;overflow:hidden;margin:auto;border-radius:24px;border:1px solid #c7b395;background:radial-gradient(ellipse at 50% 45%,#fffdf7 0%,#f7eddd 58%,#e8dbc7 100%);color:#64513f;text-align:center;padding:clamp(20px,3vw,38px);box-shadow:0 16px 42px #57452f20}
 .speed-intro::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.18;background:repeating-radial-gradient(ellipse at 85% 20%,transparent 0 38px,#87958f 39px 40px,transparent 41px 80px)}
 .speed-intro .speed-kicker{margin:0;color:#8b692e;font-size:clamp(18px,2.3vw,30px);font-weight:800;letter-spacing:1px}
 .speed-intro h1{font-size:clamp(32px,4.5vw,63px);line-height:1.45;margin:3px 0 5px;color:#986a28;text-shadow:0 2px #fff9ee}
 .speed-intro .speed-caption{margin:4px 0 12px;color:#537c87;font-size:clamp(15px,1.6vw,22px);line-height:1.7}
 .speed-intro .speed-art{display:block;width:min(100%,700px);height:auto;margin:auto;overflow:visible}
 .speed-intro .speed-clock{fill:#fff9ee;fill-opacity:.65;stroke:#8a9e9c;stroke-width:2}
 .speed-intro .speed-clock-inner{fill:none;stroke:#b9a685;stroke-width:1;stroke-dasharray:1 7}
 .speed-intro .speed-clock-hand{animation:speed-hand 18s linear infinite;transform-origin:0 0;stroke:#a1814b;stroke-width:2.5;stroke-linecap:round}
 .speed-intro .speed-clock-fast .speed-clock-hand{animation-duration:1.15s;stroke:#9e6f2a}
 .speed-intro .speed-clock-pin{fill:#a1814b;stroke:none}
 .speed-intro .speed-runner{animation:speed-runner .6s ease-in-out infinite;transform-origin:350px 180px}
 .speed-intro .speed-limb{animation:speed-stride .32s ease-in-out infinite alternate;transform-origin:350px 197px}
 .speed-intro .speed-limb.reverse{animation-delay:-.32s}
 .speed-intro .speed-arm{animation:speed-arm .32s ease-in-out infinite alternate;transform-origin:366px 144px}
 .speed-intro .speed-arm.reverse{animation-delay:-.32s}
 .speed-intro .speed-streak{animation:speed-streak .7s linear infinite;animation-delay:var(--delay,0s);transform-origin:center;stroke-linecap:round}
 .speed-intro .speed-ground{animation:speed-streak .4s linear infinite}
 .speed-intro .speed-bolt{animation:speed-bolt .45s ease-in-out infinite alternate;transform-origin:350px 160px}
 .speed-intro .speed-controls{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:18px;border-top:1px solid #c7b395}
 .speed-intro .speed-controls button{white-space:normal;line-height:1.6;padding:12px 20px}
 .speed-intro #speedIntroStart{background:#64513f;border-color:#64513f;color:#fffaf1;font-size:clamp(17px,1.8vw,23px);min-width:200px;box-shadow:0 4px 13px #64513f30}
 @keyframes speed-hand{to{transform:rotate(360deg)}}
 @keyframes speed-stride{from{transform:rotate(-17deg)}to{transform:rotate(18deg)}}
 @keyframes speed-arm{from{transform:rotate(-14deg)}to{transform:rotate(17deg)}}
 @keyframes speed-runner{50%{transform:translate(5px,-4px)}}
 @keyframes speed-streak{from{transform:translateX(65px);opacity:0}20%{opacity:.8}to{transform:translateX(-100px);opacity:0}}
 @keyframes speed-bolt{to{opacity:.5;transform:translateX(-5px)}}
 @media(max-width:600px){.speed-intro{padding:20px 12px}.speed-intro .speed-controls{gap:8px}.speed-intro #speedIntroStart{width:100%;order:-1}}
 @media(prefers-reduced-motion:reduce){.speed-intro *{animation:none!important}}
 </style><section class="speed-intro" aria-labelledby="speedIntroTitle">
 <p class="speed-kicker">قۆناغا سێیێ</p>
 <h1 id="speedIntroTitle">${esc(rounds[2].name)}</h1>
 <p class="speed-caption">ئامادە بن… ل ڤێرێ لەزاتی جیاوازیێ دروست دکەت!</p>
 <svg class="speed-art" viewBox="0 0 700 320" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="speedSuit" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#f36b4a"/><stop offset=".38" stop-color="#c9342b"/><stop offset="1" stop-color="#7f2729"/></linearGradient><radialGradient id="speedAura"><stop stop-color="#f2cd7b" stop-opacity=".48"/><stop offset="1" stop-color="#f2cd7b" stop-opacity="0"/></radialGradient></defs>
 <ellipse cx="355" cy="177" rx="225" ry="135" fill="url(#speedAura)"/>
 ${clock(130,91,51,false)}${clock(566,97,57,true)}${clock(530,245,34,false)}${clock(210,250,29,true)}
 <g fill="none" stroke="#b18b48" stroke-width="3" opacity=".7"><path class="speed-streak" d="M128 132H302"/><path class="speed-streak" style="--delay:-.24s" d="M78 161H280"/><path class="speed-streak" style="--delay:-.5s" d="M152 205H288"/><path class="speed-streak" style="--delay:-.1s" d="M228 101H335"/></g>
 <g class="speed-bolt" fill="none" stroke="#e8b74e" stroke-width="3" stroke-linejoin="round"><path d="m330 113-45 29 21 4-49 40 45-11-20 34 49-26"/><path d="m374 181-28 34 17-1-30 34"/></g>
 <ellipse cx="361" cy="283" rx="109" ry="10" fill="#75624b" opacity=".13"/>
 <g class="speed-runner" stroke-linejoin="round" stroke-linecap="round">
 <!-- Receding limbs and red motion suit. -->
 <path class="speed-limb reverse" d="m350 197-28 43-65-4" fill="none" stroke="#872b2a" stroke-width="19"/>
 <path class="speed-arm reverse" d="m366 144-43-18-28 22" fill="none" stroke="#912c2a" stroke-width="14"/>
 <path d="M372 132q-18 5-27 28l-12 36 29 13 20-45 9-19Z" fill="url(#speedSuit)" stroke="#8c2d2a" stroke-width="1.5"/>
 <path d="m337 188 32 13-6 10-31-12Z" fill="#e5bc63"/>
 <path class="speed-limb" d="m351 201 36 29-9 42 17 3" fill="none" stroke="url(#speedSuit)" stroke-width="20"/>
 <path class="speed-arm" d="m366 145 30 23 30-28" fill="none" stroke="url(#speedSuit)" stroke-width="15"/>
 <g transform="rotate(16 389 111)"><path d="M373 93q17-17 32 1l3 19-8 17-23-5-9-17Z" fill="url(#speedSuit)" stroke="#8c2d2a" stroke-width="1.2"/><path d="m393 103 15 4-2 10-12-1-8-7Z" fill="#f1cf9e"/><path d="m389 102 15 3" stroke="#ffe8a5" stroke-width="3"/><path d="m373 103-12 4 6 7" fill="#edc25e"/></g>
 <circle cx="365" cy="162" r="10" fill="#fff5d3"/><path d="m369 151-11 13 7-1-4 11 12-15-8 2Z" fill="#d7a12d"/>
 <path d="m374 135 6 4" stroke="#f7c985" stroke-width="3"/>
 </g>
 <g class="speed-ground" stroke="#a38d6e" stroke-width="2" opacity=".5"><path d="M260 291h52M350 291h68M440 291h28"/></g>
 </svg>
 <div class="speed-controls"><button id="speedIntroPrevious" type="button">یا بەرێ · پرسیارا جەماوەری</button><button id="speedIntroStart" type="button">دەستپێکرنا قۆناغا سێیێ ⚡</button><button id="speedIntroHome" type="button">لاپەڕا سەرەکی</button></div>
 </section>`;
 $('#speedIntroStart').onclick=()=>{if(!intro.active)return;intro.pending=false;intro.active=false;save();go(intro.targetIndex,true,true);};
 $('#speedIntroPrevious').onclick=()=>{
  if(!intro.active)return;intro.active=false;intro.pending=false;
  state.audience={questionVisible:false,answerVisible:false,awardedTeam:null,completed:false,...state.audience,active:true,pending:true,targetIndex:intro.targetIndex};
  state.resumeIndex=intro.targetIndex;save();render();
 };
 $('#speedIntroHome').onclick=()=>go(-1);
}
function renderAudience(){
 const audience=state.audience,host=$('#stage');
 $('#homeLogos').hidden=true;$('.scoreboard').hidden=false;
 $('#headerTurn').hidden=false;$('#headerTurn').classList.remove('b');
 $('#headerTeamName').textContent='پرسیارا جەماوەری';
 document.body.classList.remove('question-view','presentation-fit');
 const awarded=Number.isInteger(audience.awardedTeam);
 const crowd=Array.from({length:11},(_,i)=>{
  const x=58+i*48,y=i%2?136:153,scale=i%2?.82:1;
  return `<g transform="translate(${x} ${y}) scale(${scale})"><circle cy="-33" r="12"/><path d="M-23 24v-26q0-17 23-17T23-2v26Z"/><path d="M-17-8-30-29M17-8l30-30" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></g>`;
 }).join('');
 host.innerHTML=`<style>
 .audience-break{position:relative;isolation:isolate;width:min(100%,1000px);margin:auto;padding:clamp(18px,3vw,38px);border:1px solid #c7b395;border-radius:22px;text-align:center;background:radial-gradient(ellipse at 50% 0%,#fffdf8,#f0e3d1);color:#493c2e;box-shadow:0 16px 42px #57452f20;overflow:hidden}
 .audience-break::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.16;pointer-events:none;background:repeating-radial-gradient(ellipse at 15% 15%,transparent 0 38px,#8e9d99 39px 40px,transparent 41px 80px)}
 .audience-break .audience-kicker{color:#8b692e;font:700 11px Arial,sans-serif;letter-spacing:3px;direction:ltr;margin:0 0 9px}
 .audience-break h1{font-size:clamp(26px,3.4vw,43px);margin:0;color:#64513f;line-height:1.5}
 .audience-break .audience-intro{font-size:clamp(15px,1.5vw,21px);color:#537c87;line-height:1.8;margin:8px auto 12px}
 .audience-break .audience-scene{display:block;width:min(100%,570px);height:auto;margin:4px auto 12px;overflow:visible}
 .audience-break .audience-crowd{color:#536e75;fill:currentColor;animation:audience-cheer 3.5s ease-in-out infinite;transform-origin:300px 180px}
 .audience-break .audience-spark{animation:audience-spark 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
 .audience-break .audience-question{margin:16px auto 0;padding:clamp(16px,2.5vw,28px);border:1px solid #b6a48c;border-radius:16px;background:#fffaf2;max-width:850px;animation:audience-arrive .4s ease-out both}
 .audience-break .audience-question h2{margin:0;color:#005a9c;font-size:clamp(23px,3vw,36px);line-height:1.7;overflow-wrap:anywhere}
 .audience-break .audience-answer{padding:12px 18px;border:1px solid #a0b8ab;border-radius:10px;background:#e7eee4;color:#325c4d;line-height:1.8;font-size:clamp(17px,2vw,23px);white-space:pre-wrap}
 .audience-break .audience-award-hint{line-height:1.8;color:#64513f;margin:15px 0 10px}
 .audience-break .audience-team-buttons{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
 .audience-break .audience-team-buttons button{flex:1 1 210px;max-width:360px;white-space:normal;background:#64513f;color:#fffaf1;border-color:#64513f;padding:14px 18px;line-height:1.6;font-size:clamp(16px,1.8vw,22px)}
 .audience-break .audience-team-buttons button:last-child{background:#537c87;border-color:#537c87}
 .audience-break .audience-awarded{font-size:clamp(18px,2vw,25px);line-height:1.8;color:#325c4d;margin:16px 0 4px}
 .audience-break .audience-continue{margin-top:20px;padding-top:17px;border-top:1px solid #c7b395;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
 .audience-break button{white-space:normal;line-height:1.6}
 @keyframes audience-cheer{50%{transform:translateY(-4px)}}
 @keyframes audience-spark{50%{opacity:.3;transform:scale(.6)}}
 @keyframes audience-arrive{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
 @media(max-width:600px){.audience-break{padding:18px 12px}.audience-break .audience-scene{max-width:340px}.audience-break .audience-team-buttons{flex-direction:column;align-items:stretch}.audience-break .audience-team-buttons button{flex:auto;max-width:none;width:100%}}
 @media(prefers-reduced-motion:reduce){.audience-break *{animation:none!important}}
 </style><section class="audience-break" aria-labelledby="audienceTitle">
 <p class="audience-kicker">GEOGRAPHY AWARENESS WEEK · AUDIENCE</p>
 <h1 id="audienceTitle">نوکە دۆرا جەماوەرییە!</h1>
 <p class="audience-intro">بەرسڤا دروست بدە، پاشی تیمەکێ هەلبژێرە و دوو خاڵان پێ ببەخشە.</p>
 <svg class="audience-scene" viewBox="0 0 600 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="audienceLight" x2="0" y2="1"><stop stop-color="#d9bb79" stop-opacity=".05"/><stop offset="1" stop-color="#d9bb79" stop-opacity=".38"/></linearGradient></defs>
 <ellipse cx="300" cy="189" rx="267" ry="18" fill="#b99b6a" opacity=".19"/>
 <path d="M166 20 95 182H280ZM434 20 320 182H505Z" fill="url(#audienceLight)"/>
 <g class="audience-crowd">${crowd}</g>
 <g fill="#b18b48"><path class="audience-spark" d="m300 25 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1Z"/><circle class="audience-spark" cx="215" cy="57" r="4"/><circle class="audience-spark" cx="390" cy="52" r="3"/><path class="audience-spark" d="m118 61 6 6-6 6-6-6ZM477 42l5 5-5 5-5-5Z"/></g>
 <path d="M75 195H525" stroke="#ad8a51" stroke-width="2" stroke-linecap="round"/>
 </svg>
 ${audience.questionVisible?`<div class="audience-question"><h2>${esc(state.audienceQuestion||DEFAULT_AUDIENCE_QUESTION)}</h2>
 ${audience.answerVisible?`<p class="audience-answer">${esc(state.audienceAnswer||DEFAULT_AUDIENCE_ANSWER)}</p>
 ${awarded?`<p class="audience-awarded" role="status">✓ دوو خاڵ هاتنە بەخشین بۆ ${esc(state.names[audience.awardedTeam])}</p><button id="audienceUndo" type="button">ڤەگەڕاندنا دوو خاڵان</button>`:`<p class="audience-award-hint">ئەگەر بەرسڤ دروستە، ب هەلبژارتنا وەلاتیێ بەشدار دوو خاڵان بدە تیمەکێ:</p><div class="audience-team-buttons">${state.names.map((name,team)=>`<button type="button" data-audience-team="${team}">＋٢ · ${esc(name)}</button>`).join('')}</div>`}`:'<button id="audienceRevealAnswer" type="button">دیارکرنا بەرسڤێ</button>'}</div>`:'<button id="audienceShowQuestion" class="primary" type="button">دیارکرنا پرسیارا جەماوەری</button>'}
 <div class="audience-continue"><button id="audiencePrevious" type="button">یا بەرێ · قۆناغا دووێ</button><button id="audienceContinue" type="button">${awarded?'بەردەوامبوون بۆ قۆناغا سێیێ':'بەردەوامبوون بێ بەخشینا خاڵان'}</button><button id="audienceHome" type="button">لاپەڕا سەرەکی</button></div>
 </section>`;
 if(!audience.questionVisible)$('#audienceShowQuestion').onclick=()=>{audience.questionVisible=true;save();render();};
 if(audience.questionVisible&&!audience.answerVisible)$('#audienceRevealAnswer').onclick=()=>{audience.answerVisible=true;save();render();};
 host.querySelectorAll('[data-audience-team]').forEach(button=>button.onclick=()=>{
  if(Number.isInteger(audience.awardedTeam)||!audience.answerVisible)return;
  const team=Number(button.dataset.audienceTeam);if(team!==0&&team!==1)return;
  audience.awardedTeam=team;score(team,2);render();
 });
 if(awarded)$('#audienceUndo').onclick=()=>{
  if(!Number.isInteger(audience.awardedTeam))return;
  const team=audience.awardedTeam;audience.awardedTeam=null;score(team,-2);render();
 };
 $('#audienceContinue').onclick=()=>{if(!audience.active)return;audience.completed=true;audience.pending=false;audience.active=false;save();if(state.questions[audience.targetIndex]?.round===2)openSpeedIntro(audience.targetIndex);else go(audience.targetIndex,true,true);};
 $('#audiencePrevious').onclick=()=>{
  const lastSecond=state.questions.reduce((last,q,index)=>q.round===1?index:last,-1);
  audience.pending=false;audience.active=false;save();go(lastSecond,true,true);
 };
 $('#audienceHome').onclick=()=>go(-1);
}
function render(){renderScores();if(state.speedIntro?.active){renderSpeedIntro();return;}if(state.audience?.active){renderAudience();return;}$('#homeLogos').hidden=state.index>=0;$('.scoreboard').hidden=state.index<0;const active=state.questions[state.index];$('#headerTurn').hidden=!active;$('#headerTurn').classList.toggle('b',active?.team===1);$('#headerTeamName').textContent=active?(active.round===2?'هەردوو تیم':state.names[active.team]):'';const host=$('#stage');document.body.classList.toggle('question-view',state.index>=0&&state.index<state.questions.length);if(state.index<0||state.index>=state.questions.length)document.body.classList.remove('presentation-fit');if(state.index<0){host.innerHTML=`<div class="hero"><p class="eyebrow">پێشبڕکیا زانینا جوگرافی</p><h1>حەفتییا هۆشیارییا جۆگرافی<span class="gaw-word" lang="en" dir="ltr">GAW</span></h1><p>ب پشکدارییا زانکۆیێن دهۆک و زاخۆ، بۆ پێشخستنا زانین و هۆشیارییا جوگرافی.</p><div class="actions"><button class="primary" id="beginNew">دەست پێ بکە</button><button class="primary" id="resumeCompetition" ${state.resumeIndex===null?'disabled':''}>زڤڕین بۆ پێشبڕکیێ</button></div></div><div class="rounds">${rounds.map((r,i)=>`<button class="roundtile" data-round="${i}"><small>قۆناغا ${['ئێکێ','دووێ','سێیێ','چارێ'][i]}</small><strong>${r.name}</strong><span>${r.description} · ${state.questions.filter(q=>q.round===i).length} پرسیار</span></button>`).join('')}</div>`;$('#beginNew').onclick=()=>{if(state.resumeIndex!==null&&!confirm('دەستپێکرنا پێشبڕکییەکا نوو دێ خاڵێن پێشبڕکییا نوکە و پێشڤەچوونا وێ بکەتە سفر. دێ بەردەوام بی؟'))return;stop();state={...fresh(),names:state.names,members:structuredClone(state.members),questions:state.questions,sound:state.sound,audienceQuestion:state.audienceQuestion,audienceAnswer:state.audienceAnswer};go(0);};$('#resumeCompetition').onclick=()=>{if(state.resumeIndex!==null)go(state.resumeIndex);};host.querySelectorAll('[data-round]').forEach(x=>x.onclick=()=>go(state.questions.findIndex(q=>q.round===+x.dataset.round)));return;}
if(state.index>=state.questions.length){
 const tie=state.scores[0]===state.scores[1];
 const winnerIndex=state.scores[0]>state.scores[1]?0:1;
 const winner=state.names[winnerIndex];
 const winnerMembers=(state.members[winnerIndex]||[]).filter(name=>typeof name==='string'&&name.trim());
 const trophy=`<style>
/* Copy this style and .gaw-award into your winner section. No dependencies. */
.gaw-award{--cyan:#60fff0;position:relative;display:block;width:min(100%,600px);aspect-ratio:6/7;margin-inline:auto;isolation:isolate;cursor:pointer;-webkit-tap-highlight-color:transparent;perspective:900px}
.gaw-award svg{width:100%;height:100%;overflow:visible;display:block}.gaw-award .float{animation:gaw-float 5s ease-in-out infinite;transform-origin:300px 300px}.gaw-award .world{animation:gaw-world 24s linear infinite;will-change:transform}.gaw-award .orbit{transform-origin:300px 163px;animation:gaw-orbit 12s linear infinite}.gaw-award .orbit.reverse{animation-direction:reverse;animation-duration:18s}.gaw-award .dust{animation:gaw-rise 4s ease-out infinite;animation-delay:var(--d);transform-box:fill-box;transform-origin:center}.gaw-award .beam{animation:gaw-glimmer 4s ease-in-out infinite;transform-origin:300px 540px}.gaw-award .halo{animation:gaw-glimmer 3s ease-in-out infinite}.gaw-award:hover .float{animation-duration:3s}.gaw-award[data-paused] *{animation-play-state:paused!important}.gaw-award:focus-visible{outline:2px solid #18bdb8;outline-offset:4px;border-radius:30px}
@keyframes gaw-float{50%{transform:translateY(-11px)}}@keyframes gaw-world{to{transform:translateX(-480px)}}@keyframes gaw-orbit{to{transform:rotate(360deg)}}@keyframes gaw-rise{0%{opacity:0;transform:translateY(0) scale(.3)}20%{opacity:.9}100%{opacity:0;transform:translateY(-190px) scale(1.1)}}@keyframes gaw-glimmer{50%{opacity:.45;transform:scaleX(.97)}}
@media(prefers-reduced-motion:reduce){.gaw-award *{animation:none!important}}

/* Fit the complete globe, cup and pedestal inside the existing result column. */
.cyber-result .cyber-cup-stage .gaw-award{width:100%;max-width:360px;flex:none;min-width:0;line-height:0}
.cyber-result .gaw-award svg{max-width:none;max-height:none}
@media(max-width:640px){.cyber-result .cyber-cup-stage{width:min(100%,300px);min-height:0}}
@media(max-height:760px) and (min-width:1101px){.cyber-result .cyber-cup-stage .gaw-award{max-width:260px}}
</style><div class="gaw-award" role="button" tabindex="0" aria-label="کاسا سەرکەفتنێ؛ بۆ راوەستاندنا جوڵەیێ کلیک بکە." aria-pressed="false">
<svg viewBox="0 0 600 700" role="img" aria-labelledby="gaw-title gaw-desc" xmlns="http://www.w3.org/2000/svg">
<title id="gaw-title">Geography Awareness Week winner</title><desc id="gaw-desc">A crystal Earth crowns a tall, twisting polished-gold sculpture on a black plinth above the glowing turquoise pedestal.</desc>
<defs>
<linearGradient id="gaw-sculpture" x1="0" y1="0" x2="1" y2=".08"><stop stop-color="#5b3309"/><stop offset=".12" stop-color="#b17b1b"/><stop offset=".27" stop-color="#fff5a0"/><stop offset=".34" stop-color="#fffdd6"/><stop offset=".40" stop-color="#a47317"/><stop offset=".48" stop-color="#f9d55a"/><stop offset=".57" stop-color="#6e4508"/><stop offset=".69" stop-color="#e5b131"/><stop offset=".79" stop-color="#fff5b1"/><stop offset=".86" stop-color="#c28a22"/><stop offset="1" stop-color="#66400c"/></linearGradient>
<linearGradient id="gaw-ribbon" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="#a26911"/><stop offset=".24" stop-color="#ffe780"/><stop offset=".4" stop-color="#fffdd9"/><stop offset=".5" stop-color="#b88018"/><stop offset=".7" stop-color="#60400a"/><stop offset=".83" stop-color="#e6b93a"/><stop offset="1" stop-color="#fff3a3"/></linearGradient>
<linearGradient id="gaw-obsidian" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#040609"/><stop offset=".4" stop-color="#17202a"/><stop offset=".49" stop-color="#39424a"/><stop offset=".53" stop-color="#10151c"/><stop offset="1" stop-color="#03060b"/></linearGradient>
<radialGradient id="gaw-crystal" cx=".3" cy=".2" r=".85"><stop stop-color="#f6f3d5" stop-opacity=".8"/><stop offset=".25" stop-color="#8dabb0" stop-opacity=".42"/><stop offset=".65" stop-color="#203d49" stop-opacity=".72"/><stop offset=".88" stop-color="#788d8e" stop-opacity=".8"/><stop offset="1" stop-color="#e9ddaa" stop-opacity=".85"/></radialGradient>
<pattern id="gaw-goldgrain" width="7" height="9" patternUnits="userSpaceOnUse"><path d="M1 1h.6M5 4h.5M2 7h.6" stroke="#493006" stroke-width=".8" opacity=".35"/><path d="M3 3h.7M6 8h.5" stroke="#fff4af" stroke-width=".65" opacity=".6"/></pattern>

<linearGradient id="gaw-gold"><stop stop-color="#8b4b0b"/><stop offset=".18" stop-color="#e3a62e"/><stop offset=".36" stop-color="#fff2a4"/><stop offset=".49" stop-color="#d89921"/><stop offset=".68" stop-color="#ffe78b"/><stop offset=".87" stop-color="#c17b15"/><stop offset="1" stop-color="#734009"/></linearGradient>
<linearGradient id="gaw-edge" x2="0" y2="1"><stop stop-color="#fff6c1"/><stop offset=".4" stop-color="#eab943"/><stop offset="1" stop-color="#926014"/></linearGradient>
<linearGradient id="gaw-navy" x2="0" y2="1"><stop stop-color="#34455d"/><stop offset=".4" stop-color="#14243c"/><stop offset="1" stop-color="#060e20"/></linearGradient>
<linearGradient id="gaw-beam" x2="0" y2="1"><stop stop-color="#59ffe5" stop-opacity="0"/><stop offset="1" stop-color="#59ffe5" stop-opacity=".28"/></linearGradient>
<radialGradient id="gaw-ocean" cx=".33" cy=".24" r=".8"><stop stop-color="#46d8ff"/><stop offset=".45" stop-color="#0783ce"/><stop offset="1" stop-color="#082859"/></radialGradient>
<radialGradient id="gaw-shade" cx=".31" cy=".23" r=".8"><stop stop-color="#dcffff" stop-opacity=".28"/><stop offset=".5" stop-color="#051936" stop-opacity="0"/><stop offset=".86" stop-color="#001932" stop-opacity=".6"/><stop offset="1" stop-color="#000d23" stop-opacity=".93"/></radialGradient>
<radialGradient id="gaw-glow"><stop stop-color="#4dffeb" stop-opacity=".35"/><stop offset="1" stop-color="#4dffeb" stop-opacity="0"/></radialGradient>
<filter id="gaw-neon" x="-70%" y="-150%" width="240%" height="400%"><feGaussianBlur stdDeviation="5"/></filter>
<clipPath id="gaw-globe"><circle cx="300" cy="164" r="101"/></clipPath>
<g id="gaw-map" fill="#e0dfc5" stroke="#f3eed3" stroke-width="1.3" stroke-linejoin="round">
<path d="M8 91 30 68 61 64 80 77 104 71 126 88 115 106 94 112 84 133 65 136 64 153 48 146 38 124 20 117Z M72 143 93 150 111 176 103 191 115 211 103 239 89 260 79 238 76 206 63 178Z M134 64 155 51 172 64 161 89 143 96Z"/>
<path d="M215 105 226 87 246 89 255 75 276 82 287 70 326 79 348 68 381 87 410 83 435 102 453 110 441 131 410 128 397 144 371 140 359 160 343 147 330 163 318 145 297 141 279 125 260 132 246 118 229 123Z M235 130 267 131 285 151 280 178 263 193 253 223 237 215 227 187 211 171 214 145Z M325 157 340 164 350 187 339 194 332 178Z M371 169 390 176 398 195 382 193Z M384 211 409 201 434 214 443 239 418 248 390 239Z M287 209 295 218 289 239 282 231Z M445 144 450 157 441 165Z"/>
</g>
</defs>
<!-- Ground glow and layered pedestal -->
<g class="gaw-pedestal-scale" transform="translate(300 548) scale(.72) translate(-300 -548)">
<ellipse cx="300" cy="605" rx="250" ry="72" fill="url(#gaw-glow)"/>
<path d="M100 572v28c0 68 400 68 400 0v-28" fill="url(#gaw-navy)" stroke="#3b536a"/>
<ellipse cx="300" cy="574" rx="200" ry="52" fill="#172a43" stroke="#42566e" stroke-width="2"/>
<path d="M123 548v26c0 62 354 62 354 0v-26" fill="url(#gaw-navy)"/>
<ellipse cx="300" cy="550" rx="177" ry="46" fill="#0c2038" stroke="#338889" stroke-width="2"/>
<ellipse class="halo" cx="300" cy="548" rx="166" ry="40" fill="none" stroke="#53ffec" stroke-width="12" filter="url(#gaw-neon)"/>
<ellipse cx="300" cy="548" rx="166" ry="40" fill="none" stroke="#a0fff4" stroke-width="3"/>
<ellipse cx="300" cy="549" rx="143" ry="32" fill="url(#gaw-glow)" stroke="#47d8ce" stroke-opacity=".5"/>
<g class="beam" fill="url(#gaw-beam)"><path d="m152 541 25-218 17 224Z M405 547l18-224 25 218Z M218 551l21-154 12 158Z M350 555l11-158 21 154Z"/></g>
<g fill="#9bfff2">
<circle class="dust" cx="140" cy="530" r="1.0" style="--d:-0.0s"/>
<circle class="dust" cx="223" cy="537" r="1.55" style="--d:-0.39s"/>
<circle class="dust" cx="306" cy="544" r="2.1" style="--d:-0.78s"/>
<circle class="dust" cx="389" cy="551" r="1.0" style="--d:-1.17s"/>
<circle class="dust" cx="152" cy="558" r="1.55" style="--d:-1.56s"/>
<circle class="dust" cx="235" cy="530" r="2.1" style="--d:-1.9500000000000002s"/>
<circle class="dust" cx="318" cy="537" r="1.0" style="--d:-2.34s"/>
<circle class="dust" cx="401" cy="544" r="1.55" style="--d:-2.73s"/>
<circle class="dust" cx="164" cy="551" r="2.1" style="--d:-3.12s"/>
<circle class="dust" cx="247" cy="558" r="1.0" style="--d:-3.5100000000000002s"/>
<circle class="dust" cx="330" cy="530" r="1.55" style="--d:-3.9000000000000004s"/>
<circle class="dust" cx="413" cy="537" r="2.1" style="--d:-4.29s"/>
<circle class="dust" cx="176" cy="544" r="1.0" style="--d:-4.68s"/>
<circle class="dust" cx="259" cy="551" r="1.55" style="--d:-5.07s"/>
<circle class="dust" cx="342" cy="558" r="2.1" style="--d:-5.46s"/>
<circle class="dust" cx="425" cy="530" r="1.0" style="--d:-5.8500000000000005s"/>
<circle class="dust" cx="188" cy="537" r="1.55" style="--d:-6.24s"/>
<circle class="dust" cx="271" cy="544" r="2.1" style="--d:-6.63s"/>
<circle class="dust" cx="354" cy="551" r="1.0" style="--d:-7.0200000000000005s"/>
<circle class="dust" cx="437" cy="558" r="1.55" style="--d:-7.41s"/>
<circle class="dust" cx="200" cy="530" r="2.1" style="--d:-7.800000000000001s"/>
<circle class="dust" cx="283" cy="537" r="1.0" style="--d:-8.19s"/>
<circle class="dust" cx="366" cy="544" r="1.55" style="--d:-8.58s"/>
<circle class="dust" cx="449" cy="551" r="2.1" style="--d:-8.97s"/>
</g>
</g>
<g class="gaw-trophy-scale" transform="translate(300 495) scale(1.2) translate(-300 -495)">
<g class="float">
<!-- Reference-inspired polished gold helix and faceted black stone plinth. -->
<ellipse cx="300" cy="524" rx="83" ry="11" fill="#00101e" opacity=".28"/>
<!-- The two sculpted ribbons embrace the crystal globe and twist into a narrow waist. -->
<path d="M246 196C249 226 277 258 288 288C303 331 281 372 270 418L255 484H341L337 421C334 374 315 339 312 307C308 269 333 230 355 201C331 208 322 211 301 212C280 212 260 207 246 196Z" fill="url(#gaw-sculpture)" stroke="#b18a37" stroke-width="1.3"/>
<!-- Deep cutout between the curling arms. -->
<path d="M258 212C270 232 281 241 292 251L307 220C291 225 274 221 258 212Z" fill="#2a250f"/>
<path d="M265 217C276 230 282 234 287 235L299 222C284 225 274 221 265 217Z" fill="#111c1f"/>
<path d="M334 214C311 247 300 275 304 308C308 346 329 381 329 422L331 483H315C324 434 311 385 299 354C279 300 296 251 316 219Z" fill="url(#gaw-ribbon)"/>
<!-- Broad textured outer sweep and mirrored specular ridges. -->
<path d="M252 206C260 238 286 265 292 295C302 344 274 398 260 484H284C280 427 311 374 303 330C299 289 274 242 252 206Z" fill="url(#gaw-ribbon)"/>
<path d="M292 350C277 393 264 438 259 483H281C280 435 296 395 301 369Z" fill="url(#gaw-goldgrain)"/>
<path d="M249 201C258 230 283 253 295 285C310 329 290 370 280 407" fill="none" stroke="#fffbc8" stroke-width="3.4" opacity=".9"/>
<path d="M350 204C325 233 306 268 310 305C313 338 331 379 332 421L336 482" fill="none" stroke="#ffe581" stroke-width="2.2"/>
<path d="M302 359C316 404 312 452 309 483" fill="none" stroke="#fffbd2" stroke-width="5"/>
<path d="M300 376C302 419 292 454 291 483" fill="none" stroke="#74500d" stroke-width="2"/>
<path d="M318 362C328 394 329 425 327 447" fill="none" stroke="#48330e" stroke-width="3" opacity=".7"/>
<path d="M247 197Q293 219 353 201Q321 229 291 218Q262 211 247 197Z" fill="url(#gaw-edge)" stroke="#f4db88" stroke-width="1"/>
<path d="M253 203Q296 222 342 206" fill="none" stroke="#fff7bc" stroke-width="2.5"/>
<!-- Blank polished black base, with sharply bevelled planes like the reference. -->
<path d="M252 483H344L353 519H241Z" fill="url(#gaw-obsidian)" stroke="#30373c" stroke-width="1"/>
<path d="M241 519H353L349 539H245Z" fill="#05090e" stroke="#30363b" stroke-width=".8"/>
<path d="M252 483H344L337 491H259Z" fill="#354047" opacity=".7"/>
<path d="M244 516L338 499L350 516Z" fill="#aab9bc" opacity=".12"/>
<path d="M244 519H350" stroke="#78868d" stroke-width="1" opacity=".5"/>
<!-- Crystal globe finial; the existing revolving surface and orbital accents stay animated. -->
<g transform="translate(300 144) scale(.55) translate(-300 -164)">
<circle cx="300" cy="164" r="112" fill="url(#gaw-glow)"/>
<g class="orbit" fill="none" stroke="#70ffed" stroke-opacity=".4"><ellipse cx="300" cy="164" rx="137" ry="41" transform="rotate(-25 300 164)"/><circle cx="428" cy="126" r="4" fill="#b0fff2" stroke="none"/></g>
<circle cx="300" cy="164" r="102" fill="url(#gaw-crystal)" stroke="#dfd6ad" stroke-width="1.5"/>
<g clip-path="url(#gaw-globe)">
<g class="world"><use href="#gaw-map" x="60"/><use href="#gaw-map" x="540"/>
<g fill="none" stroke="#e4e7d7" stroke-opacity=".3" stroke-width="1"><path d="M60 113h960M60 164h960M60 215h960"/>
<path d="M100 60v210M160 60v210M220 60v210M280 60v210M340 60v210M400 60v210M460 60v210M520 60v210M580 60v210M640 60v210M700 60v210M760 60v210M820 60v210M880 60v210M940 60v210"/></g></g>
<circle cx="300" cy="164" r="101" fill="url(#gaw-shade)"/>
<ellipse cx="267" cy="105" rx="38" ry="12" transform="rotate(-30 267 105)" fill="#e1ffff" opacity=".16"/>
</g>
<g class="orbit reverse" fill="none"><ellipse cx="300" cy="164" rx="127" ry="51" transform="rotate(27 300 164)" stroke="#ffdb7a" stroke-opacity=".6"/><circle cx="179" cy="139" r="3.5" fill="#ffdc7c"/><circle cx="399" cy="208" r="2" fill="#fff3c5"/><circle cx="284" cy="113" r="2" fill="#73ffee"/></g>
<path d="M221 160C214 116 248 80 288 75" fill="none" stroke="#fffce9" stroke-width="5" opacity=".66" stroke-linecap="round"/>
<path d="M374 183C364 221 339 247 310 252" fill="none" stroke="#fff3cc" stroke-width="2.5" opacity=".5"/>
</g>
</g>
</g>
</svg></div>`;
 const randomFireworkPosition=()=>({left:(9+Math.random()*82).toFixed(1)+'%',top:(17+Math.random()*65).toFixed(1)+'%'});
 const celebration=tie?'':`<div class="academic-fireworks" aria-hidden="true">${Array.from({length:10},(_,burst)=>{
  const position=randomFireworkPosition(),delay=(burst*.31+Math.random()*.95).toFixed(2);
  return `<div class="academic-firework" style="left:${position.left};top:${position.top}">${Array.from({length:12},(_,i)=>`<i style="--ray:${i};--delay:${delay}s"></i>`).join('')}</div>`;
 }).join('')}</div>`;
 const winnerList=!tie&&winnerMembers.length?`<section class="award-roster"><h2>ئەندامێن تیما سەرکەفتی</h2><ol>${winnerMembers.map((name,i)=>`<li><span class="award-member-number">${String(i+1).padStart(2,'0')}</span><span>${esc(name)}</span></li>`).join('')}</ol></section>`:'';
 host.innerHTML=`<section class="academic-result cyber-result" aria-live="polite">
 ${celebration}
 <div class="award-topline"></div>
 <div class="award-masthead">
  <div class="award-institution"><img src="assets/duhok-logo.png" alt="زانکۆیا دهۆک"><span>زانکۆیا دهۆک</span></div>
  <div class="award-event"><strong>حەفتییا هۆشیارییا جۆگرافی</strong><small>GEOGRAPHY AWARENESS WEEK · GAW</small></div>
  <div class="award-institution"><img src="assets/zakho-logo.png" alt="زانکۆیا زاخۆ"><span>زانکۆیا زاخۆ</span></div>
 </div>
 <div class="award-divider"></div>
 <div class="award-body ${tie?'award-is-tie':''}">
  <div class="cyber-info">
   <div class="cyber-versus">
    <div class="cyber-team ${!tie&&winnerIndex===0?'cyber-leading':''}"><span>${esc(state.names[0])}</span><strong>${state.scores[0]}</strong></div>
    <div class="cyber-vs">VS</div>
    <div class="cyber-team ${!tie&&winnerIndex===1?'cyber-leading':''}"><span>${esc(state.names[1])}</span><strong>${state.scores[1]}</strong></div>
   </div>
   <p class="award-section-code">FINAL RESULT <span> / </span> 2026</p>
   <p class="cyber-winner-label">${tie?'ئەنجاما دوماهیێ':'تیما سەرکەفتی'}</p>
   <h1 class="cyber-winner-title">${tie?'هەردوو تیم یەکسان بوون':esc(winner)}</h1>
   <p class="cyber-congrats">${tie?'ئەنجامێ هەردوو تیمان یەکسانە':'پیرۆز بیت · سەرکەفتنا زانستی'}</p>
   ${tie?'<div class="award-tiebreak"><button id="tie">پرسیارا چارەسەرکرنا یەکسانیێ</button><div id="tieBox"></div></div>':''}
  </div>
  ${tie?'':`<div class="cyber-cup-stage">${trophy}</div>`}
  ${winnerList}
 </div>
 <div class="controls award-controls"><button id="back">زڤڕین بۆ قۆناغا دوماهیێ</button><button id="lobby">لاپەڕا سەرەکی</button></div>
 </section>`;
 if(!tie){
  const award=host.querySelector('.gaw-award');
  const toggleAward=()=>{const paused=award.toggleAttribute('data-paused');award.setAttribute('aria-pressed',String(paused));};
  award.addEventListener('click',toggleAward);
  award.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAward();}});
  const fireworks=host.querySelector('.academic-fireworks');
  fireworks?.addEventListener('animationiteration',event=>{
   if(event.animationName!=='academic-spark-burst'||!event.target.matches('.academic-firework i:first-child'))return;
   const burst=event.target.parentElement,position=randomFireworkPosition();
   burst.style.left=position.left;
   burst.style.top=position.top;
  });
 }
 $('#back').onclick=()=>go(state.questions.length-1);$('#lobby').onclick=()=>go(-1);if(tie)$('#tie').onclick=()=>{$('#tieBox').innerHTML='<p>هەردوو تیم د ماوەیێ ٣٠ چرکەیان دا بەرسڤ بدەن: کیژ مەودا مەزنترە، ١ سم ل سەر نەخشەیەکێ ب پێوەری ١ : ٢٠٠٬٠٠٠ یان ٣ سم ب پێوەری ١ : ٥٠٬٠٠٠؟</p><button id="tieAnswer">دیارکرنا بەرسڤێ</button>';$('#tieAnswer').onclick=()=>{$('#tieBox').innerHTML='<p>یێ ئێکێ ٢ کیلۆمەترە و یێ دووێ ١٫٥ کیلۆمەترە؛ یێ ئێکێ مەزنترە.</p><p class="hint">دوو خاڵ ژ تەختەیا خاڵان بدە تیما سەرکەفتی، پاشی ئەنجامێ نوو بکە.</p><button id="refreshWinner">نووکرنا ئەنجامێ</button>';$('#refreshWinner').onclick=render;};};return;}
const q=state.questions[state.index],r=rounds[q.round],current=state.questions.filter(x=>x.round===q.round),n=current.indexOf(q)+1,revealed=!!state.revealed[q.id],awarded=!!state.awarded[q.id],speed=q.round===3,buzzer=q.round===2,buzzerAward=state.buzzerAwards[q.id],canAdvance=!!state.unlocked[q.id]||revealed||awarded||!!buzzerAward;
remaining=r.seconds;
const visual=q.round===1&&!!q.image;
const mcq=(q.round===0||visual)&&Array.isArray(q.options)&&q.options.length===4;
const picked=state.choices[q.id];
const timerHtml=`<div class="timer" id="timer" role="timer">${remaining}</div><span class="hint" id="timerStatus">دەمژمێر ئامادەیە</span>`;
const choiceHtml=mcq?`<fieldset class="choices" aria-label="هەلبژارتن">${q.options.map((option,i)=>`<label class="choice ${picked===i?'selected':''} ${revealed&&i===q.correctIndex?'correct':''} ${revealed&&picked===i&&i!==q.correctIndex?'incorrect':''}" data-choice-label="${i}"><input type="radio" name="choice" value="${i}" ${picked===i?'checked':''} ${revealed?'disabled':''}><b>${['A','B','C','D'][i]}</b><span>${esc(option)}</span></label>`).join('')}</fieldset>`:'';
const questionMain=`<h1>${esc(q.q)}</h1>${mcq?`<div class="mcq-layout">${choiceHtml}<div class="mcq-clock">${timerHtml}</div></div>`:''}`;
host.innerHTML=`<div class="arena ${mcq?'mcq-arena':''} ${visual?'visual-arena':''}">${visual?`<div class="visual-split"><div class="visual-question">${questionMain}</div><figure class="visual-image"><img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی"></figure></div>`:questionMain}${speed?`<div class="speed-count-panel"><output id="speedCount" class="speed-count" aria-label="ژمارا بەرسڤێن هاتینە گۆتن" aria-live="polite">${Number.isSafeInteger(state.speedCounts[q.id])&&state.speedCounts[q.id]>=0?state.speedCounts[q.id]:0}</output><p class="hint">ژمارا دیاردە یان خاڵێن هاتینە گۆتن</p></div>`:''}${q.image&&!visual?`<img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی">`:''}${mcq?'':timerHtml}${revealed&&!mcq?`<div class="answer">${esc(q.answer)}</div>`:''}<div class="clockline"><div id="bar" style="width:100%"></div></div></div><div class="controls"><button id="startTimer" class="primary">دەستپێکرنا دەمژمێری</button><button id="resetTimer">دووبارەکرنا دەمێ</button>${speed?`<button id="countAnswer" class="primary">زێدەکرنا بەرسڤەکێ ＋١</button><button id="awardSpeed" ${awarded?'disabled':''}>${awarded?'✓ خاڵ هاتنە هەژمارتن':'＋٢ خاڵ'}</button>${awarded?'<button id="undoSpeed">ڤەگەڕاندنا خاڵان</button>':''}`:`<button id="reveal">${revealed?'ڤەشارتنا بەرسڤێ':'دیارکرنا بەرسڤێ'}</button>${buzzer?`<button id="awardBuzzerA" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[0])}</button><button id="awardBuzzerB" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[1])}</button>${buzzerAward?`<button id="undoBuzzer">ڤەگەڕاندنا خاڵێن ${esc(state.names[buzzerAward.team])}</button>`:''}`:`<button id="award" ${awarded?'disabled':''}>${awarded?'✓ خاڵ هاتنە هەژمارتن':'بەرسڤا دروست ＋'+r.points}</button>${awarded?'<button id="undo">ڤەگەڕاندنا خاڵان</button>':''}`}`}<button id="prev" ${state.index===0?'disabled':''}>یا بەرێ</button><button id="next" ${canAdvance?'':'disabled'}>${state.index===state.questions.length-1?'راگەهاندنا ئەنجامێ':'یا پاشێ ←'}</button><button id="nextRound" ${canAdvance?'':'disabled'}>${q.round===rounds.length-1?'دوماهیکئینانا پێشبڕکیێ':'قۆناغا پاشێ'}</button></div>`;
fitQuestion();
if(speed){
 $('#countAnswer').onclick=()=>{const previous=state.speedCounts[q.id];const count=Number.isSafeInteger(previous)&&previous>=0?previous:0;if(count===Number.MAX_SAFE_INTEGER)return;state.speedCounts[q.id]=count+1;$('#speedCount').textContent=String(count+1);save();};
 $('#awardSpeed').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;state.unlocked[q.id]=true;score(q.team,r.points);redrawQuestion();};
 if($('#undoSpeed'))$('#undoSpeed').onclick=()=>{const points=state.awarded[q.id];if(!points)return;delete state.awarded[q.id];score(q.team,-points);redrawQuestion();};
}
if(mcq)host.querySelectorAll('input[name="choice"]').forEach(input=>input.onchange=()=>{state.choices[q.id]=Number(input.value);save();host.querySelectorAll('[data-choice-label]').forEach(label=>label.classList.toggle('selected',Number(label.dataset.choiceLabel)===Number(input.value)));});
$('#startTimer').onclick=startTimer;$('#resetTimer').onclick=()=>{stop();remaining=r.seconds;updateTimer();$('#timerStatus').textContent='دەمژمێر ئامادەیە';$('#startTimer').textContent='دەستپێکرنا دەمژمێری';$('#startTimer').disabled=false;};$('#nextRound').onclick=()=>{if(!state.unlocked[q.id]&&!state.revealed[q.id]&&!state.awarded[q.id]&&!state.buzzerAwards[q.id])return;const next=state.questions.findIndex(x=>x.round>q.round);go(next<0?state.questions.length:next);};$('#prev').onclick=()=>go(state.index-1);$('#next').onclick=()=>{if(!state.unlocked[q.id]&&!state.revealed[q.id]&&!state.awarded[q.id]&&!state.buzzerAwards[q.id])return;go(state.index+1);};
if(!speed){$('#reveal').onclick=()=>{stop();state.revealed[q.id]=!revealed;if(state.revealed[q.id])state.unlocked[q.id]=true;save();redrawQuestion();};if(buzzer){
 const awardBuzzer=team=>{if(state.buzzerAwards[q.id])return;state.buzzerAwards[q.id]={team,points:r.points};state.unlocked[q.id]=true;score(team,r.points);redrawQuestion();};
 $('#awardBuzzerA').onclick=()=>awardBuzzer(0);$('#awardBuzzerB').onclick=()=>awardBuzzer(1);
 if($('#undoBuzzer'))$('#undoBuzzer').onclick=()=>{const award=state.buzzerAwards[q.id];if(!award)return;delete state.buzzerAwards[q.id];score(award.team,-award.points);redrawQuestion();};
}else{$('#award').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;state.unlocked[q.id]=true;score(q.team,r.points);redrawQuestion();};if($('#undo'))$('#undo').onclick=()=>{const amount=state.awarded[q.id];delete state.awarded[q.id];score(q.team,-amount);redrawQuestion();};}}
}
function returnHome(){if($('#config').open)$('#config').close();go(-1);window.scrollTo({top:0,behavior:'smooth'});}
$('#home').onclick=e=>{e.preventDefault();returnHome();};$('#goHome').onclick=returnHome;$('#dialogHome').onclick=returnHome;document.querySelectorAll('[data-score]').forEach(btn=>btn.onclick=()=>score(...btn.dataset.score.split(',').map(Number)));$('#full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};$('#settings').onclick=()=>{stop();$('#teamA').value=state.names[0];$('#teamB').value=state.names[1];$('#membersA').value=(state.members[0]||[]).join('\n');$('#membersB').value=(state.members[1]||[]).join('\n');$('#audienceQuestion').value=state.audienceQuestion||DEFAULT_AUDIENCE_QUESTION;$('#audienceAnswer').value=state.audienceAnswer||DEFAULT_AUDIENCE_ANSWER;$('#editor').value=JSON.stringify(state.questions,null,2);$('#error').textContent='';$('#config').showModal();};$('#close').onclick=()=>$('#config').close();$('#form').onsubmit=e=>{e.preventDefault();try{let qs=JSON.parse($('#editor').value);if(!Array.isArray(qs)||qs.length<4||new Set(qs.map(q=>q.id)).size!==qs.length||qs.some(q=>!q.id||typeof q.q!=='string'||typeof q.answer!=='string'||![0,1,2,3].includes(q.round)||(q.round===2?q.team!==null:![0,1].includes(q.team))||(q.image&&!/^assets\/[a-z0-9_.-]+$/i.test(q.image))||(q.options&&(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options).size!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||q.options[q.correctIndex]!==q.answer)))||rounds.some((_,i)=>!qs.some(q=>q.round===i))||qs.filter(q=>q.round===2).length!==10)throw Error('پێکهاتە و ناسنامەیێن پرسیاران بپشکنە؛ پێدڤیە چار قۆناغ و دەه پرسیار د قۆناغا هەڤرکییا لەزاتیێ دا هەبن.');state.names=[$('#teamA').value.trim()||DEFAULT_TEAM_NAMES[0],$('#teamB').value.trim()||DEFAULT_TEAM_NAMES[1]];state.members=[$('#membersA').value,$('#membersB').value].map(value=>value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean).slice(0,30));state.audienceQuestion=$('#audienceQuestion').value.trim()||DEFAULT_AUDIENCE_QUESTION;state.audienceAnswer=$('#audienceAnswer').value.trim()||DEFAULT_AUDIENCE_ANSWER;state.questions=qs;state.index=Math.min(state.index,qs.length);state.choices={};save();$('#config').close();render();}catch(e){$('#error').textContent=e.message;}};$('#reset').onclick=()=>{if(confirm('دێ پێشبڕکییەکا نوو دەست پێ بکەی؟ خاڵ و پێشڤەچوون دێ بنە سفر، لێ پرسیار و ناڤ دێ پاراستی مینن.')){stop();state={...fresh(),names:state.names,members:structuredClone(state.members),questions:state.questions,sound:state.sound,audienceQuestion:state.audienceQuestion,audienceAnswer:state.audienceAnswer};save();$('#config').close();render();}};render();

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

