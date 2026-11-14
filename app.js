'use strict';
const rounds=[{name:'هەلبژارتن',description:'پرسیار و چار هەلبژارتن',seconds:30,points:2},{name:'ئەڤ وێنە چییە؟',description:'دیاردەیێ بناسە',seconds:30,points:2},{name:'هەڤرکییا لەزاتیێ',description:'١٠ پرسیار بۆ تیما ب لەزتر',seconds:30,points:2},{name:'مۆزایەدە',description:'پترین ژمارە د ٣٠ چرکەیان دا',seconds:30,points:2}];
const defaults=window.GEOGRAPHY_BANK.map(q=>({...q,round:q.round===2?3:q.round===3?2:q.round})).sort((a,b)=>a.round-b.round);
const BANK_VERSION=9;
const KEY='geography-competition-v1';
const TEAM_ROSTER_VERSION=1;
const DEFAULT_TEAM_NAMES=["هيزا جوگرافي","دلئ جوگرافي"];
const DEFAULT_TEAM_MEMBERS=[["پیلان کمال فخر الدین","رێژین فرحان حامد","دیدار خیر الدین نجم الدین","دلڤين نقیب صبری","سفيان حازم خدر","جنان الياس جمعه","شەرمین مصطفى شينو"],["رويدة جاسم عران","نڤار عمران محمد صديق","مینا محمدعلی حازم","دلگه ش أحمد زبير","نەوزاد شاهین طە","رنگين سگڤان محمد","لؤي صدقي محمدسعيد"]];
const AUDIENCE_QUESTION_VERSION=2;
const DEFAULT_AUDIENCE_QUESTION='بلندییا باژێرێ دهۆکێ ژ ئاستێ دەریایێ چەندە؟';
const DEFAULT_AUDIENCE_ANSWER='د ناڤبەرا 490 و520 مەتران دایە.';
function fresh(){return {audienceBonus:null,audienceQuestionVersion:AUDIENCE_QUESTION_VERSION,teamRosterVersion:TEAM_ROSTER_VERSION,roundIntro:null,visualIntro:null,speedIntro:null,audience:null,audienceQuestion:DEFAULT_AUDIENCE_QUESTION,audienceAnswer:DEFAULT_AUDIENCE_ANSWER,names:[...DEFAULT_TEAM_NAMES],members:structuredClone(DEFAULT_TEAM_MEMBERS),scores:[0,0],index:-1,resumeIndex:null,questions:structuredClone(defaults),awarded:{},revealed:{},sound:true,choices:{},speedCounts:{},buzzerAwards:{},unlocked:{},bankVersion:BANK_VERSION};}
let state;try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&!saved.bankVersion)saved.bankVersion=1;state=saved&&Array.isArray(saved.questions)&&saved.questions.length&&Array.isArray(saved.names)&&Array.isArray(saved.scores)?{...fresh(),...saved,teamRosterVersion:saved.teamRosterVersion||0,audienceQuestionVersion:saved.audienceQuestionVersion||0}:fresh();}catch{state=fresh();}
// Update old generic names, preserving names already customized in Settings.
let namesUpdated=false;
state.names=state.names.map((name,i)=>{if(typeof name==='string'&&name.includes('جوكرافي')){namesUpdated=true;name=name.replace(/جوكرافي/g,'جوگرافي');}if(!name||name===['الفريق الأول','الفريق الثاني'][i]||(i===1&&name==='لێدانا جوگرافیایێ')){namesUpdated=true;return DEFAULT_TEAM_NAMES[i];}return name;});
if(namesUpdated)save();
// Preserve editable rosters in older locally saved games, without resetting scores.
if(!Array.isArray(state.members)||state.members.length!==2||state.members.some(m=>!Array.isArray(m)))state.members=structuredClone(DEFAULT_TEAM_MEMBERS);
// Apply the corrected team names and ordered rosters once to existing browsers.
// Scores, questions, intro screens and progress stay exactly as saved.
if(state.teamRosterVersion<TEAM_ROSTER_VERSION){
 state.names=[...DEFAULT_TEAM_NAMES];
 state.members=structuredClone(DEFAULT_TEAM_MEMBERS);
 state.teamRosterVersion=TEAM_ROSTER_VERSION;
 save();
}
// Install the audience question specified by the organizer without resetting game results.
if(state.audienceQuestionVersion<AUDIENCE_QUESTION_VERSION){
 state.audienceQuestion=DEFAULT_AUDIENCE_QUESTION;
 state.audienceAnswer=DEFAULT_AUDIENCE_ANSWER;
 state.audienceQuestionVersion=AUDIENCE_QUESTION_VERSION;
 save();
}
// Answer disclosure is a view state; a restored audience screen starts concealed.
if(state.audience)state.audience.answerVisible=false;
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
// Remove retired decorative images from saved questions without changing game state.
state.questions=state.questions.map(q=>{if(!q.contextImage)return q;const {contextImage,...question}=q;return question;});
save();
window.addEventListener('pagehide',save);

let remaining=0,interval=null,deadline=0,audio,audienceInterval=null;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function enterCompetitionFullscreen(){
 if(document.fullscreenElement)return;
 const root=document.documentElement;
 const request=root.requestFullscreen||root.webkitRequestFullscreen;
 if(request){try{const result=request.call(root);if(result?.catch)result.catch(()=>{});}catch{}}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function beep(){if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();for(let i=0;i<3;i++){let o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=660;g.gain.value=.15;o.start(audio.currentTime+i*.22);o.stop(audio.currentTime+i*.22+.12);}}catch{}}
