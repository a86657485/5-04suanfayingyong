'use strict';
const galleryRulesModel=typeof module!=='undefined'&&module.exports?require('./gallery-model.cjs'):window.GalleryModel;

const activities=[
 {id:'A',title:'叶子侦探',detail:'拍照观察叶片，查找可能的植物名称。',tags:['植物','拍照','识别'],place:'植物馆'},
 {id:'B',title:'叶子拓印',detail:'用叶片纹理创作一幅画。',tags:['植物','手工'],place:'艺术屋'},
 {id:'C',title:'花园合影',detail:'在花墙前拍一张纪念照片。',tags:['拍照','花园'],place:'花园'},
 {id:'D',title:'彩纸动物',detail:'折出一只彩纸小动物。',tags:['手工','动物'],place:'艺术屋'},
 {id:'E',title:'小镇导览',detail:'了解游园地点与道路。',tags:['地图','路线'],place:'服务中心'},
 {id:'F',title:'鸟类观察',detail:'对照图片认识小鸟。',tags:['动物','识别'],place:'观察屋'}
];
const searchGuests=[
 {name:'小芽',wish:'想拍照认识植物，查找它叫什么。',target:'A'},
 {name:'阿木',wish:'想用叶片的纹理做一幅画。',target:'B'}
];
const navMissions=[
 {name:'赶演出的游客',goal:'fast',text:'希望尽快到达演出广场。',target:'B'},
 {name:'想慢慢走的游客',goal:'short',text:'希望少走一些路。',target:'A'},
 {name:'巡游期间的游客',goal:'fast',text:'中心路封闭了，仍希望尽快到达。',target:'C'},
 {name:'新来的游客',goal:'fast',text:'中心路恢复通行，但预计用时变为7分钟。哪条路最快？',target:'C'}
];
const recoMissions=[
 {name:'小禾',history:{S:3,T:1,U:0},wish:'按照过去记录推荐下一站。',target:'S'},
 {name:'小林',history:{S:0,T:1,U:3},wish:'按照过去记录推荐下一站。',target:'U'},
 {name:'小禾',history:{S:3,T:1,U:4},wish:'她最近又参加了4次艺术活动。先预测新的推荐。',target:'U'},
 {name:'小墨',history:{S:0,T:3,U:1},wish:'运动项目是替朋友查的；今天明确想参加科学探索。',target:'S'}
];
const dialogueScenes={
 search:[
  {npc:'小芽',line:'我想拍照认识植物，找到它可能叫什么。你能帮我找活动吗？',prompt:'向导先怎么回应？',choices:[{id:'check-need',text:'先查能识别植物的活动，再核对海报内容',reply:'对！我想知道植物名称，不只是拍一张照片。',correct:true},{id:'photo-only',text:'先带你去花园合影，拍照就算完成了',reply:'照片很漂亮，可我还是不知道植物叫什么。',correct:false}]},
  {npc:'阿木',line:'我想用叶片的纹理做一幅画。刚才小芽去的地方适合我吗？',prompt:'这次该换什么线索？',choices:[{id:'craft-match',text:'重新找植物和手工有关的活动',reply:'正好！我们的目标不同，搜索线索也要改变。',correct:true},{id:'reuse-recognition',text:'沿用刚才的植物识别活动',reply:'我想亲手做画，不是查叶子的名称。',correct:false}]}
 ],
 nav:[
  {npc:'赶演出的游客',line:'演出快开始了，我希望尽快到达广场。',prompt:'向导比较什么？',choices:[{id:'time',text:'比较可通行路线的预计用时',reply:'对，我最关心几分钟后能到。',correct:true},{id:'meters-only',text:'只比较哪条路的米数最少',reply:'最短的路有时需要更久，别忘了看时间。',correct:false}]},
  {npc:'想慢慢走的游客',line:'我不赶时间，但不想走太远。',prompt:'这次该比较什么？',choices:[{id:'distance',text:'比较步行距离，再选较短的路',reply:'谢谢，今天少走路更适合我。',correct:true},{id:'fast-again',text:'仍然只选预计用时最少的路',reply:'我不赶时间，最在意的是脚下要走多少米。',correct:false}]},
  {npc:'巡游期间的游客',line:'中心路被巡游围栏挡住了，我还想尽快到场。',prompt:'向导先处理哪个变化？',choices:[{id:'closed-first',text:'排除封闭道路，再比较预计用时',reply:'对，走不通的路再快也不能选。',correct:true},{id:'old-fast',text:'中心路原来最快，照原路线继续走',reply:'围栏就在前面，我们要重新规划。',correct:false}]},
  {npc:'新来的游客',line:'中心路已恢复，但现在预计要7分钟。我还是想尽快到场。',prompt:'向导如何决定？',choices:[{id:'recompare',text:'按新的时间再比较三条可通行路线',reply:'路况和预计时间变了，推荐也可能改变。',correct:true},{id:'old-time',text:'继续使用最初4分钟的中心路记录',reply:'那是旧时间，今天的路况要重新查看。',correct:false}]}
 ],
 reco:[
  {npc:'小禾',line:'我想找下一站。我的游园手册里留下了几次不同活动记录。',prompt:'推荐器会参考什么？',choices:[{id:'history',text:'先比较过去参加各类活动的记录',reply:'好，先看看记录会让哪类排在前面。',correct:true},{id:'random',text:'不用看记录，挑颜色最好看的活动',reply:'推荐器需要信息做依据，不能只看画面颜色。',correct:false}]},
  {npc:'小林',line:'我和小禾看到的是同一批活动，为什么推荐顺序不同？',prompt:'向导怎样解释？',choices:[{id:'different-history',text:'我们的过去体验记录不同',reply:'对，相同候选也可能排出不同顺序。',correct:true},{id:'different-seat',text:'因为我们站在不同的位置',reply:'先比较游园手册里的记录，再判断。',correct:false}]},
  {npc:'小禾',line:'我最近又参加了4次艺术活动。推荐器会重新排序吗？',prompt:'这次发生了什么变化？',choices:[{id:'changed-history',text:'艺术记录变了，重新计算推荐顺序',reply:'是的，我们只改变这一项再观察结果。',correct:true},{id:'unchanged',text:'只要候选活动不变，排序一定不变',reply:'我的记录也会影响排序，试着重新运行。',correct:false}]},
  {npc:'小墨',line:'运动活动是我替朋友查的。我今天明确想去科学探索。',prompt:'向导该怎样发邀请？',choices:[{id:'today-need',text:'考虑今天明确的需要，邀请去科学探索',reply:'谢谢！过去的记录只是建议。',correct:true},{id:'history-first',text:'不管今天的想法，只发历史排名第一的邀请',reply:'那是替朋友查的，不是我今天的计划。',correct:false}]}
 ]
};
const topics={
 plant:{label:'拍照识植物',input:'植物照片',action:'比对图像特征',benefit:'查找可能的植物名称'},
 translate:{label:'语言翻译',input:'另一种语言的文字',action:'分析并转换文字',benefit:'帮助理解文字意思'},
 sport:{label:'运动记录',input:'传感器记录的数据',action:'整理分析运动数据',benefit:'了解运动情况'}
};
const points={search:20,nav:20,reco:20,service:10};
function initialState(){return {search:{guest:0,terms:[],results:[],attempts:[],reason:'',done:false},nav:{phase:0,attempts:[],reason:'',done:false},reco:{phase:0,prediction:null,attempts:[],reason:'',done:false},service:{card:null,done:false},gallery:{records:{}},dialogue:{done:{search:{},nav:{},reco:{}},history:[]},hints:{search:0,nav:0,reco:0,service:0},last:{kind:'welcome',text:'欢迎来到奇趣游园会。请先帮小芽找活动。'}};}
function stageOf(state){if(!state.search.done)return 'search';if(!state.nav.done)return 'nav';if(!state.reco.done)return 'reco';if(!state.service.done)return 'service';return 'complete';}
function galleryUnlocked(state){return Object.keys(points).every(id=>state[id]?.done===true);}
function galleryProgress(state){
 const visited=galleryRulesModel.halls.filter(hall=>Array.isArray(state.gallery?.records?.[hall.id])&&state.gallery.records[hall.id].length>0).map(hall=>hall.id);
 return {visited,next:galleryRulesModel.halls.find(hall=>!visited.includes(hall.id))?.id??null,total:galleryRulesModel.halls.length};
}
function dialogueFor(state){
 if(!state.dialogue)return null;
 const stage=stageOf(state),phase=stage==='search'?state.search.guest:stage==='nav'?state.nav.phase:stage==='reco'?state.reco.phase:-1;
 const scene=dialogueScenes[stage]?.[phase];
 return scene?{...scene,stage,phase,done:!!state.dialogue.done?.[stage]?.[phase]}:null;
}
function searchResults(terms){
 const unique=[...new Set((Array.isArray(terms)?terms:[]).filter(x=>typeof x==='string'))];
 return activities.map(x=>({...x,score:unique.filter(term=>x.tags.includes(term)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
function routeChoices(phase){return [
 {id:'A',name:'河边路',meters:200,minutes:6,open:true},
 {id:'B',name:'中心路',meters:300,minutes:phase===3?7:4,open:phase!==2},
 {id:'C',name:'花园路',meters:400,minutes:5,open:true}
];}
function recommendation(phase){
 const mission=recoMissions[phase]||recoMissions.at(-1);
 const rank=['S','T','U'].sort((a,b)=>mission.history[b]-mission.history[a]||a.localeCompare(b));
 return {...mission,rank};
}
function step(current,action){
 const s=structuredClone(current), type=action?.type;
 const fail=text=>({state:{...s,last:{kind:'warn',text}},accepted:false});
 const ok=(text,extra={})=>({state:{...s,last:{kind:'ok',text,...extra}},accepted:true});
 if(typeof type!=='string')return fail('操作格式不正确。');
 if(type==='gallery/run'){
  if(!galleryUnlocked(s))return fail('请先完成找活动、带游客、懂你推荐和智慧服务四项主线任务，再进入体验馆。');
  const hall=galleryRulesModel.halls.find(x=>x.id===action.hall);
  if(!hall)return fail('这个体验馆不存在。');
  let output;
  try{output=galleryRulesModel.runDemo(hall.id,action.input);}catch(e){return fail(e.message);}
  s.gallery??={records:{}};
  const rows=s.gallery.records[hall.id]||[];
  rows.push({input:structuredClone(action.input),output,at:Date.now()});
  s.gallery.records[hall.id]=rows.slice(-8);
  return ok(`${hall.name}已运行。比较输入与结果，再试着改变一个条件。`);
 }
 if(type==='dialogue/choose'){
  const scene=dialogueFor(s),choice=scene?.choices.find(x=>x.id===action.id);
  if(!scene||scene.done||!choice)return fail('当前对话已结束，请继续游客委托。');
  s.dialogue.history.push({stage:scene.stage,phase:scene.phase,id:choice.id,correct:choice.correct});
  if(s.dialogue.history.length>80)s.dialogue.history.shift();
  if(choice.correct)s.dialogue.done[scene.stage][scene.phase]=true;
  return choice.correct?ok(choice.reply):fail(choice.reply);
 }
 if(type==='hint/use'){
  const stage=stageOf(s);
  if(!['search','nav','reco','service'].includes(stage)||!Number.isInteger(action.level)||action.level<1||action.level>3)return fail('当前没有可展开的帮助。');
  s.hints[stage]=Math.max(s.hints[stage]||0,action.level);
  return ok(`已展开第${action.level}级帮助。你可以继续尝试，不扣积分。`);
 }
 if(type.startsWith('search/')&&stageOf(s)==='search'){
  if(type==='search/query'){
   const terms=[...new Set((Array.isArray(action.terms)?action.terms:[]).filter(x=>['植物','拍照','识别','手工','动物','花园','地图','路线'].includes(x)))];
   if(!terms.length||terms.length>3)return fail('请选择1至3个线索词。');
   s.search.terms=terms;s.search.results=searchResults(terms).map(x=>x.id);
   return ok(`找到${s.search.results.length}张活动海报。请在右侧任务区向下滚动、打开内容，再决定送给游客哪一张。`);
  }
  if(type==='search/invite'){
   const item=activities.find(x=>x.id===action.id);
   if(!item||!s.search.results.includes(item.id))return fail('请先搜索，再从结果里选择一张活动海报。');
   const guest=searchGuests[s.search.guest],correct=item.id===guest.target;
   s.search.attempts.push({guest:s.search.guest,terms:[...s.search.terms],id:item.id,correct});
   if(s.search.attempts.length>80)s.search.attempts.shift();
   if(!correct){
    const feedback=guest.target==='A'?(item.id==='C'?'这里能合影，但小芽还是不知道植物叫什么。':'这个活动还没有同时满足“植物”和“认识名称”的需要。'):'阿木想做一幅叶片纹理画，这项活动还不符合他的愿望。';
    return fail(feedback);
   }
   s.search.guest++;
   s.search.terms=[];s.search.results=[];
   if(s.search.guest<searchGuests.length)return ok(`${guest.name}参加了${item.title}！下一位游客有不同的需要。`,{place:item.place});
   return ok('两位游客都找到了活动。再说说搜索工具是怎样帮你找的。',{place:item.place});
  }
  if(type==='search/reason'){
   if(s.search.guest<2)return fail('先帮助两位游客找到符合需要的活动。');
   if(!['匹配游客的需要并核对活动内容','优先选择搜索结果排在第一位的海报','优先选择画面颜色最吸引游客的海报'].includes(action.reason))return fail('请选择一项理由。');
   s.search.reason=action.reason;
   if(action.reason!=='匹配游客的需要并核对活动内容')return fail('还要核对海报内容是否回答游客的问题。');
   s.search.done=true;return ok('活动寻访完成！你使用线索缩小范围，也检查了活动内容。');
  }
 }
 if(type.startsWith('nav/')&&stageOf(s)==='nav'){
  if(type==='nav/reason'){
   if(s.nav.phase<4)return fail('先帮助四位游客按各自目标到达。');
   if(!['道路通行和预计用时改变，要按游客目标重选','因为河边风景最好，所以改走花园路','因为人物动画变慢，所以这条路肯定更快'].includes(action.reason))return fail('请选择一项理由。');
   s.nav.reason=action.reason;
   if(action.reason!=='道路通行和预计用时改变，要按游客目标重选')return fail('请想一想：任务目标、路况和预计时间分别起了什么作用？');
   s.nav.done=true;return ok('贴心带路完成！路线选择要结合目标和变化后的道路信息。');
  }
  if(type!=='nav/choose'||s.nav.phase>=4)return fail('四位游客已到达，请先说明为何换路。');
  const route=routeChoices(s.nav.phase).find(x=>x.id===action.route);
  if(!route)return fail('请选择地图上的一条路线。');
  const mission=navMissions[s.nav.phase];
  let reason='',correct=false;
  if(!route.open)reason='道路封闭';
  else if(route.id!==mission.target)reason=mission.goal==='fast'?'预计用时较长':'步行距离较长';
  else correct=true;
  s.nav.attempts.push({phase:s.nav.phase,route:route.id,correct,reason,meters:route.meters,minutes:route.minutes});
  if(s.nav.attempts.length>80)s.nav.attempts.shift();
  if(!correct){
   if(!route.open)return fail('中心路被巡游路障封闭，游客停在围栏前。请选仍可通行的路线。');
   return fail(`游客沿${route.name}到达：${route.meters}米，预计${route.minutes}分钟。这位游客希望${mission.goal==='fast'?'用时更少':'少走一些路'}，再比较地图上的同一列。`);
  }
  s.nav.phase++;
  return ok(s.nav.phase===4?'四位游客都到达广场。请说明：为什么路线会改变？':`沿${route.name}顺利到达：${route.meters}米，预计${route.minutes}分钟。下一位游客的条件有变化。`,{route:route.id});
 }
 if(type.startsWith('reco/')&&stageOf(s)==='reco'){
  const mission=recommendation(s.reco.phase);
  if(type==='reco/predict'){
   if(s.reco.phase>=4)return fail('邀请已经发出，请先说明推荐的作用。');
   if(!['S','T','U'].includes(action.id))return fail('请先预测一项活动。');
   s.reco.prediction=action.id;
   return ok(`推荐器按过去记录排出：${mission.rank.map(id=>({S:'科学探索',T:'运动挑战',U:'艺术工坊'})[id]).join('、')}。你预测的排在${mission.rank.indexOf(action.id)+1}位。现在给游客发邀请。`);
  }
  if(type==='reco/invite'){
   if(s.reco.phase>=4)return fail('邀请已发出，请先说明推荐该如何使用。');
   if(!s.reco.prediction)return fail('先预测推荐器会把哪项排在前面。');
   if(!['S','T','U'].includes(action.id))return fail('请选择一张邀请卡。');
   const correct=action.id===mission.target;
   s.reco.attempts.push({phase:s.reco.phase,prediction:s.reco.prediction,rank:[...mission.rank],invite:action.id,correct});
   if(s.reco.attempts.length>80)s.reco.attempts.shift();
   if(!correct)return fail(s.reco.phase===3?'小墨说今天想参加科学探索。过去的记录是替朋友查的，请按他现在的需要调整邀请。':'这张邀请与记录中最常参加的类别不一致。看看推荐顺序，再试一次。');
   s.reco.phase++;s.reco.prediction=null;
   return ok(s.reco.phase===4?'四位游客都收到了邀请。请说明推荐建议与当前需要的关系。':'游客收到了合适的邀请。下一位游客的记录不同。');
  }
  if(type==='reco/reason'){
   if(s.reco.phase<4)return fail('先完成四位游客的邀请。');
   if(!['历史记录提供建议，当前需要仍要由人判断','历史记录就是命令，游客必须接受排第一项','换了海报颜色，推荐顺序一定会自动改变'].includes(action.reason))return fail('请选择一项理由。');
   s.reco.reason=action.reason;
   if(action.reason!=='历史记录提供建议，当前需要仍要由人判断')return fail('过去记录只提供参考；游客今天明确说出的需要也要考虑。');
   s.reco.done=true;return ok('懂你推荐完成！你会把历史建议与游客当前需要一起考虑。');
  }
 }
 if(type==='service/submit'&&stageOf(s)==='service'){
  const expected=topics[action.topic];
  if(!expected||action.input!==expected.input||action.action!==expected.action||action.benefit!==expected.benefit)return fail('服务卡中的信息、算法帮助和游客收获还没有对应起来。请根据资料卡调整。');
  s.service.card={topic:action.topic,input:action.input,action:action.action,benefit:action.benefit,note:typeof action.note==='string'?action.note.trim().slice(0,120):'',submittedAt:Date.now()};
  s.service.done=true;return ok('智慧服务亭开张！服务卡已提交，教师可以查看并给出反馈。');
 }
 return fail('请先完成当前游客的委托。');
}
const api={activities,searchGuests,navMissions,recoMissions,topics,points,dialogueScenes,dialogueFor,initialState,stageOf,galleryUnlocked,galleryProgress,searchResults,routeChoices,recommendation,step};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.GameRules=api;
