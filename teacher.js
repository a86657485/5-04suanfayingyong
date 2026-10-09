'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stages=[['search','找活动'],['nav','带游客'],['reco','推荐'],['service','服务卡']];
let classroom=null,answers=null,selected=null,latestRequest=0;
function stageStatus(s,id){if(s.state[id]?.done===true)return '<span class="pill done">已完成</span>';const evidence=id==='service'?!!s.state.service.card:(s.state[id]?.attempts||[]).length>0;return `<span class="pill ${evidence?'active':''}">${evidence?'进行中':'未开始'}</span>`;}
function date(ms){return ms?new Date(ms).toLocaleString('zh-CN',{hour12:false}):'尚无记录';}
function render(){
 if(!classroom)return;const students=classroom.students,summary=window.TeacherAnalytics.aggregate(classroom);
 $('teacher-metrics').innerHTML=`<div class="metric"><strong>${summary.total}</strong><small>班级人数</small></div><div class="metric"><strong>${summary.entered}</strong><small>已进入</small></div><div class="metric"><strong>${summary.notEntered}</strong><small>未进入</small></div><div class="metric"><strong>${summary.inProgress}</strong><small>进行中</small></div><div class="metric"><strong>${summary.completed}</strong><small>完成主线</small></div>`;
 $('teacher-charts').innerHTML=window.TeacherCharts.render(summary);
 $('stage-metrics').textContent='统计包含本班名单及手动加入学生，列表筛选不改变图表分母。已进入表示曾登录；图表仅反映已同步记录，任务完成与知识掌握需结合回答和作品判断。';
 const term=$('teacher-search').value.trim(),only=$('only-unfinished').checked;
 $('teacher-rows').innerHTML=students.filter(s=>s.student.name.includes(term)&&(!only||!window.TeacherAnalytics.isComplete(s.state))).map(s=>{
  const current=window.TeacherAnalytics.isComplete(s.state)?'已完成':({search:'找活动',nav:'带游客',reco:'推荐下一站',service:'服务卡'})[!s.state.search.done?'search':!s.state.nav.done?'nav':!s.state.reco.done?'reco':'service'];
  const done=stages.filter(([id])=>s.state[id]?.done===true).length,pct=Math.round(done/4*100),quiz=s.quiz.filter(q=>q.status==='submitted'&&Number.isFinite(q.score)&&q.score>=0&&q.score<=100).at(-1),draft=s.quiz.at(-1)?.status==='draft';
  return `<tr><td><strong>${esc(s.student.name)}</strong>${s.student.manual?' <span class="pill">手动</span>':''}</td><td>${current}</td>${stages.map(([id])=>`<td>${stageStatus(s,id)}</td>`).join('')}<td>${done}/4 · ${pct}%</td><td>${s.points}</td><td>${quiz?`${quiz.score}分${draft?' · 有新草稿':''}`:draft?'作答中':'未考核'}</td><td>${esc(date(s.updated))}</td><td><button data-id="${esc(s.student.id)}">查看</button></td></tr>`;
 }).join('');
 if(selected)showDetail(selected);
}
function showDetail(id){
 const s=classroom.students.find(x=>x.student.id===id);if(!s)return;selected=id;
 const f=s.state,search=f.search.attempts,nav=f.nav.attempts,reco=f.reco.attempts;
 const topicNames={plant:'拍照识植物',translate:'语言翻译',sport:'运动记录'};
 const lines=[`${s.student.classId}班 · ${s.student.name}${s.student.manual?'（手动加入）':''}`,`当前同步：${date(s.updated)}`,`活动积分：${s.points}；20题考核：${s.quiz.map(x=>`${x.form}卷 ${x.score??'作答中'}分`).join('、')||'尚无'}`,`出口检测：${s.exit.map(x=>`${x.score}分`).join('、')||'尚无'}`,'',`找活动：${f.search.done?'已完成':'进行中'}；首次选择：${search[0]?`${search[0].id}（${search[0].correct?'符合需要':'需修订'}）`:'尚无证据'}`,`最近选择：${search.at(-1)?`${search.at(-1).id}（${search.at(-1).correct?'符合需要':'需修订'}）`:'尚无证据'}`,`带游客：${f.nav.done?'已完成':'进行中'}；首次路线：${nav[0]?`${nav[0].route}（${nav[0].correct?'符合目标':nav[0].reason}）`:'尚无证据'}`,`带路解释：${f.nav.reason||'尚无证据'}`,`最近路线：${nav.at(-1)?`${nav.at(-1).route}（${nav.at(-1).correct?'符合目标':nav.at(-1).reason}）`:'尚无证据'}`,`推荐：${f.reco.done?'已完成':'进行中'}；首次邀请：${reco[0]?`${reco[0].invite}（${reco[0].correct?'符合需要':'需修订'}）`:'尚无证据'}`,`推荐解释：${f.reco.reason||'尚无证据'}`,`最近邀请：${reco.at(-1)?`${reco.at(-1).invite}（${reco.at(-1).correct?'符合需要':'需修订'}）`:'尚无证据'}`,`提示使用：找活动${f.hints?.search||0}级、带游客${f.hints?.nav||0}级、推荐${f.hints?.reco||0}级`,'' ,'服务卡：',f.service.card?`主题 ${topicNames[f.service.card.topic]||f.service.card.topic}；信息 ${f.service.card.input}；帮助 ${f.service.card.action}；收获 ${f.service.card.benefit}；补充 ${f.service.card.note||'无'}`:'尚无证据'];
 const hallNames={recognition:'图像识别馆',translation:'语言翻译馆',shopping:'购物推荐馆',sports:'运动数据馆',art:'图像艺术馆',medical:'影像辅助馆'};
 const records=f.gallery?.records||{};
 lines.push('','应用体验馆（主线后开放，单独记录）：');
 for(const [id,name] of Object.entries(hallNames)){
  const attempts=records[id]||[],latest=attempts.at(-1);
  lines.push(latest?`${name}：${attempts.length}次；最近输入 ${JSON.stringify(latest.input)}；结果 ${id==='recognition'?latest.output.candidates[0]?.name:id==='translation'?latest.output.output:id==='shopping'?latest.output.rank[0]?.name:id==='sports'?latest.output.count+'个峰值':id==='medical'?latest.output.flagged.length+'处标记':latest.output.style}`:`${name}：尚无证据`);
 }
 lines.push('',`游客对话：${f.dialogue?.history?.length||0}次回应；需修订${f.dialogue?.history?.filter(x=>!x.correct).length||0}次`);
 $('teacher-detail').textContent=lines.join('\n');
}
async function load(){
 const cls=$('teacher-class').value,request=++latestRequest;
 try{
  const r=await fetch(`/api/teacher/class?class=${cls}`),data=await r.json();
  if(request!==latestRequest||cls!==$('teacher-class').value)return;
  if(!r.ok)throw Error(data.error);
  const changed=!classroom||classroom.classId!==data.classId||JSON.stringify(classroom.students)!==JSON.stringify(data.students);
  classroom=data;$('teacher-sync').classList.remove('sync-error');
  $('teacher-sync').textContent=`${cls}班 · 最近更新：${date(data.at)} · 每5秒检查已同步记录`;
  if(changed)render();
 }catch(e){if(request!==latestRequest||cls!==$('teacher-class').value)return;$('teacher-sync').classList.add('sync-error');$('teacher-sync').textContent=`更新失败：${e.message}。当前画面可能是旧数据。`;}
}
function setView(view){
 $('teacher-overview').hidden=view!=='overview';$('teacher-students').hidden=view!=='students';
 document.querySelectorAll('[data-teacher-view]').forEach(button=>{const active=button.dataset.teacherView===view;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
}
document.querySelector('.teacher-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-teacher-view]');if(button)setView(button.dataset.teacherView);});
document.querySelector('.teacher-tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const buttons=[...document.querySelectorAll('[data-teacher-view]')],current=buttons.indexOf(event.target);
 if(current<0)return;event.preventDefault();
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
 setView(buttons[next].dataset.teacherView);buttons[next].focus();
});
$('teacher-class').addEventListener('change',()=>{selected=null;classroom=null;$('teacher-detail').textContent='点击本班学生的“查看”按钮，阅读首次选择、修订和作品。';$('teacher-rows').replaceChildren();$('teacher-metrics').replaceChildren();$('teacher-charts').innerHTML='<p class="teacher-loading">正在读取所选班级的学习记录…</p>';load();});
$('teacher-search').addEventListener('input',render);$('only-unfinished').addEventListener('change',render);$('refresh-teacher').addEventListener('click',load);
$('teacher-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('teacher-sync').textContent='当前窗口未能切换全屏，可使用浏览器的全屏菜单。';}});
document.addEventListener('fullscreenchange',()=>{$('teacher-fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏展示';});
$('teacher-rows').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)showDetail(b.dataset.id);});
$('show-answers').addEventListener('click',async()=>{
 const panel=$('answer-panel');if(!panel.hidden){panel.hidden=true;return;}
 if(!answers){try{const r=await fetch('/api/teacher/answers');answers=await r.json();}catch(e){$('teacher-sync').textContent='答案载入失败，请检查服务。';return;}}
 $('answer-content').innerHTML=`<p>服务卡评价：场景与作用是否对应；信息与结果是否关联；是否具体说明帮助。提交完整后标记“待教师反馈”，不能凭字数认定掌握。</p>${['A','B','exitA','exitB'].map(form=>`<details><summary>${form.startsWith('exit')?`四项课堂回访${form.endsWith('A')?'A':'B'}卷`:form+'卷20题'}</summary><ol>${answers[form].map(q=>`<li>${esc(q.stem)} <strong>答案 ${'ABC'[q.answer]}</strong> · ${esc(q.explanation)}</li>`).join('')}</ol></details>`).join('')}`;panel.hidden=false;panel.scrollIntoView({behavior:'smooth'});
});
setView('overview');load();setInterval(load,5000);