function score(team,n){state.scores[team]=Math.max(0,state.scores[team]+n);save();renderScores();}
function renderScores(){['A','B'].forEach((v,i)=>{$('#name'+v).textContent=state.names[i];$('#score'+v).textContent=state.scores[i];});}
function stop(){if(interval)clearInterval(interval);interval=null;}
function tick(){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));updateTimer();if(remaining===0){stop();beep();$('#timerStatus').textContent='دەم تەمام بوو';$('#startTimer').textContent='دەم تەمام بوو';$('#startTimer').disabled=true;}}
function updateTimer(){if(!$('#timer'))return;$('#timer').textContent=remaining;$('#timer').classList.toggle('urgent',remaining<=5);const ratio=Math.max(0,Math.min(1,remaining/rounds[state.questions[state.index].round].seconds));$('#bar').style.width=(ratio*100)+'%';$('#bar').classList.toggle('time-warning',remaining<=5);}
function startTimer(){if(interval){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));stop();$('#startTimer').textContent='دووبارە دەستپێکرن';$('#timerStatus').textContent='دەمژمێر راوه‌ستیایە';}else if(remaining>0){deadline=Date.now()+remaining*1000;interval=setInterval(tick,100);$('#startTimer').textContent='راوەستاندنا دەمژمێری';$('#timerStatus').textContent='دەم دچیت';}}
function redrawQuestion(){const seconds=remaining;stop();render();remaining=seconds;updateTimer();if(remaining===0){$('#startTimer').disabled=true;$('#startTimer').textContent='دەم تەمام بوو';$('#timerStatus').textContent='دەم تەمام بوو';}else if(remaining<30){$('#startTimer').textContent='دووبارە دەستپێکرن';$('#timerStatus').textContent='دەمژمێر راوه‌ستیایە';}}
// New visit presentation is independent of the competition's one-time audience bonus.
function freshAudienceVisit(targetIndex){
 const previous=state.audience;
 if(Number.isInteger(previous?.awardedTeam)&&!state.audienceBonus)state.audienceBonus={team:previous.awardedTeam,points:2};
 return {active:true,pending:true,targetIndex,questionVisible:false,answerVisible:false,resolved:false,expired:false,completed:false,awardedTeam:null,awaitingTeamChoice:false,deadline:null,replay:!!state.audienceBonus};
}
// A persistent audience stop between rounds two and three, in both navigation directions.
function go(index,skipAudience=false,skipSpeedIntro=false,skipVisualIntro=false,skipRoundIntro=false){
 stop();if(state.audience)state.audience.answerVisible=false;
 const target=Math.max(-1,Math.min(index,state.questions.length));
 const current=state.questions[state.index],next=state.questions[target];
 const audience=state.audience;
 // Keep the visual-round introduction in the previous/next sequence.
 const crossesVisualBoundary=(current?.round===0&&next?.round===1&&target>state.index)||(current?.round===1&&next?.round===0&&target<state.index);
 const resumesVisualIntro=state.visualIntro?.pending&&target===state.visualIntro.targetIndex;
 if(!skipVisualIntro&&(crossesVisualBoundary||resumesVisualIntro||(state.index<0&&next?.round===1))){
  const firstSecond=state.questions.findIndex(q=>q.round===1);
  openVisualIntro(next?.round===1?target:firstSecond);return;
 }
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
  state.audience=freshAudienceVisit(destination);
  state.resumeIndex=destination;
  state.revealed={};state.speedCounts={};save();render();return;
 }
 // Round one and the final auction have their own persistent introduction screens.
 if(!skipRoundIntro){
  if(current?.round===3&&next?.round===2&&target<state.index){
   const firstAuction=state.questions.findIndex(q=>q.round===3);
   if(firstAuction>=0){openRoundIntro(3,firstAuction);return;}
  }
  if((next?.round===0||next?.round===3)&&(state.index<0||current?.round!==next.round||(state.roundIntro?.pending&&target===state.roundIntro.targetIndex))){
   openRoundIntro(next.round,target);return;
  }
 }
 if(state.roundIntro)state.roundIntro.active=false;
 if(!skipSpeedIntro&&next?.round===2&&((state.speedIntro?.pending&&target===state.speedIntro.targetIndex)||current?.round!==2)){
  openSpeedIntro(target);return;
 }
 if(state.visualIntro)state.visualIntro.active=false;
 if(state.speedIntro)state.speedIntro.active=false;
 if(audience)audience.active=false;
 state.revealed={};state.speedCounts={};state.index=target;
 if(state.index>=0)state.resumeIndex=state.index;
 save();render();
}
function openRoundIntro(round,targetIndex){
 stop();if(state.audience)state.audience.answerVisible=false;
 for(const key of ['visualIntro','speedIntro','audience'])if(state[key])state[key].active=false;
 state.roundIntro={active:true,pending:true,round,targetIndex};state.resumeIndex=targetIndex;save();render();
}
function renderRoundIntro(){
 const intro=state.roundIntro,auction=intro.round===3;
 const roundLabel=auction?'قۆناغا چارێ':'قۆناغا ئێکێ';
 $('#homeLogos').hidden=true;$('.scoreboard').hidden=false;$('#headerTurn').hidden=false;
 $('#headerTurn').classList.remove('b');$('#headerTeamName').textContent=roundLabel;
 document.body.classList.remove('question-view','presentation-fit');
 const artwork=auction?`<svg class="round-intro-art" viewBox="0 0 700 320" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="auctionGold" x2="1" y2="1"><stop stop-color="#fff0b9"/><stop offset=".45" stop-color="#b68d45"/><stop offset="1" stop-color="#ebd08e"/></linearGradient><clipPath id="auctionCounterClip"><rect x="245" y="119" width="117" height="60" rx="5"/></clipPath></defs>
 <ellipse cx="350" cy="281" rx="230" ry="11" fill="#75624b" opacity=".11"/>
 <g transform="translate(145 151)"><circle r="60" fill="#fff9ed" stroke="#b8a585" stroke-width="3"/><circle r="48" fill="none" stroke="#9ab1aa" stroke-dasharray="2 8"/><path d="M-12-60v-10h24v10M-20-72h40" fill="none" stroke="#b18b48" stroke-width="6" stroke-linecap="round"/><g class="round-auction-hand"><path d="M0 10v-49" stroke="#597e83" stroke-width="3" stroke-linecap="round"/></g><circle r="5" fill="#b18b48"/><text y="29" text-anchor="middle" fill="#8a6c38" font-family="Arial,sans-serif" font-size="17" font-weight="700">30</text></g>
 <g class="round-auction-board"><rect x="225" y="80" width="250" height="159" rx="19" fill="#fff9ee" stroke="#b8a585" stroke-width="2"/><rect x="237" y="93" width="226" height="132" rx="12" fill="#31545c"/><path d="M341 238v22M266 263h154" stroke="url(#auctionGold)" stroke-width="10" stroke-linecap="round"/>
 <g clip-path="url(#auctionCounterClip)"><g class="round-auction-numbers" fill="#fff0b9" font-family="Arial,sans-serif" font-size="51" font-weight="700" text-anchor="middle">${Array.from({length:9},(_,i)=>`<text x="303" y="${167+i*60}">${String(i).padStart(2,'0')}</text>`).join('')}</g></g>
 <path class="round-auction-arrow" d="M411 176v-49m-15 16 15-16 15 16" fill="none" stroke="#d9c184" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
 <path d="M259 205h50M319 205h50M379 205h60" stroke="#a1c2b3" stroke-width="3" stroke-linecap="round"/>
 </g>
 <g transform="translate(545 173)"><g class="round-auction-paddle"><path d="M-16 24v79h32V24" fill="url(#auctionGold)" stroke="#9e7c40" stroke-width="2"/><circle r="51" fill="url(#auctionGold)" stroke="#9e7c40" stroke-width="2"/><circle r="41" fill="#fff9ee"/><path d="M-17 0h34M0-17v34" stroke="#547a80" stroke-width="6" stroke-linecap="round"/></g></g>
 <g class="round-intro-spark" fill="#b18b48"><path d="m199 45 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z"/><circle cx="484" cy="46" r="4"/><circle cx="626" cy="88" r="3"/></g>
 </svg>`:`<svg class="round-intro-art" viewBox="0 0 700 320" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="knowledgeGold" x2="1" y2="1"><stop stop-color="#fff1bd"/><stop offset=".4" stop-color="#b18b48"/><stop offset="1" stop-color="#e5ca8b"/></linearGradient><radialGradient id="knowledgeFace" cx=".35" cy=".25" r=".85"><stop stop-color="#537d83"/><stop offset="1" stop-color="#22464f"/></radialGradient></defs>
 <ellipse cx="350" cy="280" rx="220" ry="10" fill="#75624b" opacity=".11"/>
 <g transform="translate(350 158)"><circle r="111" fill="none" stroke="#b8a585" stroke-width="1"/><g class="round-knowledge-orbit"><circle r="111" fill="none" stroke="#b18b48" stroke-width="3" stroke-dasharray="45 129"/><circle cy="-111" r="5" fill="#fff0b9" stroke="#b18b48"/></g><circle r="91" fill="url(#knowledgeGold)"/><circle r="83" fill="url(#knowledgeFace)"/><g fill="none" stroke="#c4d5c3" stroke-width="1" opacity=".2"><ellipse rx="37" ry="81"/><ellipse rx="66" ry="81"/><ellipse rx="81" ry="25"/><ellipse rx="81" ry="54"/><path d="M-82 0H82M0-82V82"/></g><g class="round-knowledge-mark"><path d="M-23-25c0-30 50-33 50-4 0 18-26 17-26 37v4" fill="none" stroke="#fff0b9" stroke-width="10" stroke-linecap="round"/><circle cy="35" r="6" fill="#fff0b9"/></g></g>
 ${['A','B','C','D'].map((letter,i)=>{const x=i%2?503:93,y=i<2?72:192;return `<g class="round-knowledge-card" style="animation-delay:-${i*.7}s" transform="translate(${x} ${y})"><rect width="104" height="63" rx="13" fill="#fff9ee" stroke="#b6a081" stroke-width="2"/><circle cx="30" cy="31" r="18" fill="${i===2?'#b18b48':'#63858a'}"/><text x="30" y="37" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#fff9ee">${letter}</text><path d="M59 25h27M59 37h19" stroke="#b5a07f" stroke-width="3" stroke-linecap="round"/></g>`;}).join('')}
 <g fill="none" stroke="#b18b48" opacity=".45" stroke-dasharray="3 7"><path d="M197 104h44M459 104h44M197 223h44M459 223h44"/></g>
 <g class="round-intro-spark" stroke="#b18b48" stroke-width="2"><path d="M252 36h14M259 29v14M441 275h14M448 268v14"/></g>
 </svg>`;
 $('#stage').innerHTML=`<style>
 .round-intro{width:min(100%,1050px);position:relative;isolation:isolate;overflow:hidden;margin:auto;border-radius:24px;border:1px solid #c7b395;background:radial-gradient(ellipse at 50% 45%,#fffdf7,#f7eddd 58%,#e8dbc7);color:#64513f;text-align:center;padding:clamp(20px,3vw,38px);box-shadow:0 16px 42px #57452f20}
 .round-intro::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.18;background:repeating-radial-gradient(ellipse at 85% 20%,transparent 0 38px,#87958f 39px 40px,transparent 41px 80px)}
 .round-intro .round-intro-kicker{margin:0;color:#8b692e;font-size:clamp(18px,2.3vw,30px);font-weight:800;letter-spacing:1px}
 .round-intro h1{font-size:clamp(32px,4.5vw,63px);line-height:1.45;margin:3px 0 5px;color:#986a28;text-shadow:0 2px #fff9ee}
 .round-intro .round-intro-caption{margin:4px 0 12px;color:#537c87;font-size:clamp(15px,1.6vw,22px);line-height:1.7}
 .round-intro .round-intro-art{display:block;width:min(100%,700px);height:auto;margin:auto;overflow:visible}
 .round-intro .round-knowledge-orbit{animation:round-intro-orbit 12s linear infinite;transform-origin:0 0}
 .round-intro .round-knowledge-mark{animation:round-intro-pulse 3s ease-in-out infinite;transform-origin:0 0}
 .round-intro .round-knowledge-card{animation:round-intro-float 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
 .round-intro .round-intro-spark{animation:round-intro-pulse 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
 .round-intro .round-auction-hand{animation:round-intro-orbit 2s linear infinite;transform-origin:0 0}
 .round-intro .round-auction-numbers{animation:round-intro-count 4.8s steps(8,end) infinite}
 .round-intro .round-auction-arrow{animation:round-intro-arrow 1.4s ease-in-out infinite}
 .round-intro .round-auction-paddle{animation:round-intro-bid 2.5s ease-in-out infinite;transform-origin:0 103px}
 .round-intro .round-intro-controls{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:18px;border-top:1px solid #c7b395}
 .round-intro .round-intro-controls button{white-space:normal;line-height:1.6;padding:12px 20px}
 .round-intro #roundIntroStart{background:#64513f;border-color:#64513f;color:#fffaf1;font-size:clamp(17px,1.8vw,23px);min-width:200px;box-shadow:0 4px 13px #64513f30}
 @keyframes round-intro-orbit{to{transform:rotate(360deg)}}
 @keyframes round-intro-pulse{50%{opacity:.55;transform:scale(.95)}}
 @keyframes round-intro-float{50%{translate:0 -7px}}
 @keyframes round-intro-count{to{transform:translateY(-480px)}}
 @keyframes round-intro-arrow{50%{transform:translateY(-6px)}}
 @keyframes round-intro-bid{50%{transform:rotate(-9deg)}}
 @media(max-width:600px){.round-intro{padding:20px 12px}.round-intro .round-intro-controls{gap:8px}.round-intro #roundIntroStart{width:100%;order:-1}}
 @media(prefers-reduced-motion:reduce){.round-intro *{animation:none!important}}
 </style><section class="round-intro" aria-labelledby="roundIntroTitle"><p class="round-intro-kicker">${roundLabel}</p><h1 id="roundIntroTitle">${esc(rounds[intro.round].name)}</h1><p class="round-intro-caption">${auction?'٣٠ چرکە… پترین ژمارا بەرسڤان بێژن!':'زانینا خۆ تاقی بکەن… بەرسڤا دروست هەلبژێرن!'}</p>${artwork}<div class="round-intro-controls"><button id="roundIntroPrevious" type="button">${auction?'یا بەرێ · قۆناغا سێیێ':'لاپەڕا سەرەکی'}</button><button id="roundIntroStart" type="button">${auction?'دەستپێکرنا قۆناغا چارێ':'دەستپێکرنا قۆناغا ئێکێ'}</button>${auction?'<button id="roundIntroHome" type="button">لاپەڕا سەرەکی</button>':''}</div></section>`;
 $('#roundIntroStart').onclick=()=>{if(!intro.active)return;intro.active=false;intro.pending=false;save();go(intro.targetIndex,true,true,true,true);};
 $('#roundIntroPrevious').onclick=()=>{if(!intro.active)return;intro.active=false;intro.pending=false;const previous=auction?state.questions.reduce((last,q,index)=>q.round===2?index:last,-1):-1;save();go(previous,true,true,true,true);};
 if(auction)$('#roundIntroHome').onclick=()=>go(-1);
}
function openVisualIntro(targetIndex){
 stop();if(state.audience)state.audience.answerVisible=false;
 if(state.roundIntro)state.roundIntro.active=false;
 if(state.audience)state.audience.active=false;
 if(state.speedIntro)state.speedIntro.active=false;
 state.visualIntro={active:true,pending:true,targetIndex};
 state.resumeIndex=targetIndex;save();render();
}
function renderVisualIntro(){
 const intro=state.visualIntro;
 $('#homeLogos').hidden=true;$('.scoreboard').hidden=false;
 $('#headerTurn').hidden=false;$('#headerTurn').classList.remove('b');
 $('#headerTeamName').textContent='قۆناغا دووێ';
 document.body.classList.remove('question-view','presentation-fit');
 $('#stage').innerHTML=`<style>
 .visual-intro{width:min(100%,1050px);position:relative;isolation:isolate;overflow:hidden;margin:auto;border-radius:24px;border:1px solid #c7b395;background:radial-gradient(ellipse at 50% 45%,#fffdf7,#f7eddd 58%,#e8dbc7);color:#64513f;text-align:center;padding:clamp(20px,3vw,38px);box-shadow:0 16px 42px #57452f20}
 .visual-intro::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.18;background:repeating-radial-gradient(ellipse at 15% 20%,transparent 0 38px,#87958f 39px 40px,transparent 41px 80px)}
 .visual-intro .visual-kicker{margin:0;color:#8b692e;font-size:clamp(18px,2.3vw,30px);font-weight:800;letter-spacing:1px}
 .visual-intro h1{font-size:clamp(32px,4.5vw,63px);line-height:1.45;margin:3px 0 5px;color:#986a28;text-shadow:0 2px #fff9ee}
 .visual-intro .visual-caption{margin:4px 0 12px;color:#537c87;font-size:clamp(15px,1.6vw,22px);line-height:1.7}
 .visual-intro .visual-art{display:block;width:min(100%,700px);height:auto;margin:auto;overflow:visible}
 .visual-intro .visual-photo-left{animation:visual-photo-float 5s ease-in-out infinite;transform-origin:180px 165px}
 .visual-intro .visual-photo-right{animation:visual-photo-float 5s ease-in-out infinite;animation-delay:-2.5s;transform-origin:520px 165px}
 .visual-intro .visual-lens{animation:visual-lens-search 6s ease-in-out infinite}
 .visual-intro .visual-scan{animation:visual-scan 4s ease-in-out infinite}
 .visual-intro .visual-twinkle{animation:visual-twinkle 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
 .visual-intro .visual-controls{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:18px;border-top:1px solid #c7b395}
 .visual-intro .visual-controls button{white-space:normal;line-height:1.6;padding:12px 20px}
 .visual-intro #visualIntroStart{background:#64513f;border-color:#64513f;color:#fffaf1;font-size:clamp(17px,1.8vw,23px);min-width:200px;box-shadow:0 4px 13px #64513f30}
 @keyframes visual-photo-float{50%{transform:translateY(-7px) rotate(2deg)}}
 @keyframes visual-lens-search{0%,100%{transform:translate(-22px,3px)}50%{transform:translate(20px,-7px)}}
 @keyframes visual-scan{0%,100%{transform:translateY(0);opacity:.2}50%{transform:translateY(115px);opacity:.7}}
 @keyframes visual-twinkle{50%{opacity:.35;transform:scale(.7)}}
 @media(max-width:600px){.visual-intro{padding:20px 12px}.visual-intro .visual-controls{gap:8px}.visual-intro #visualIntroStart{width:100%;order:-1}}
 @media(prefers-reduced-motion:reduce){.visual-intro *{animation:none!important}}
 </style><section class="visual-intro" aria-labelledby="visualIntroTitle">
 <p class="visual-kicker">قۆناغا دووێ</p>
 <h1 id="visualIntroTitle">${esc(rounds[1].name)}</h1>
 <p class="visual-caption">ب باشی سەح بکەن… دیاردەیێ ژ وێنەیێ بناسن!</p>
 <svg class="visual-art" viewBox="0 0 700 320" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="visualSky" x2="0" y2="1"><stop stop-color="#bed8d5"/><stop offset="1" stop-color="#edf1dc"/></linearGradient><linearGradient id="visualGold" x2="1" y2="1"><stop stop-color="#fae8b5"/><stop offset=".5" stop-color="#b18b48"/><stop offset="1" stop-color="#e5ca8b"/></linearGradient><clipPath id="visualFrameClip"><rect x="211" y="72" width="278" height="177" rx="9"/></clipPath><radialGradient id="visualAura"><stop stop-color="#c9b27a" stop-opacity=".28"/><stop offset="1" stop-color="#c9b27a" stop-opacity="0"/></radialGradient></defs>
 <ellipse cx="350" cy="166" rx="290" ry="145" fill="url(#visualAura)"/>
 <ellipse cx="350" cy="285" rx="240" ry="10" fill="#75624b" opacity=".1"/>
 <g class="visual-photo-left"><g transform="rotate(-12 180 165)"><rect x="73" y="91" width="191" height="151" rx="12" fill="#fffaf1" stroke="#c7b395" stroke-width="2"/><rect x="84" y="102" width="169" height="112" rx="5" fill="#dfcdb1"/><path d="m84 213 63-89 37 54 30-37 39 72Z" fill="#8e7a60"/><path d="m129 150 18-26 17 25-17-6Z" fill="#fff5dd"/><path d="M97 224h62" stroke="#bda98a" stroke-width="4" stroke-linecap="round"/></g></g>
 <g class="visual-photo-right"><g transform="rotate(12 520 165)"><rect x="439" y="91" width="191" height="151" rx="12" fill="#fffaf1" stroke="#c7b395" stroke-width="2"/><rect x="450" y="102" width="169" height="112" rx="5" fill="#c3d9d1"/><path d="M450 167q43-57 82-13t87-13v73H450Z" fill="#658f8a"/><path d="M450 195q43-37 82-5t87-6v30H450Z" fill="#88b3aa"/><path d="M463 224h62" stroke="#bda98a" stroke-width="4" stroke-linecap="round"/></g></g>
 <rect x="199" y="60" width="302" height="208" rx="15" fill="#fffaf1" stroke="#b59a70" stroke-width="2"/>
 <g clip-path="url(#visualFrameClip)"><rect x="211" y="72" width="278" height="177" fill="url(#visualSky)"/><circle cx="434" cy="103" r="17" fill="#f2d496"/><path d="m211 231 88-132 70 105 45-68 75 95v18H211Z" fill="#80948b"/><path d="m270 142 29-43 28 42-28-12Z" fill="#f9f5e4"/><path d="m389 173 25-37 21 31-22-6Z" fill="#e6edde"/><path d="M211 234q70-52 123-10t155-4v29H211Z" fill="#4f7b77"/><path d="M344 211q-20 11-4 19t-11 19h29q22-15 0-22t12-15Z" fill="#a0d1ca"/><path class="visual-scan" d="M211 93H489" stroke="#f3db9b" stroke-width="3"/></g>
 <path d="M215 260h70" stroke="#c3af8c" stroke-width="3" stroke-linecap="round"/>
 <g fill="none" stroke="#b18b48" stroke-width="2"><path d="M201 88V66h22M477 66h22v22M499 240v22h-22M223 262h-22v-22"/></g>
 <g class="visual-lens"><path d="m405 207 67 66" stroke="#5c5140" stroke-width="20" stroke-linecap="round"/><path d="m411 213 58 57" stroke="url(#visualGold)" stroke-width="12" stroke-linecap="round"/><circle cx="365" cy="166" r="66" fill="#fff9df" fill-opacity=".18" stroke="#5c5140" stroke-width="13"/><circle cx="365" cy="166" r="66" fill="none" stroke="url(#visualGold)" stroke-width="7"/><path d="M319 154a48 48 0 0 1 39-35" fill="none" stroke="#fffaf0" stroke-width="4" opacity=".8" stroke-linecap="round"/><path d="M349 166h32M365 150v32" stroke="#fff9df" stroke-width="1.5" opacity=".8"/></g>
 <g class="visual-twinkle" stroke="#b18b48" stroke-width="2" fill="none"><path d="M135 59h16M143 51v16M551 64h14M558 57v14"/><circle cx="589" cy="265" r="4"/><circle cx="101" cy="267" r="3"/></g>
 </svg>
 <div class="visual-controls"><button id="visualIntroPrevious" type="button">یا بەرێ · قۆناغا ئێکێ</button><button id="visualIntroStart" type="button">دەستپێکرنا قۆناغا دووێ</button><button id="visualIntroHome" type="button">لاپەڕا سەرەکی</button></div>
 </section>`;
 $('#visualIntroStart').onclick=()=>{if(!intro.active)return;intro.active=false;intro.pending=false;save();go(intro.targetIndex,true,true,true,true);};
 $('#visualIntroPrevious').onclick=()=>{if(!intro.active)return;const lastFirst=state.questions.reduce((last,q,index)=>q.round===0?index:last,-1);intro.active=false;intro.pending=false;save();go(lastFirst,true,true,true,true);};
 $('#visualIntroHome').onclick=()=>go(-1);
}
function openSpeedIntro(targetIndex){
 stop();if(state.audience)state.audience.answerVisible=false;
 if(state.roundIntro)state.roundIntro.active=false;
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





 .speed-intro .speed-streak{animation:speed-streak .7s linear infinite;animation-delay:var(--delay,0s);transform-origin:center;stroke-linecap:round}


 .speed-intro .speed-controls{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:18px;border-top:1px solid #c7b395}
 .speed-intro .speed-controls button{white-space:normal;line-height:1.6;padding:12px 20px}
 .speed-intro #speedIntroStart{background:#64513f;border-color:#64513f;color:#fffaf1;font-size:clamp(17px,1.8vw,23px);min-width:200px;box-shadow:0 4px 13px #64513f30}
 .speed-intro .speed-orbit{animation:speed-hand 2.1s linear infinite;transform-origin:0 0}
 .speed-intro .speed-orbit-reverse{animation-direction:reverse;animation-duration:3.7s}
 .speed-intro .speed-main-hand{animation:speed-hand .9s linear infinite;transform-origin:0 0}
 .speed-intro .speed-chevron{animation:speed-chevron .8s ease-in-out infinite}
 @keyframes speed-chevron{0%,100%{opacity:.25}50%{opacity:1;transform:translateX(3px)}}
 @keyframes speed-hand{to{transform:rotate(360deg)}}
 @keyframes speed-streak{from{transform:translateX(65px);opacity:0}20%{opacity:.8}to{transform:translateX(-100px);opacity:0}}
 @media(max-width:600px){.speed-intro{padding:20px 12px}.speed-intro .speed-controls{gap:8px}.speed-intro #speedIntroStart{width:100%;order:-1}}
 @media(prefers-reduced-motion:reduce){.speed-intro *{animation:none!important}}
 </style><section class="speed-intro" aria-labelledby="speedIntroTitle">
 <p class="speed-kicker">قۆناغا سێیێ</p>
 <h1 id="speedIntroTitle">${esc(rounds[2].name)}</h1>
 <p class="speed-caption">ئامادە بن… ل ڤێرێ لەزاتی جیاوازیێ دروست دکەت!</p>
 <svg class="speed-art" viewBox="0 0 700 320" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <radialGradient id="speedAura"><stop stop-color="#e3bf77" stop-opacity=".42"/><stop offset="1" stop-color="#e3bf77" stop-opacity="0"/></radialGradient>
 <linearGradient id="speedDialGold" x2="1" y2="1"><stop stop-color="#fff1bd"/><stop offset=".32" stop-color="#bd924b"/><stop offset=".62" stop-color="#f6d991"/><stop offset="1" stop-color="#8e682d"/></linearGradient>
 <radialGradient id="speedDialFace" cx=".35" cy=".25" r=".85"><stop stop-color="#41636b"/><stop offset="1" stop-color="#173b45"/></radialGradient>
 </defs>
 <ellipse cx="350" cy="174" rx="242" ry="140" fill="url(#speedAura)"/>
 ${clock(130,91,51,false)}${clock(566,97,57,true)}${clock(530,245,34,false)}${clock(160,250,29,true)}
 <g fill="none" stroke="#b18b48" stroke-width="3" opacity=".7">
 <path class="speed-streak" d="M105 135H250"/><path class="speed-streak" style="--delay:-.24s" d="M70 171H248"/>
 <path class="speed-streak" style="--delay:-.5s" d="M133 208H250"/><path class="speed-streak" style="--delay:-.1s" d="M444 149H602"/>
 <path class="speed-streak" style="--delay:-.37s" d="M451 193H628"/>
 </g>
 <g transform="translate(350 174)">
 <ellipse cy="123" rx="100" ry="8" fill="#64513f" opacity=".12"/>
 <circle r="113" fill="none" stroke="#9aaea6" stroke-width="1" opacity=".5"/>
 <g class="speed-orbit"><circle r="109" fill="none" stroke="#b18b48" stroke-width="3" stroke-dasharray="78 22 5 22 33 22"/><circle cy="-109" r="4" fill="#fff4cc" stroke="#b18b48" stroke-width="1.5"/></g>
 <g class="speed-orbit speed-orbit-reverse"><circle r="100" fill="none" stroke="#698e91" stroke-width="2" stroke-dasharray="33 124"/></g>
 <path d="M-10-79v-16h20v16" fill="url(#speedDialGold)" stroke="#a58143"/>
 <rect x="-23" y="-107" width="46" height="14" rx="5" fill="url(#speedDialGold)" stroke="#a58143"/>
 <path d="m58-61 12-12 9 9-12 12" fill="url(#speedDialGold)" stroke="#a58143"/>
 <circle r="85" fill="url(#speedDialGold)" stroke="#947540" stroke-width="1.5"/>
 <circle r="77" fill="url(#speedDialFace)" stroke="#f4dba2" stroke-width="1.5"/>
 <g fill="none" stroke="#e4d2a4" opacity=".8"><path d="M0-67v9" transform="rotate(0)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(6)" stroke-width="1"/><path d="M0-67v4" transform="rotate(12)" stroke-width="1"/><path d="M0-67v4" transform="rotate(18)" stroke-width="1"/><path d="M0-67v4" transform="rotate(24)" stroke-width="1"/><path d="M0-67v9" transform="rotate(30)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(36)" stroke-width="1"/><path d="M0-67v4" transform="rotate(42)" stroke-width="1"/><path d="M0-67v4" transform="rotate(48)" stroke-width="1"/><path d="M0-67v4" transform="rotate(54)" stroke-width="1"/><path d="M0-67v9" transform="rotate(60)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(66)" stroke-width="1"/><path d="M0-67v4" transform="rotate(72)" stroke-width="1"/><path d="M0-67v4" transform="rotate(78)" stroke-width="1"/><path d="M0-67v4" transform="rotate(84)" stroke-width="1"/><path d="M0-67v9" transform="rotate(90)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(96)" stroke-width="1"/><path d="M0-67v4" transform="rotate(102)" stroke-width="1"/><path d="M0-67v4" transform="rotate(108)" stroke-width="1"/><path d="M0-67v4" transform="rotate(114)" stroke-width="1"/><path d="M0-67v9" transform="rotate(120)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(126)" stroke-width="1"/><path d="M0-67v4" transform="rotate(132)" stroke-width="1"/><path d="M0-67v4" transform="rotate(138)" stroke-width="1"/><path d="M0-67v4" transform="rotate(144)" stroke-width="1"/><path d="M0-67v9" transform="rotate(150)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(156)" stroke-width="1"/><path d="M0-67v4" transform="rotate(162)" stroke-width="1"/><path d="M0-67v4" transform="rotate(168)" stroke-width="1"/><path d="M0-67v4" transform="rotate(174)" stroke-width="1"/><path d="M0-67v9" transform="rotate(180)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(186)" stroke-width="1"/><path d="M0-67v4" transform="rotate(192)" stroke-width="1"/><path d="M0-67v4" transform="rotate(198)" stroke-width="1"/><path d="M0-67v4" transform="rotate(204)" stroke-width="1"/><path d="M0-67v9" transform="rotate(210)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(216)" stroke-width="1"/><path d="M0-67v4" transform="rotate(222)" stroke-width="1"/><path d="M0-67v4" transform="rotate(228)" stroke-width="1"/><path d="M0-67v4" transform="rotate(234)" stroke-width="1"/><path d="M0-67v9" transform="rotate(240)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(246)" stroke-width="1"/><path d="M0-67v4" transform="rotate(252)" stroke-width="1"/><path d="M0-67v4" transform="rotate(258)" stroke-width="1"/><path d="M0-67v4" transform="rotate(264)" stroke-width="1"/><path d="M0-67v9" transform="rotate(270)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(276)" stroke-width="1"/><path d="M0-67v4" transform="rotate(282)" stroke-width="1"/><path d="M0-67v4" transform="rotate(288)" stroke-width="1"/><path d="M0-67v4" transform="rotate(294)" stroke-width="1"/><path d="M0-67v9" transform="rotate(300)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(306)" stroke-width="1"/><path d="M0-67v4" transform="rotate(312)" stroke-width="1"/><path d="M0-67v4" transform="rotate(318)" stroke-width="1"/><path d="M0-67v4" transform="rotate(324)" stroke-width="1"/><path d="M0-67v9" transform="rotate(330)" stroke-width="2.5"/><path d="M0-67v4" transform="rotate(336)" stroke-width="1"/><path d="M0-67v4" transform="rotate(342)" stroke-width="1"/><path d="M0-67v4" transform="rotate(348)" stroke-width="1"/><path d="M0-67v4" transform="rotate(354)" stroke-width="1"/></g>
 <path d="M-48 36A60 60 0 0 1 49-35" fill="none" stroke="#e8c77d" stroke-width="7" opacity=".13"/>
 <g class="speed-main-hand"><path d="M0 16V-58" fill="none" stroke="#fff0bb" stroke-width="3" stroke-linecap="round"/><path d="M-4-49 0-61 4-49Z" fill="#fff0bb"/></g>
 <circle r="7" fill="url(#speedDialGold)" stroke="#fff0bb"/>
 <g transform="translate(0 31)" fill="none" stroke="#d9c18b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="speed-chevron" d="m-23-6 7 6-7 6"/><path class="speed-chevron" style="animation-delay:-.2s" d="m-3-6 7 6-7 6"/><path class="speed-chevron" style="animation-delay:-.4s" d="m17-6 7 6-7 6"/></g>
 </g>
 </svg>
 <div class="speed-controls"><button id="speedIntroPrevious" type="button">یا بەرێ · پرسیارا جەماوەری</button><button id="speedIntroStart" type="button">دەستپێکرنا قۆناغا سێیێ ⚡</button><button id="speedIntroHome" type="button">لاپەڕا سەرەکی</button></div>
 </section>`;
 $('#speedIntroStart').onclick=()=>{if(!intro.active)return;intro.pending=false;intro.active=false;save();go(intro.targetIndex,true,true,true,true);};
 $('#speedIntroPrevious').onclick=()=>{
  if(!intro.active)return;intro.active=false;intro.pending=false;
  state.audience=freshAudienceVisit(intro.targetIndex);
  state.resumeIndex=intro.targetIndex;save();render();
 };
 $('#speedIntroHome').onclick=()=>go(-1);
}
function stopAudienceClock(){if(audienceInterval!==null)clearInterval(audienceInterval);audienceInterval=null;}
function finishAudience(expired=false){
 const audience=state.audience;if(!audience?.active)return;
 stopAudienceClock();audience.answerVisible=false;
 if(expired){
  if(!audience.resolved){audience.expired=true;audience.resolved=true;audience.deadline=null;beep();}
  // Expiry ends the question only; the presenter controls the next page.
  save();render();return;
 }
 audience.completed=true;audience.pending=false;audience.active=false;save();
 if(state.questions[audience.targetIndex]?.round===2)openSpeedIntro(audience.targetIndex);
 else go(audience.targetIndex,true,true,true,true);
}
function updateAudienceClock(){
 const audience=state.audience;
 if(!audience?.active||!audience.questionVisible||audience.resolved){stopAudienceClock();return;}
 const seconds=Math.max(0,Math.ceil((audience.deadline-Date.now())/1000));
 const timer=$('#audienceTimer');if(timer){timer.textContent=String(seconds);timer.classList.toggle('urgent',seconds<=5);}
 if(seconds===0)finishAudience(true);
}
function renderAudience(){
 const audience=state.audience,host=$('#stage');
 if(Number.isInteger(audience.awardedTeam))audience.resolved=true;
 if(audience.expired)audience.resolved=true;
 if(audience.questionVisible&&!audience.resolved){
  if(!Number.isFinite(audience.deadline)){audience.deadline=Date.now()+30000;save();}
  if(Date.now()>=audience.deadline){finishAudience(true);return;}
 }

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
 .audience-break .audience-timer{display:grid;place-items:center;width:76px;height:76px;margin:12px auto;border:3px solid #a98a50;border-radius:50%;background:#fff8e7;color:#866027;font:800 36px/1 Arial,sans-serif;font-variant-numeric:tabular-nums}
 .audience-break .audience-timer.urgent{border-color:#b95340;color:#b95340;background:#fff0e9}
 .audience-break #audienceCorrect{margin:8px 0;max-width:100%;white-space:normal;line-height:1.6}
 .audience-break:has(.audience-question) .audience-scene{max-height:100px}
 .audience-break .audience-answer-actions{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:clamp(6px,1vw,14px);margin:8px auto 0;max-width:950px}
 .audience-break .audience-answer-actions>button{flex:1 1 0;min-width:0;margin:0!important;padding:10px 12px;white-space:normal;font-size:clamp(12px,1.5vw,19px);line-height:1.5}
 .audience-break .audience-answer-actions>.audience-timer{flex:0 0 56px;width:56px;height:56px;margin:0;font-size:28px}
 .audience-break:has(.audience-question) .audience-question{margin-top:0}
 .audience-break .audience-city-photo{margin:12px auto;width:100%;max-width:none}
 .audience-break:has(.audience-question){width:min(100%,1250px);padding:clamp(12px,2vw,26px)}
 .audience-break .audience-question{max-width:none!important;padding:clamp(10px,1.5vw,20px)}
 .audience-break .audience-city-photo img{display:block;width:100%;height:auto;max-height:60dvh;object-fit:contain;border-radius:12px;background:#e9e3d6;border:1px solid #c7b395}
 .audience-break:has(.audience-question) .audience-scene{display:none}
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
 </style><section class="audience-break" aria-labelledby="${audience.questionVisible?'audienceQuestionTitle':'audienceTitle'}">
 ${audience.questionVisible?'':` <p class="audience-kicker">GEOGRAPHY AWARENESS WEEK · AUDIENCE</p>
 <h1 id="audienceTitle">نوکە دۆرا جەماوەرییە!</h1>
 <p class="audience-intro">د ماوەیێ ٣٠ چرکەیان دا بەرسڤ بدەن، پاشی تیمەکێ هەلبژێرن و دوو خاڵان پێ ببەخشن.</p>`}
 <svg class="audience-scene" viewBox="0 0 600 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="audienceLight" x2="0" y2="1"><stop stop-color="#d9bb79" stop-opacity=".05"/><stop offset="1" stop-color="#d9bb79" stop-opacity=".38"/></linearGradient></defs>
 <ellipse cx="300" cy="189" rx="267" ry="18" fill="#b99b6a" opacity=".19"/>
 <path d="M166 20 95 182H280ZM434 20 320 182H505Z" fill="url(#audienceLight)"/>
 <g class="audience-crowd">${crowd}</g>
 <g fill="#b18b48"><path class="audience-spark" d="m300 25 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1Z"/><circle class="audience-spark" cx="215" cy="57" r="4"/><circle class="audience-spark" cx="390" cy="52" r="3"/><path class="audience-spark" d="m118 61 6 6-6 6-6-6ZM477 42l5 5-5 5-5-5Z"/></g>
 <path d="M75 195H525" stroke="#ad8a51" stroke-width="2" stroke-linecap="round"/>
 </svg>
 ${audience.questionVisible?`<div class="audience-question"><h2 id="audienceQuestionTitle">${esc(state.audienceQuestion||DEFAULT_AUDIENCE_QUESTION)}</h2><figure class="audience-city-photo"><img src="assets/duhok-city-audience.jpg" width="1200" height="800" alt="إطلالة على مدينة دهوك من جبل زاوا" decoding="async" fetchpriority="high"></figure>
 ${audience.answerVisible?`<p class="audience-answer">${esc(state.audienceAnswer||DEFAULT_AUDIENCE_ANSWER)}</p>`:''}
 <div class="audience-answer-actions"><button id="audienceRevealAnswer" type="button">${audience.answerVisible?'ڤەشارتنا بەرسڤێ':'دیارکرنا بەرسڤێ'}</button>
 ${!audience.resolved?`<div id="audienceTimer" class="audience-timer" role="timer" aria-label="دەمێ مایی">${Math.max(0,Math.ceil((audience.deadline-Date.now())/1000))}</div><button id="audienceCorrect" type="button" class="primary">بەرسڤا دروست · هەلبژارتنا تیمێ</button>`:audience.expired?'<div id="audienceTimer" class="audience-timer urgent" role="timer" aria-label="دەم تەمام بوو">0</div>':''}</div>
 ${audience.resolved?`<p class="audience-awarded" role="status">${awarded?(audience.replay?'✓ هەلبژارتنا تیمێ هاتە تۆمارکرن':'✓ دوو خاڵ هاتنە بەخشین بۆ '+esc(state.names[audience.awardedTeam])):audience.expired?'دەم تەمام بوو؛ پرسیار سووت و چ خاڵ نەهاتنە بەخشین.':'بەرسڤ دروستە! تیمەکێ ب هەلبژارتنا جەماوەری هەلبژێرە.'}</p>${!awarded&&!audience.expired?`<div class="audience-team-buttons">${state.names.map((name,team)=>`<button type="button" data-audience-team="${team}">＋٢ · ${esc(name)}</button>`).join('')}</div>`:''}`:''}</div>`:'<button id="audienceShowQuestion" class="primary" type="button">دیارکرنا پرسیارێ و دەستپێکرنا ٣٠ چرکەیان</button>'}
 <div class="audience-continue"><button id="audiencePrevious" type="button">یا بەرێ · قۆناغا دووێ</button><button id="audienceContinue" type="button" ${awarded||audience.expired?'':'disabled'}>یا پاشێ ←</button><button id="audienceHome" type="button">لاپەڕا سەرەکی</button></div>
 </section>`;
 if(audience.questionVisible)$('#audienceRevealAnswer').onclick=()=>{audience.answerVisible=!audience.answerVisible;save();render();};
 if(!audience.questionVisible)$('#audienceShowQuestion').onclick=()=>{if(audience.questionVisible)return;audience.questionVisible=true;if(!audience.resolved)audience.deadline=Date.now()+30000;save();render();};
 if(audience.questionVisible&&!audience.resolved)$('#audienceCorrect').onclick=()=>{
  if(audience.resolved||!audience.active)return;
  if(Date.now()>=audience.deadline){finishAudience(true);return;}
  stopAudienceClock();audience.resolved=true;audience.deadline=null;
  audience.awaitingTeamChoice=true;delete audience.tied;save();render();
 };
 host.querySelectorAll('[data-audience-team]').forEach(button=>button.onclick=()=>{
  if(!audience.active||!audience.resolved||audience.expired||Number.isInteger(audience.awardedTeam))return;
  const team=Number(button.dataset.audienceTeam);if(team!==0&&team!==1)return;
  audience.awardedTeam=team;audience.awaitingTeamChoice=false;if(!state.audienceBonus){state.audienceBonus={team,points:2};score(team,2);}else save();render();
 });
 $('#audienceContinue').onclick=()=>{if(Number.isInteger(audience.awardedTeam)||audience.expired)finishAudience();};
 $('#audiencePrevious').onclick=()=>{
  const lastSecond=state.questions.reduce((last,q,index)=>q.round===1?index:last,-1);
  audience.pending=false;audience.active=false;save();go(lastSecond,true,true,true,true);
 };
 $('#audienceHome').onclick=()=>go(-1);
 if(audience.questionVisible&&!audience.resolved){updateAudienceClock();if(audience.active)audienceInterval=setInterval(updateAudienceClock,200);}
}
function render(){stopAudienceClock();document.body.classList.toggle('home-view',state.index<0&&!state.roundIntro?.active&&!state.visualIntro?.active&&!state.speedIntro?.active&&!state.audience?.active);document.body.classList.remove('interlude-view');fitQuestion();renderScores();if(state.roundIntro?.active){renderRoundIntro();return;}if(state.visualIntro?.active){renderVisualIntro();return;}if(state.speedIntro?.active){renderSpeedIntro();return;}if(state.audience?.active){renderAudience();return;}$('#homeLogos').hidden=state.index>=0;$('.scoreboard').hidden=state.index<0;const active=state.questions[state.index];$('#headerTurn').hidden=!active;$('#headerTurn').classList.toggle('b',active?.team===1);$('#headerTeamName').textContent=active?(active.round===2?'هەردوو تیم':state.names[active.team]):'';const host=$('#stage');document.body.classList.toggle('question-view',state.index>=0&&state.index<state.questions.length);if(state.index<0||state.index>=state.questions.length)document.body.classList.remove('presentation-fit');if(state.index<0){host.innerHTML=`<div class="hero"><p class="eyebrow">پێشبڕکیا زانینا جوگرافی</p><h1>حەفتییا هۆشیارییا جۆگرافی<span class="gaw-word" lang="en" dir="ltr">GAW</span></h1><p>ب پشکدارییا زانکۆیێن دهۆک و زاخۆ، بۆ پێشخستنا زانین و هۆشیارییا جوگرافی.</p><div class="actions"><button class="primary" id="beginNew">دەست پێ بکە</button><button class="primary" id="resumeCompetition" ${state.resumeIndex===null?'disabled':''}>زڤڕین بۆ پێشبڕکیێ</button></div></div><div class="rounds">${rounds.map((r,i)=>`<button class="roundtile" data-round="${i}"><small>قۆناغا ${['ئێکێ','دووێ','سێیێ','چارێ'][i]}</small><strong>${r.name}</strong><span>${r.description} · ${state.questions.filter(q=>q.round===i).length} پرسیار</span></button>`).join('')}</div>`;$('#beginNew').onclick=()=>{if(state.resumeIndex!==null&&!confirm('دەستپێکرنا پێشبڕکییەکا نوو دێ خاڵێن پێشبڕکییا نوکە و پێشڤەچوونا وێ بکەتە سفر. دێ بەردەوام بی؟'))return;enterCompetitionFullscreen();stop();state={...fresh(),names:state.names,members:structuredClone(state.members),questions:state.questions,sound:state.sound,audienceQuestion:state.audienceQuestion,audienceAnswer:state.audienceAnswer};go(0);};$('#resumeCompetition').onclick=()=>{if(state.resumeIndex!==null){enterCompetitionFullscreen();go(state.resumeIndex);}};host.querySelectorAll('[data-round]').forEach(x=>x.onclick=()=>go(state.questions.findIndex(q=>q.round===+x.dataset.round)));return;}
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
const timerHtml=`<div class="timer" id="timer" role="timer">${remaining}</div><span class="hint" id="timerStatus"${mcq?' hidden style="display:none" aria-hidden="true"':''}>دەمژمێر ئامادەیە</span>`;
const choiceHtml=mcq?`<fieldset class="choices" aria-label="هەلبژارتن">${q.options.map((option,i)=>`<label class="choice ${picked===i?'selected':''} ${revealed&&i===q.correctIndex?'correct':''} ${revealed&&picked===i&&i!==q.correctIndex?'incorrect':''}" data-choice-label="${i}"><input type="radio" name="choice" value="${i}" ${picked===i?'checked':''} ${revealed?'disabled':''}><b>${['A','B','C','D'][i]}</b><span>${esc(option)}</span></label>`).join('')}</fieldset>`:'';
const questionMain=`<h1>${esc(q.q)}</h1>${mcq?`<div class="mcq-layout">${choiceHtml}<div class="mcq-clock">${timerHtml}</div></div>`:''}`;
host.innerHTML=`<div class="arena ${mcq?'mcq-arena':''} ${visual?'visual-arena':''}">${visual?`<div class="visual-split"><div class="visual-question">${questionMain}</div><figure class="visual-image"><img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی"></figure></div>`:questionMain}${speed?`<div class="speed-count-panel"><output id="speedCount" class="speed-count" aria-label="ژمارا بەرسڤێن هاتینە گۆتن" aria-live="polite">${Number.isSafeInteger(state.speedCounts[q.id])&&state.speedCounts[q.id]>=0?state.speedCounts[q.id]:0}</output><p class="hint">ژمارا دیاردە یان خاڵێن هاتینە گۆتن</p></div>`:''}${q.image&&!visual?`<img src="${esc(q.image)}" alt="وێنەیا پرسیارا جوگرافی">`:''}${mcq?'':timerHtml}${revealed&&!mcq?`<div class="answer">${esc(q.answer)}</div>`:''}<div class="clockline"><div id="bar" style="width:100%"></div></div></div><div class="controls"><button id="startTimer" class="primary">دەستپێکرنا دەمژمێری</button><button id="resetTimer">دووبارەکرنا دەمێ</button>${speed?`<button id="countAnswer" class="primary">زێدەکرنا بەرسڤەکێ ＋١</button><button id="awardSpeed" ${awarded?'disabled':''}>${awarded?'✓ خاڵ هاتنە هەژمارتن':'＋٢ خاڵ'}</button>${awarded?'<button id="undoSpeed">ڤەگەڕاندنا خاڵان</button>':''}`:`<button id="reveal">${revealed?'ڤەشارتنا بەرسڤێ':'دیارکرنا بەرسڤێ'}</button>${buzzer?`<button id="awardBuzzerA" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[0])}</button><button id="awardBuzzerB" ${buzzerAward?'disabled':''}>＋٢ ${esc(state.names[1])}</button>${buzzerAward?`<button id="undoBuzzer">ڤەگەڕاندنا خاڵێن ${esc(state.names[buzzerAward.team])}</button>`:''}`:`<button id="award" ${awarded?'disabled':''}>${awarded?'✓ خاڵ هاتنە هەژمارتن':'بەرسڤا دروست ＋'+r.points}</button>${awarded?'<button id="undo">ڤەگەڕاندنا خاڵان</button>':''}`}`}<button id="prev">یا بەرێ</button><button id="next" ${canAdvance?'':'disabled'}>${state.index===state.questions.length-1?'راگەهاندنا ئەنجامێ':'یا پاشێ ←'}</button><button id="nextRound" ${canAdvance?'':'disabled'}>${q.round===rounds.length-1?'دوماهیکئینانا پێشبڕکیێ':'قۆناغا پاشێ'}</button></div>`;
fitQuestion();
if(speed){
 $('#countAnswer').onclick=()=>{const previous=state.speedCounts[q.id];const count=Number.isSafeInteger(previous)&&previous>=0?previous:0;if(count===Number.MAX_SAFE_INTEGER)return;state.speedCounts[q.id]=count+1;$('#speedCount').textContent=String(count+1);save();};
 $('#awardSpeed').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;state.unlocked[q.id]=true;score(q.team,r.points);redrawQuestion();};
 if($('#undoSpeed'))$('#undoSpeed').onclick=()=>{const points=state.awarded[q.id];if(!points)return;delete state.awarded[q.id];score(q.team,-points);redrawQuestion();};
}
if(mcq)host.querySelectorAll('input[name="choice"]').forEach(input=>input.onchange=()=>{state.choices[q.id]=Number(input.value);save();host.querySelectorAll('[data-choice-label]').forEach(label=>label.classList.toggle('selected',Number(label.dataset.choiceLabel)===Number(input.value)));});
$('#startTimer').onclick=startTimer;$('#resetTimer').onclick=()=>{stop();remaining=r.seconds;updateTimer();$('#timerStatus').textContent='دەمژمێر ئامادەیە';$('#startTimer').textContent='دەستپێکرنا دەمژمێری';$('#startTimer').disabled=false;};$('#nextRound').onclick=()=>{if(!state.unlocked[q.id]&&!state.revealed[q.id]&&!state.awarded[q.id]&&!state.buzzerAwards[q.id])return;const next=state.questions.findIndex(x=>x.round>q.round);go(next<0?state.questions.length:next);};$('#prev').onclick=()=>{if(state.index===0)openRoundIntro(0,0);else go(state.index-1);};$('#next').onclick=()=>{if(!state.unlocked[q.id]&&!state.revealed[q.id]&&!state.awarded[q.id]&&!state.buzzerAwards[q.id])return;go(state.index+1);};
if(!speed){$('#reveal').onclick=()=>{stop();state.revealed[q.id]=!revealed;if(state.revealed[q.id])state.unlocked[q.id]=true;save();redrawQuestion();};if(buzzer){
 const awardBuzzer=team=>{if(state.buzzerAwards[q.id])return;state.buzzerAwards[q.id]={team,points:r.points};state.unlocked[q.id]=true;score(team,r.points);redrawQuestion();};
 $('#awardBuzzerA').onclick=()=>awardBuzzer(0);$('#awardBuzzerB').onclick=()=>awardBuzzer(1);
 if($('#undoBuzzer'))$('#undoBuzzer').onclick=()=>{const award=state.buzzerAwards[q.id];if(!award)return;delete state.buzzerAwards[q.id];score(award.team,-award.points);redrawQuestion();};
}else{$('#award').onclick=()=>{if(state.awarded[q.id])return;state.awarded[q.id]=r.points;state.unlocked[q.id]=true;score(q.team,r.points);redrawQuestion();};if($('#undo'))$('#undo').onclick=()=>{const amount=state.awarded[q.id];delete state.awarded[q.id];score(q.team,-amount);redrawQuestion();};}}
}
function returnHome(){if($('#config').open)$('#config').close();go(-1);window.scrollTo({top:0,behavior:'smooth'});}
$('#home').onclick=e=>{e.preventDefault();returnHome();};$('#goHome').onclick=returnHome;$('#dialogHome').onclick=returnHome;document.querySelectorAll('[data-score]').forEach(btn=>btn.onclick=()=>score(...btn.dataset.score.split(',').map(Number)));$('#full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};$('#settings').onclick=()=>{stop();$('#teamA').value=state.names[0];$('#teamB').value=state.names[1];$('#membersA').value=(state.members[0]||[]).join('\n');$('#membersB').value=(state.members[1]||[]).join('\n');$('#audienceQuestion').value=state.audienceQuestion||DEFAULT_AUDIENCE_QUESTION;$('#audienceAnswer').value=state.audienceAnswer||DEFAULT_AUDIENCE_ANSWER;$('#editor').value=JSON.stringify(state.questions,null,2);$('#error').textContent='';$('#config').showModal();fitQuestion();};$('#close').onclick=()=>$('#config').close();$('#form').onsubmit=e=>{e.preventDefault();try{let qs=JSON.parse($('#editor').value);if(!Array.isArray(qs)||qs.length<4||new Set(qs.map(q=>q.id)).size!==qs.length||qs.some(q=>!q.id||typeof q.q!=='string'||typeof q.answer!=='string'||![0,1,2,3].includes(q.round)||(q.round===2?q.team!==null:![0,1].includes(q.team))||([q.image,q.contextImage].some(image=>image&&!/^assets\/[a-z0-9_.-]+$/i.test(image)))||(q.options&&(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options).size!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||q.options[q.correctIndex]!==q.answer)))||rounds.some((_,i)=>!qs.some(q=>q.round===i))||qs.filter(q=>q.round===2).length!==10)throw Error('پێکهاتە و ناسنامەیێن پرسیاران بپشکنە؛ پێدڤیە چار قۆناغ و دەه پرسیار د قۆناغا هەڤرکییا لەزاتیێ دا هەبن.');state.names=[$('#teamA').value.trim()||DEFAULT_TEAM_NAMES[0],$('#teamB').value.trim()||DEFAULT_TEAM_NAMES[1]];state.members=[$('#membersA').value,$('#membersB').value].map(value=>value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean).slice(0,30));state.audienceQuestion=$('#audienceQuestion').value.trim()||DEFAULT_AUDIENCE_QUESTION;state.audienceAnswer=$('#audienceAnswer').value.trim()||DEFAULT_AUDIENCE_ANSWER;state.questions=qs;state.index=Math.min(state.index,qs.length);state.choices={};save();$('#config').close();render();}catch(e){$('#error').textContent=e.message;}};$('#reset').onclick=()=>{if(confirm('دێ پێشبڕکییەکا نوو دەست پێ بکەی؟ خاڵ و پێشڤەچوون دێ بنە سفر، لێ پرسیار و ناڤ دێ پاراستی مینن.')){stop();state={...fresh(),names:state.names,members:structuredClone(state.members),questions:state.questions,sound:state.sound,audienceQuestion:state.audienceQuestion,audienceAnswer:state.audienceAnswer};save();$('#config').close();render();}};document.body.classList.add('viewport-fit');render();

var fitFrame;
function fitQuestion(){
 cancelAnimationFrame(fitFrame);
 fitFrame=requestAnimationFrame(fitViewportContent);
}
function fitViewportContent(){
 fitSettingsDialog();
 const frame=document.querySelector('.stage-viewport'),stage=$('#stage');
 if(!frame||!stage)return;
 document.body.classList.add('viewport-fit');
 document.body.classList.remove('presentation-fit','interlude-view');
 const width=frame.clientWidth,height=frame.clientHeight;
 if(width<1||height<1)return;
 // Measure the complete page at its responsive width before choosing a scale.
 const home=!!stage.querySelector(':scope > .hero');
 stage.style.height=home?height+'px':'auto';
 stage.style.width=width+'px';stage.style.transform='none';stage.style.left='0px';stage.style.top='0px';
 const naturalWidth=Math.max(width,stage.scrollWidth),naturalHeight=Math.max(stage.offsetHeight,stage.scrollHeight);
 const scale=Math.min(1,width/naturalWidth,height/Math.max(1,naturalHeight));
 stage.style.transform='scale('+scale+')';
 stage.style.left=Math.max(0,(width-naturalWidth*scale)/2)+'px';
 stage.style.top=(home?0:Math.max(0,(height-naturalHeight*scale)/2))+'px';
 frame.dataset.scale=scale.toFixed(4);
}
window.addEventListener('resize',fitQuestion);
document.addEventListener('fullscreenchange',fitQuestion);
document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)fitQuestion();},true);
document.fonts?.ready.then(fitQuestion);



// Refit after dynamic answers, score labels, images and fonts settle.
const stageFitObserver=new ResizeObserver(fitQuestion);
stageFitObserver.observe(document.querySelector('.stage-viewport'));
const contentFitObserver=new MutationObserver(fitQuestion);
contentFitObserver.observe(document.querySelector('#stage'),{childList:true,subtree:true,characterData:true});
document.fonts?.addEventListener('loadingdone',fitQuestion);
window.visualViewport?.addEventListener('resize',fitQuestion);

function fitSettingsDialog(){
 const dialog=$('#config'),form=$('#form');if(!dialog?.open||!form)return;
 const width=Math.min(1000,innerWidth*.96),padding=24;
 dialog.style.width=width+'px';dialog.style.height='auto';form.style.width=Math.max(1,width-padding)+'px';form.style.transform='none';
 const natural=Math.max(form.scrollHeight,form.offsetHeight);
 const scale=Math.min(1,(innerHeight*.94-padding)/Math.max(1,natural));
 form.style.transform='scale('+scale+')';form.style.transformOrigin='top left';
 dialog.style.width=((width-padding)*scale+padding)+'px';
 dialog.style.height=(natural*scale+padding)+'px';
}
document.querySelector('#config details').addEventListener('toggle',fitQuestion);
const settingsFitObserver=new MutationObserver(fitQuestion);
settingsFitObserver.observe(document.querySelector('#form'),{childList:true,subtree:true,characterData:true});

