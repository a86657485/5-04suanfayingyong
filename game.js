'use strict';
const R=window.GameRules,$=id=>document.getElementById(id);
const titles={search:'寻找合适的活动',nav:'带游客赶上演出',reco:'推荐游园下一站',service:'开办智慧服务亭',complete:'向导结业回访'};
const tabs=[['search','找活动'],['nav','带游客'],['reco','推荐下一站'],['service','我的服务亭']];
const hints={search:['回看游客手里的线索和他说的愿望。','想一想：是拍照留念，还是通过照片认识植物？','先试“植物＋识别”，再打开海报核对活动内容。'],nav:['游客这次最看重什么？','先排除走不了的路，再比较同一列数据。','“尽快”比较分钟；“少走路”比较米。'],reco:['比较不同游客过去参加过哪些项目。','过去记录能提供建议，但游客今天说的话也很重要。','先看哪类记录最多；如果游客明确提出新需求，按当前需求调整。'],service:['先看服务亭要帮助谁。','信息、算法处理和游客获得的帮助要连起来。','打开下方资料卡，逐项匹配同一服务主题。']};
let state=null,student=null,awards=[],activityPoints=0,viewStage='search',queue=[],syncing=false,exitData=null,exitResult=null,serviceDraft=null;
let cacheKey='',walker=null,navRun=0,lastRenderedKey='';
const pageEventPrefix=`festival-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
let pageEventCount=0;
function nextEventId(){return `${pageEventPrefix}-${++pageEventCount}-${Math.random().toString(36).slice(2)}`;}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const post=(path,body)=>fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function stagePhase(s,stage){return stage==='search'?s.search.guest:stage==='nav'?s.nav.phase:stage==='reco'?s.reco.phase:0;}
function cache(){if(!cacheKey)return;localStorage.setItem(cacheKey,JSON.stringify({state,queue,serviceDraft,walkPosition:walker?.position(),at:Date.now()}));}
function saveStatus(text,pending=false){$('save-status').textContent=text;$('save-status').classList.toggle('pending',pending);}
async function flush(){
 if(syncing||!queue.length)return;
 syncing=true;saveStatus(`待同步 ${queue.length} 步`,true);
 try{
  while(queue.length){
   const first=queue[0],r=await post('/api/action',first),data=await r.json();
   if(!r.ok){if(r.status===409)throw Error('另一设备已有更新。请导出本机记录后刷新核对。');throw Error(data.error||'同步失败');}
   queue.shift();awards=data.awards;activityPoints=data.points;
   if(!queue.length){state=data.state;if(!viewStage.startsWith('hall:')&&R.stageOf(state)!=='complete')viewStage=R.stageOf(state);}
   cache();
  }
  saveStatus('已保存到课堂');
  if(viewStage.startsWith('hall:'))$('points-pill').textContent=`印章积分 ${activityPoints}`;
  else render();
 }catch(e){saveStatus(`待同步 ${queue.length} 步`,true);$('feedback').textContent=e.message;$('feedback').classList.add('warn');}
 finally{syncing=false;}
}
function send(action){
 const stage=R.stageOf(state),expected={stage,phase:stagePhase(state,stage)};
 const attemptsBefore=stage==='search'?state.search.attempts.length:stage==='nav'?state.nav.attempts.length:stage==='reco'?state.reco.attempts.length:0;
 const result=R.step(state,action);state=result.state;
 if(action.type==='service/submit'&&state.service.done)serviceDraft=null;
 const eventId=nextEventId();queue.push({eventId,expected,action});
 if(stage!==R.stageOf(state))viewStage=R.stageOf(state);
 cache();render();flush();
 const attemptsAfter=stage==='search'?state.search.attempts.length:stage==='nav'?state.nav.attempts.length:stage==='reco'?state.reco.attempts.length:0;
 if(attemptsAfter>attemptsBefore){
  if(action.type==='search/invite'||action.type==='reco/invite')visitPlace(action.id,action.type);
 }
}
function guideVisitor(route){
 const phase=state.nav.phase,closed=phase===2,blocked=!R.routeChoices(phase).find(x=>x.id===route)?.open,token=++navRun;
 $('feedback').textContent=blocked?'向导正在带游客走向中心路，看看围栏前会发生什么。':'向导正在沿这条路带游客前进；途中可以改选路线。';
 $('feedback').classList.remove('warn');
 walker.followNamedRoute(route,closed).then(result=>{
  if(result.arrived&&token===navRun&&R.stageOf(state)==='nav'&&state.nav.phase===phase)send({type:'nav/choose',route});
 });
}
function visitPlace(id,type){
 const locations=type==='search/invite'?{A:'greenhouse',B:'recommendation',C:'plaza',D:'recommendation',E:'notice',F:'greenhouse'}:{S:'greenhouse',T:'plaza',U:'recommendation'};
 const place=locations[id];if(place)walker.moveTo(WalkMap.landmarks[place],R.stageOf(state)==='nav'&&state.nav.phase===2);
}
function updateMap(stage){
 $('booth-asset').hidden=!['service','complete'].includes(stage);
 const boothTopic=state.service.card?.topic||serviceDraft?.topic,boothBadge=$('booth-badge');
 boothBadge.hidden=!boothTopic||!['service','complete'].includes(stage);
 if(boothTopic)boothBadge.textContent=R.topics[boothTopic]?.label||'';
 $('barrier').hidden=!(R.stageOf(state)==='nav'&&state.nav.phase===2);
 $('route-layer').replaceChildren();
 document.querySelectorAll('.hotspot').forEach(b=>{const st=b.dataset.stage;b.classList.toggle('active',st===stage);b.classList.toggle('done',!!state[st]?.done);b.classList.toggle('locked',st!==R.stageOf(state)&&!state[st]?.done);});
 document.querySelectorAll('.hall-hotspot').forEach(b=>b.classList.toggle('active',stage===`hall:${b.dataset.hall}`));
 const scene=stage===R.stageOf(state)?R.dialogueFor(state):null;
 $('scene-speech').hidden=!scene||scene.done;
 if(scene&&!scene.done)$('scene-speech').textContent=`${scene.npc}：${scene.line}`;
}
function renderHints(stage){
 const box=$('hint-content');if(!hints[stage]){$('hint-panel').hidden=true;return;}
 $('hint-panel').hidden=false;
 const used=state.hints?.[stage]||0;
 box.innerHTML=hints[stage].map((hint,i)=>i<used?`<p><strong>第${i+1}级：</strong>${esc(hint)}</p>`:`<button class="hint-button" data-action="hint" data-level="${i+1}">展开第${i+1}级帮助</button>`).join('');
}
function render(){
 if(!state)return;
 const current=R.stageOf(state),galleryView=viewStage.startsWith('hall:');
 if(!galleryView&&viewStage!==current&&!state[viewStage]?.done)viewStage=current;
 const stage=viewStage;
 const hallId=galleryView?stage.slice(5):null;
 const hall=hallId==='hub'?null:window.GalleryModel.halls.find(x=>x.id===hallId);
 $('student-name').textContent=`${student.classId}班 · ${student.name}`;
 $('points-pill').textContent=`印章积分 ${activityPoints}`;
 $('map-title').textContent=galleryView?(hall?.name||'自由探索体验馆'):titles[stage];
 $('stage-count').textContent=galleryView?'选做体验':stage==='complete'?'完成主线':`${tabs.findIndex(x=>x[0]===stage)+1} / 4`;
 $('mission-eyebrow').textContent=galleryView?'算法应用体验':stage==='complete'?'向导结业':'游客委托';
 $('mission-title').textContent=galleryView?(hall?.name||'自由探索体验馆'):titles[stage];
 $('stage-tabs').innerHTML=tabs.map(([id,label],i)=>`<button class="stage-tab ${id===stage?'current':''} ${state[id]?.done?'done':''}" data-stage="${id}" ${!state[id]?.done&&current!==id?'disabled':''}>${state[id]?.done?'✓ ':''}${i+1}. ${label}</button>`).join('')+(current==='complete'?'<button class="stage-tab" data-stage="complete">结业回访</button>':'')+`<button class="stage-tab ${galleryView?'current':''}" data-hall="hub">自由探索体验馆</button>`;
 $('feedback').textContent=state.last?.text||'看看游客的需求，再作出决定。';
 $('feedback').classList.toggle('warn',state.last?.kind==='warn');
 if(galleryView)renderGallery(hallId);
 else if(stage!==current&&state[stage]?.done){renderReview(stage);}
 else if(R.dialogueFor(state)&&!R.dialogueFor(state).done)renderDialogue(R.dialogueFor(state));
 else if(stage==='search')renderSearch();else if(stage==='nav')renderNav();else if(stage==='reco')renderReco();else if(stage==='service')renderService();else renderComplete();
 renderHints(stage);updateMap(stage);
 $('hint-panel').hidden=galleryView;
 const scene=R.dialogueFor(state),phase=stage==='search'?state.search.guest:stage==='nav'?state.nav.phase:stage==='reco'?state.reco.phase:0;
 const viewKey=`${stage}:${phase}:${scene&&!scene.done&&stage===current?'dialogue':'task'}`;
 if(viewKey!==lastRenderedKey)$('mission-content').scrollTop=0;
 if(viewKey!==lastRenderedKey&&!galleryView&&scene&&!scene.done)$('feedback').textContent=`${scene.npc}在等你回应。先听他的需要，再决定下一步。`;
 lastRenderedKey=viewKey;
}
function renderGallery(hallId){
 if(hallId==='hub'){
  $('mission-intro').textContent='走进不同馆，亲手改变信息与条件，观察算法输出。选做馆不影响本课主线完成。';
  $('mission-content').innerHTML=`<div class="gallery-hub">${window.GalleryModel.halls.map(hall=>{const count=state.gallery?.records?.[hall.id]?.length||0;return `<div class="gallery-card"><strong>${esc(hall.name)}</strong><p>${esc(hall.short)}</p><small>${count?`已运行${count}次`:'尚未体验'}</small><button class="secondary-button" data-hall="${hall.id}">走进${esc(hall.name)}</button></div>`;}).join('')}</div>`;
  return;
 }
 const hall=window.GalleryModel.halls.find(x=>x.id===hallId),records=state.gallery?.records?.[hallId]||[];
 $('mission-intro').textContent=`${hall.place} · ${hall.short}。每次只改一个条件，更容易看清结果为什么变化。`;
 $('mission-content').innerHTML=window.GalleryUI.renderHall(hallId,records);
 window.GalleryUI.afterRender(hallId,records.at(-1));
}
function renderDialogue(scene){
 $('mission-intro').textContent='先听游客说，再决定如何帮助他。你的回应会决定接下来要观察什么。';
 $('mission-content').innerHTML=`<div class="dialogue-card"><div class="dialogue-person"><img src="/assets/visitor.webp" alt="游客"><span>${esc(scene.npc)} · 第${scene.phase+1}段委托</span></div><p class="dialogue-bubble">${esc(scene.line)}</p><p class="dialogue-prompt">向导：${esc(scene.prompt)}</p><div class="reason-list">${scene.choices.map(choice=>`<button class="choice" data-action="dialogue-choice" data-id="${esc(choice.id)}">${esc(choice.text)}</button>`).join('')}</div></div><p class="small-note">选择后看游客的回应；如果没听准他的需要，可以修改想法。</p>`;
}
function renderReview(stage){
 $('mission-intro').textContent='这段委托已经完成。回看你的第一次尝试和最终结果。';
 const attempts=state[stage].attempts||[];
 $('mission-content').innerHTML=`<div class="completed-review"><strong>已获得：${esc(tabs.find(x=>x[0]===stage)?.[1])}印章</strong><ul>${attempts.slice(-6).map(x=>`<li>${stage==='search'?`第${x.guest+1}位游客：${esc(x.id)}，${x.correct?'符合需要':'需要调整'}`:stage==='nav'?`第${x.phase+1}次带路：${esc(x.route)}，${x.correct?'符合目标':esc(x.reason)}`:`第${x.phase+1}次推荐：${esc(x.invite)}，${x.correct?'符合需要':'需要调整'}`}</li>`).join('')||'<li>服务卡已提交，等待教师查看。</li>'}</ul><button class="primary-button next-button" data-action="current">继续当前委托</button></div>`;
}
function renderSearch(){
 const s=state.search,g=R.searchGuests[Math.min(s.guest,1)];
 $('mission-intro').textContent='先找线索，再查看海报内容。只看排在前面的海报还不够。';
 if(s.guest>=2){$('mission-content').innerHTML=`<div class="visitor-note">两位游客都找到了活动。搜索工具怎样帮到了你？</div><div class="reason-list">${['匹配游客的需要并核对活动内容','优先选择搜索结果排在第一位的海报','优先选择画面颜色最吸引游客的海报'].map(x=>`<button class="choice" data-action="search-reason" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;return;}
 $('mission-content').innerHTML=`<div class="visitor-note">${esc(g.name)}：${esc(g.wish)}</div><h3 class="mission-section-title">从观察本里挑线索</h3><div class="choice-grid" id="term-choices">${['植物','拍照','识别','手工','动物','花园','地图','路线'].map(x=>`<label class="choice ${s.terms.includes(x)?'selected':''}"><input type="checkbox" value="${x}" ${s.terms.includes(x)?'checked':''}> ${x}</label>`).join('')}</div><button class="primary-button" data-action="search-query">寻找活动海报</button>${s.results.length?`<h3 class="mission-section-title">找到的海报 · 请打开看看</h3><div class="result-list">${s.results.map(id=>{const a=R.activities.find(x=>x.id===id);return `<details class="result-card"><summary><strong>${esc(a.title)}</strong><small>匹配线索：${a.tags.filter(t=>s.terms.includes(t)).join('、')}</small></summary><p>${esc(a.detail)}</p><button class="secondary-button" data-action="search-invite" data-id="${id}">邀请${esc(g.name)}参加</button></details>`;}).join('')}</div>`:''}`;
}
function renderNav(){
 if(state.nav.phase>=4){$('mission-intro').textContent='四次带路已经完成。请根据实际变化解释为什么要重新选路。';$('mission-content').innerHTML=`<div class="visitor-note">中心路封闭又恢复，预计用时也变了。你为什么改变路线？</div><div class="reason-list">${['道路通行和预计用时改变，要按游客目标重选','因为河边风景最好，所以改走花园路','因为人物动画变慢，所以这条路肯定更快'].map(x=>`<button class="choice" data-action="nav-reason" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;return;}
 const phase=Math.min(state.nav.phase,3),mission=R.navMissions[phase],routes=R.routeChoices(phase);
 $('mission-intro').textContent='按游客这次的目标和地图信息选路。出发后看角色实际走到哪里。';
 $('mission-content').innerHTML=`<div class="visitor-note">${esc(mission.name)}：${esc(mission.text)}</div><p class="small-note">三条路的起点、终点相同。数据是教学模拟；地图上可以看见封路状态。</p><div class="route-legend"><span><i class="route-dot route-a"></i>A 橙色河边路</span><span><i class="route-dot route-b"></i>B 青色中心路</span><span><i class="route-dot route-c"></i>C 紫色花园路</span></div><div class="route-list">${routes.map(r=>`<div class="route-card ${r.open?'':'closed'}"><strong>${r.id} · ${esc(r.name)} ${r.open?'':'🚧 暂时封闭'}</strong><p>${r.meters}米 · 预计${r.minutes}分钟</p><button class="secondary-button" data-action="nav-choose" data-route="${r.id}">带游客走这条路</button></div>`).join('')}</div><p class="small-note">先到达不代表最符合游客的要求，看看路程与时间哪一列重要。</p>`;
}
function renderReco(){
 if(state.reco.phase>=4){$('mission-intro').textContent='回想最后一位游客的委托：推荐器排第一的项目未必符合他今天的需要。';$('mission-content').innerHTML=`<div class="visitor-note">小墨过去查了运动项目，却想参加科学探索。应该怎样理解推荐？</div><div class="reason-list">${['历史记录提供建议，当前需要仍要由人判断','历史记录就是命令，游客必须接受排第一项','换了海报颜色，推荐顺序一定会自动改变'].map(x=>`<button class="choice" data-action="reco-reason" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;return;}
 const phase=Math.min(state.reco.phase,3),mission=R.recommendation(phase),labels={S:'科学探索',T:'运动挑战',U:'艺术工坊'};
 $('mission-intro').textContent='推荐器参考过去记录排序，邀请还要符合游客现在的需要。';
 $('mission-content').innerHTML=`<div class="visitor-note">${esc(mission.name)}：${esc(mission.wish)}</div><h3 class="mission-section-title">游客手册 · 过去的体验</h3><div class="history-bars">${Object.entries(labels).map(([id,label])=>`<div class="history-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${mission.history[id]*20}%"></div></div><strong>${mission.history[id]}次</strong></div>`).join('')}</div>${state.reco.prediction?`<div class="rank-box">推荐器排序：${mission.rank.map(id=>labels[id]).join(' → ')}<br><small>你预测的是：${labels[state.reco.prediction]}</small></div><h3 class="mission-section-title">现在把哪张邀请交给游客？</h3><div class="choice-grid">${Object.entries(labels).map(([id,label])=>`<button class="choice" data-action="reco-invite" data-id="${id}">${label}</button>`).join('')}</div>`:`<h3 class="mission-section-title">先预测：推荐器会把哪项排第一？</h3><div class="choice-grid">${Object.entries(labels).map(([id,label])=>`<button class="choice" data-action="reco-predict" data-id="${id}">${label}</button>`).join('')}</div>`}`;
}
function renderService(){
 $('mission-intro').textContent='选一个主题，把信息、算法的帮助和游客的收获连起来。';
 const topics=R.topics,entries=Object.entries(topics);
 $('mission-content').innerHTML=`<div class="service-preview"><img src="/assets/service-booth.webp" alt="智慧服务亭"><p><strong>你的服务亭即将开张</strong><br>主题会改变服务说明和游客委托。</p></div><form id="service-form" class="service-form"><label for="service-topic">我想开办的服务</label><select id="service-topic"><option value="">选择主题</option>${entries.map(([id,t])=>`<option value="${id}">${t.label}</option>`).join('')}</select><div id="service-source" class="small-note">选择主题后可查看游客资料卡。</div><label for="service-input">可以使用什么信息？</label><select id="service-input"><option value="">请选择</option>${['plant','sport','translate'].map(id=>`<option>${topics[id].input}</option>`).join('')}</select><label for="service-action">算法帮助做什么？</label><select id="service-action"><option value="">请选择</option>${['translate','plant','sport'].map(id=>`<option>${topics[id].action}</option>`).join('')}</select><label for="service-benefit">游客因此得到什么帮助？</label><select id="service-benefit"><option value="">请选择</option>${['sport','translate','plant'].map(id=>`<option>${topics[id].benefit}</option>`).join('')}</select><label for="service-note">我想补充一句（选填）</label><textarea id="service-note" maxlength="120" placeholder="例如：候选结果还需要查资料核对。"></textarea><button class="primary-button full" type="submit">让服务亭开张</button></form><p class="small-note">提交后教师可查看服务卡；开放表达由教师反馈。</p>`;
 if(serviceDraft){for(const [key,id]of [['topic','service-topic'],['input','service-input'],['action','service-action'],['benefit','service-benefit'],['note','service-note']])$(id).value=serviceDraft[key]||'';const topic=topics[serviceDraft.topic];if(topic)$('service-source').textContent=`游客资料：${topic.label}可以利用“${topic.input}”，给出供人判断的结果。请把三部分连起来。`;}
}
async function loadExit(){if(exitData)return;try{const r=await fetch('/api/exit');if(r.ok){exitData=await r.json();render();}}catch{}}
function renderComplete(){
 $('mission-intro').textContent='三个游客委托和服务卡已完成。现在独立完成四项回访，看看换个情境会怎么做。';
 const earned=new Set(awards.map(x=>x.stage));
 $('mission-content').innerHTML=`<div class="stamp-row">${[['search','活动寻访'],['nav','贴心带路'],['reco','懂你推荐'],['service','服务亭开张']].map(([id,label])=>`<span class="stamp ${earned.has(id)?'earned':''}">${earned.has(id)?'✓ ':''}${label}</span>`).join('')}</div><p>活动积分：<strong>${activityPoints}</strong>。四项回访和20题考核另行记录。</p>${!exitData?'<p>正在加载结业回访…</p>':`<form id="exit-form"><p class="small-note">本次为${exitData.form}卷；如果订正后再检验，会换一组情境。</p>${exitData.questions.map((q,i)=>`<fieldset class="exit-question"><legend>${i+1}. ${esc(q.stem)}</legend>${q.options.map((opt,j)=>`<label><input type="radio" name="${q.id}" value="${j}"> ${esc(opt)}</label>`).join('')}</fieldset>`).join('')}<button class="primary-button" type="submit">提交四项回访</button></form>`}${exitResult?`<div class="rank-box">本次回访 ${exitResult.score}分。${exitResult.results.map((x,i)=>`<p>第${i+1}项：${x.correct?'正确':'再想想'}。${esc(x.explanation)}</p>`).join('')}</div>`:''}<p class="small-note">课后或下一课可完成20题完整考核；本节作品与记录现在就能保存。</p><a class="secondary-button" href="/quiz">进入20题完整考核</a>`;
 if(!exitData)loadExit();
}
function exportRecord(){
 const payload={student,exportedAt:new Date().toISOString(),state,awards,points:activityPoints,walkPosition:walker?.position(),pendingActions:queue};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`奇趣游园会-${student.classId}-${student.name}-学习记录.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function setupWalker(local){
 const candidate=local?.walkPosition,grid=WalkMap.makeGrid(R.stageOf(state)==='nav'&&state.nav.phase===2);
 const start=WalkMap.nearestWalkable(candidate,grid,5)||WalkMap.landmarks.entrance;
 walker=WalkEngine.create({scene:$('map-scene'),guide:$('guide-avatar'),visitor:$('visitor-avatar'),marker:$('walk-marker'),start,onPosition:cache});
}
async function init(){
 const cachedStudent=JSON.parse(localStorage.getItem('festival-current')||'null');
 try{
  const r=await fetch('/api/state');if(!r.ok)throw Error('登录已过期');const data=await r.json();student=data.student;activityPoints=data.points;awards=data.awards;
  cacheKey=`festival-cache-${student.id}`;const local=JSON.parse(localStorage.getItem(cacheKey)||'null');queue=Array.isArray(local?.queue)?local.queue:[];serviceDraft=local?.serviceDraft||null;
  state=queue.length&&local?.state?local.state:data.state;
  setupWalker(local);viewStage=R.stageOf(state);saveStatus(queue.length?`待同步 ${queue.length} 步`:'已连接课堂',!!queue.length);render();if(queue.length)flush();
 }catch(e){
  if(!cachedStudent){location.href='/';return;}
  student=cachedStudent;cacheKey=`festival-cache-${student.id}`;
  const local=JSON.parse(localStorage.getItem(cacheKey)||'null');if(!local?.state){location.href='/';return;}
  state=local.state;queue=local.queue||[];serviceDraft=local.serviceDraft||null;setupWalker(local);viewStage=R.stageOf(state);saveStatus('离线 · 待同步',true);render();
 }
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action],[data-stage],[data-hall]');if(!b)return;
 if(b.dataset.hall){
  const id=b.dataset.hall;
  if(id==='hub'){viewStage='hall:hub';render();return;}
  const hall=window.GalleryModel.halls.find(x=>x.id===id);if(!hall)return;
  walker.moveTo(WalkMap.landmarks[hall.landmark],R.stageOf(state)==='nav'&&state.nav.phase===2).then(result=>{if(result.arrived){viewStage=`hall:${id}`;render();}});
  return;
 }
 if(b.dataset.stage){const st=b.dataset.stage,current=R.stageOf(state);if(st===current||state[st]?.done||st==='complete'&&current==='complete'){
   if(b.classList.contains('hotspot')){
    const destination=WalkMap.landmarks[st==='search'?'notice':st==='nav'?'plaza':st==='reco'?'recommendation':'service'];
    walker.moveTo(destination,current==='nav'&&state.nav.phase===2).then(result=>{if(result.arrived){viewStage=st;render();}});
   }else{viewStage=st;render();}
  }else{$('feedback').textContent='先完成当前游客的委托，再前往这个地点。';$('feedback').classList.add('warn');}return;}
 const action=b.dataset.action;
 if(action==='search-query'){const terms=[...document.querySelectorAll('#term-choices input:checked')].map(x=>x.value);send({type:'search/query',terms});}
 else if(action==='dialogue-choice')send({type:'dialogue/choose',id:b.dataset.id});
 else if(action==='search-invite')send({type:'search/invite',id:b.dataset.id});
 else if(action==='search-reason')send({type:'search/reason',reason:b.dataset.value});
 else if(action==='nav-choose')guideVisitor(b.dataset.route);
 else if(action==='nav-reason')send({type:'nav/reason',reason:b.dataset.value});
 else if(action==='reco-predict')send({type:'reco/predict',id:b.dataset.id});
 else if(action==='reco-invite')send({type:'reco/invite',id:b.dataset.id});
 else if(action==='reco-reason')send({type:'reco/reason',reason:b.dataset.value});
 else if(action==='hint')send({type:'hint/use',level:Number(b.dataset.level)});
 else if(action==='current'){viewStage=R.stageOf(state);render();}
});
$('map-scene').addEventListener('click',event=>{
 if(!state||!walker||event.target.closest('.hotspot,.hall-hotspot,.scene-speech'))return;
 navRun++;
 walker.clickToMove(event,R.stageOf(state)==='nav'&&state.nav.phase===2).then(result=>{
  if(result.unreachable){$('feedback').textContent='这里是建筑或草地，向导只能沿小镇道路前进。请点道路或活动地点。';$('feedback').classList.add('warn');}
 });
});
document.addEventListener('submit',async event=>{
 if(event.target.id==='gallery-form'){
  event.preventDefault();const hall=event.target.dataset.hallId;
  send({type:'gallery/run',hall,input:window.GalleryUI.readInput(hall)});
 }
 if(event.target.id==='service-form'){
  event.preventDefault();serviceDraft={topic:$('service-topic').value,input:$('service-input').value,action:$('service-action').value,benefit:$('service-benefit').value,note:$('service-note').value};send({type:'service/submit',...serviceDraft});
 }
 if(event.target.id==='exit-form'){
  event.preventDefault();const answers={};for(const q of exitData.questions){const v=document.querySelector(`input[name="${q.id}"]:checked`);if(v)answers[q.id]=Number(v.value);}
  try{const r=await post('/api/exit/submit',{answers}),data=await r.json();if(!r.ok)throw Error(data.error||'请检查作答');exitResult=data;exitData=null;await loadExit();render();}
  catch(e){$('feedback').textContent=e.message;$('feedback').classList.add('warn');}
 }
});
document.addEventListener('change',event=>{if(event.target.id==='service-topic'){const t=R.topics[event.target.value];$('service-source').textContent=t?`游客资料：${t.label}可以利用“${t.input}”，给出供人判断的结果。请把三部分连起来。`:'选择主题后可查看游客资料卡。';$('booth-badge').hidden=!t;if(t)$('booth-badge').textContent=t.label;}if(event.target.closest('#service-form')){serviceDraft={topic:$('service-topic').value,input:$('service-input').value,action:$('service-action').value,benefit:$('service-benefit').value,note:$('service-note').value};cache();}});
document.addEventListener('input',event=>{if(event.target.classList.contains('gallery-range')){const out=$(event.target.dataset.output);if(out)out.value=event.target.value;}});
document.addEventListener('input',event=>{if(event.target.id==='service-note'){serviceDraft={topic:$('service-topic').value,input:$('service-input').value,action:$('service-action').value,benefit:$('service-benefit').value,note:$('service-note').value};cache();}});
$('export-record').addEventListener('click',exportRecord);
$('switch-student').addEventListener('click',async()=>{if(queue.length&&!confirm('本机还有待同步记录。请先导出当前记录再切换。仍要切换吗？'))return;try{await post('/api/logout',{});}catch{}localStorage.removeItem('festival-current');location.href='/';});
window.addEventListener('online',()=>{if(queue.length)flush();else saveStatus('已连接课堂');});
window.addEventListener('offline',()=>saveStatus(`离线 · 待同步 ${queue.length} 步`,true));
const mapImage=document.querySelector('.map-image');
mapImage.addEventListener('error',()=>{mapImage.hidden=true;});
if(mapImage.complete&&!mapImage.naturalWidth)mapImage.hidden=true;
init();
