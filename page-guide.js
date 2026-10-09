(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document)root.PageGuide=api.mount(root.document);
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const guides={
  login:{title:'领取你的游园向导证',background:'游园会来了几位需要帮助的游客。你将成为小向导，体验算法怎样帮人寻找活动、选择路线和提供服务。',steps:['先选择自己的班级，再查找或选择姓名。','核对下方显示的班级和姓名；名单中没有自己时，再使用手动填写。','点击“领取向导证，进入小镇”，听游客的委托后开始任务。']},
  search:{title:'帮游客找到合适的活动',background:'游客带着不同的兴趣来到游园会。活动海报很多，请用搜索工具寻找线索，帮他们找到符合需要的活动。',steps:['听清游客想做什么，从观察本里挑选搜索线索。','点击“寻找活动海报”，打开找到的海报，核对活动内容。','邀请游客参加合适的活动，再根据反馈调整选择。']},
  nav:{title:'带游客走一条合适的路',background:'有的游客赶时间，有的游客想少走路，道路情况还可能变化。请根据这一次的目标，判断怎样带路更合适。',steps:['先读游客的要求，分清这次关注路程还是用时。','比较各条路的米数、预计分钟数和是否可以通行。','选择路线带游客出发；条件变化后重新比较，并说明理由。']},
  reco:{title:'推荐也要听懂今天的需要',background:'推荐器会参考游客过去的体验记录。请观察它怎样排序，再判断这份建议是否符合游客今天的需要。',steps:['读游客的委托，观察过去各类活动的体验次数。','先预测推荐器会把哪项排在前面，再查看推荐顺序。','核对游客当前需要，选择邀请；根据反馈继续判断。']},
  service:{title:'让你的智慧服务亭开张',background:'你已经体验了几种算法应用。现在请为游客设计一项服务，把“使用什么信息、怎样处理、提供什么帮助”连起来。',steps:['选择服务主题，阅读对应的游客资料。','为这个主题匹配信息、算法处理和得到的帮助。','可补充一句哪些结果需要人核对，再点击“让服务亭开张”。']},
  complete:{title:'主线完成，体验馆开放啦',background:'你已经帮助游客完成委托，智慧服务亭也开张了。六座体验馆现在开放，继续发现算法在不同领域的作用。',steps:['点击“开始探索”或“查看全部体验馆”，选择一座馆。','先看科学原理图，再运行体验；成功运行后会提示下一座未体验的馆。','按老师安排完成四项回访并导出记录；20题完整考核另行安排。']},
  'hall:hub':{title:'选择一个算法应用馆',background:'四段主线任务已经完成。算法还能帮助人们识别图片、翻译文字、购物、运动、创作和查看影像，一起到不同的馆看看。',steps:['选择标有“建议下一馆”的地点，也可以先选感兴趣的馆。','先读科学原理图，再进入体验，观察“信息—处理—结果”。','成功运行后按提示前往下一馆；已体验的馆还可以回来比较。']},
  'hall:recognition':{title:'图像识别馆 · 从特征找线索',background:'游客拍到了不认识的叶片。识别工具可以根据特征给出候选结果，帮助人们查找资料，候选仍需要核对。',steps:['先看馆长介绍，了解图片特征怎样帮助识别。','进入体验，选一张照片，观察形状和颜色后选择特征。','点击“看识别候选”；换照片或特征再比较，并核对候选依据。']},
  'hall:translation':{title:'翻译馆 · 帮游客读懂标牌',background:'有的游客看不懂游园会的标牌。翻译工具可以处理文字、转换语言，帮助人们理解信息。',steps:['先看应用介绍，观察原句与转换结果的关系。','进入体验，选择一句标牌文字，点击“看翻译过程”。','换一句再比较，观察词句怎样转换，重要信息还要核对。']},
  'hall:shopping':{title:'购物馆 · 商品为什么这样排序',background:'网上商店会参考浏览记录推荐商品。不同的信息可能带来不同的排序，但建议还需要结合人的真实需要。',steps:['先看应用介绍，了解浏览记录和推荐结果的联系。','进入体验，选一份浏览记录，点击“看推荐顺序”。','换一份记录再比较：哪项排在前面，为什么发生变化？']},
  'hall:sports':{title:'运动馆 · 从读数中发现运动',background:'运动设备可以记录连续的读数，再按规则统计运动情况。这里用一组模拟读数，体验算法怎样找到运动峰值。',steps:['先看介绍，认识连续读数、峰值和计数的关系。','进入体验，拖动阈值滑块，点击“数一数运动”。','保持读数不变，换一个阈值再运行，比较次数为什么变化。']},
  'hall:art':{title:'艺术馆 · 让图片产生新效果',background:'数字图片由许多像素组成。算法可以改变像素的颜色数值，为同一张图片生成不同的视觉效果。',steps:['先看应用介绍，观察原图与处理后图片的关系。','进入体验，选择画面效果，点击“生成画面效果”。','换一种效果再运行，对照原图，描述算法改变了什么。']},
  'hall:medical':{title:'影像馆 · 标记线索供人复核',background:'算法可以帮助专业人员从影像中标记需要留意的地方。这里仅用模拟亮格演示标记规则，结果不能用于判断疾病。',steps:['先看介绍，分清“算法标记”与“专业人员判断”。','进入体验，调整亮度阈值，点击“标记亮点”。','换一个阈值再比较哪些格子被标记，并说明为什么仍需复核。']},
  quiz:{title:'独立完成向导考核',background:'请把游园会中的发现用到新的生活情境中。本次有20题，考核分数与游园活动积分分别记录。',steps:['点击“开始20题考核”，逐题阅读情境并选择答案。','查看作答进度，提交前检查并修改自己的选择。','全部完成后提交，再阅读结果和解析；需要时返回游园会复习。']},
  teacher:{title:'用图表看班级学习情况',background:'图表总览显示主线进度、六馆参与、回访表现和考核分布，帮助教师安排课堂指导。未作答与已作答的情况分别呈现。',steps:['选择班级，先看图表总览；需要投屏时点击“全屏展示”。','对照回访首答与最近表现，并留意各图的作答人数和“尚无证据”。','切换“学生明细”，查找学生并查看具体学习证据；图表每5秒检查更新。']},
  demo:{title:'隔离测试 · 先试一遍课堂任务',background:'这里使用独立的虚构状态，操作不会写入真实学生的进度、积分或考核统计。可以在上课前检查交互和反馈。',steps:['用上方选择框切换主线任务或体验馆。','操作控件，检查不同选择的反馈；体验馆先看介绍再运行。','需要时重置当前任务重新尝试，或查看答案与量规核对教学安排。']}
 };

 function createGate(now=()=>Date.now()){
  let key=null,openedAt=0,isOpen=false;
  const gate={
   get key(){return key;},
   get isOpen(){return isOpen;},
   enter(next){if(next===key)return false;key=next;return gate.show();},
   show(){if(!key)return false;openedAt=now();isOpen=true;return true;},
   remaining(){return isOpen?Math.max(0,Math.ceil((3000-(now()-openedAt))/1000)):0;},
   canClose(){return isOpen&&now()-openedAt>=3000;},
   close(){if(!gate.canClose())return false;isOpen=false;return true;}
  };
  return gate;
 }

 function mount(document){
  const gate=createGate(),dialog=document.createElement('dialog');
  dialog.className='page-guide-dialog';
  dialog.setAttribute('aria-labelledby','page-guide-title');
  dialog.setAttribute('aria-describedby','page-guide-background');
  dialog.innerHTML='<article class="page-guide-card"><header class="page-guide-header"><span class="page-guide-mark" aria-hidden="true">?</span><div><p class="page-guide-eyebrow">游园手册 · 任务指引</p><h2 class="page-guide-title" id="page-guide-title" tabindex="-1"></h2></div></header><section class="page-guide-background"><h3>这次为什么做</h3><p id="page-guide-background"></p></section><section class="page-guide-steps"><h3>怎样开始</h3><ol></ol></section><footer class="page-guide-footer"><p class="page-guide-timer" role="status" aria-live="polite"></p><button class="page-guide-close" type="button" disabled>请先阅读 · 3秒</button></footer></article>';
  const reopen=document.createElement('button');
  reopen.className='page-guide-reopen';reopen.type='button';reopen.textContent='? 任务指引';
  reopen.setAttribute('aria-haspopup','dialog');reopen.hidden=true;
  document.body.append(reopen,dialog);
  const title=dialog.querySelector('h2'),background=dialog.querySelector('#page-guide-background');
  const steps=dialog.querySelector('ol'),timer=dialog.querySelector('.page-guide-timer'),close=dialog.querySelector('button');
  let interval=null,returnFocus=null;

  function update(){
   const left=gate.remaining();
   close.disabled=!gate.canClose();
   const label=left?`请先阅读 · ${left}秒`:'我明白了，关闭指引';
   const message=left?`先读一读，${left}秒后可关闭`:'可以关闭，也可以继续阅读';
   if(close.textContent!==label)close.textContent=label;
   if(timer.textContent!==message)timer.textContent=message;
   if(!left){clearInterval(interval);interval=null;}
  }
  function open(){
   const guide=guides[gate.key];
   title.textContent=guide.title;background.textContent=guide.background;
   steps.replaceChildren(...guide.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
   if(!dialog.open)returnFocus=document.activeElement;
   clearInterval(interval);update();dialog.showModal();title.focus({preventScroll:true});
   interval=setInterval(update,100);
   reopen.hidden=false;
  }
  function requestClose(){
   if(!gate.close()){update();return;}
   clearInterval(interval);interval=null;dialog.close();
   const focus=returnFocus?.isConnected&&!returnFocus.closest('[hidden]')?returnFocus:reopen;
   if(focus===document.body)reopen.focus({preventScroll:true});else focus.focus({preventScroll:true});
  }
  close.addEventListener('click',requestClose);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();requestClose();}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  dialog.addEventListener('click',event=>{
   const box=dialog.getBoundingClientRect();
   if(event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))requestClose();
  });
  const api={
   enter(key){if(!guides[key]||!gate.enter(key))return false;open();return true;},
   show(){if(!gate.show())return false;open();return true;}
  };
  reopen.addEventListener('click',()=>api.show());
  const initial=document.body.dataset.guidePage;
  if(initial)api.enter(initial);
  return api;
 }
 return {guides,createGate,mount};
});
