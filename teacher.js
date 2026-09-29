'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stages=[['search','找活动'],['nav','带游客'],['reco','推荐'],['service','服务卡']];
let classroom=null,answers=null,selected=null;
function stageStatus(s,id){if(s.state[id]?.done)return '<span class="pill done">已完成</span>';const evidence=id==='service'?!!s.state.service.card:(s.state[id]?.attempts||[]).length>0;return `<span class="pill ${evidence?'active':''}">${evidence?'进行中':'未开始'}</span>`;}
function date(ms){return ms?new Date(ms).toLocaleString('zh-CN',{hour12:false}):'尚无记录';}
function render(){
 if(!classroom)return;const students=classroom.students,entered=students.filter(s=>s.student.entered).length,completed=students.filter(s=>s.state.service.done).length;
 const active=students.filter(s=>s.student.entered&&!s.state.service.done).length;
 $('teacher-metrics').innerHTML=`<div class="metric"><strong>${students.length}</strong><small>名单及手动加入人数</small></div><div class="metric"><strong>${entered}</strong><small>已进入</small></div><div class="metric"><strong>${students.length-entered}</strong><small>未进入</small></div><div class="metric"><strong>${active}</strong><small>进行中</small></div><div class="metric"><strong>${completed}</strong><small>完成主线</small></div>`;
 const mainCounts=stages.map(([id,label])=>`${label} ${students.filter(s=>s.state[id].done).length}/${students.length}`).join('  ·  ');
 const hallCounts=Object.entries({recognition:'识别',translation:'翻译',shopping:'购物推荐',sports:'运动数据',art:'图像艺术',medical:'影像辅助'}).map(([id,label])=>`${label} ${students.filter(s=>s.state.gallery?.records?.[id]?.length).length}人`).join('  ·  ');
 $('stage-metrics').textContent=`必做：${mainCounts}。拓展馆：${hallCounts}。分母包含本班名单及手动加入学生；拓展馆和完整考核不计入主线。`;
 const term=$('teacher-search').value.trim(),only=$('only-unfinished').checked;
 $('teacher-rows').innerHTML=students.filter(s=>s.student.name.includes(term)&&(!only||!s.state.service.done)).map(s=>{
  const current=s.state.service.done?'已完成':({search:'找活动',nav:'带游客',reco:'推荐下一站',service:'服务卡'})[!s.state.search.done?'search':!s.state.nav.done?'nav':!s.state.reco.done?'reco':'service'];
  const done=stages.filter(([id])=>s.state[id].done).length,pct=Math.round(done/4*100),quiz=s.quiz.at(-1);
  return `<tr><td><strong>${esc(s.student.name)}</strong>${s.student.manual?' <span class="pill">手动</span>':''}</td><td>${current}</td>${stages.map(([id])=>`<td>${stageStatus(s,id)}</td>`).join('')}<td>${done}/4 · ${pct}%</td><td>${s.points}</td><td>${quiz?`${quiz.score??'作答中'}${quiz.score!=null?'分':''}`:'未考核'}</td><td>${esc(date(s.updated))}</td><td><button data-id="${esc(s.student.id)}">查看</button></td></tr>`;
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
 lines.push('','自由体验馆（选做，不计入主线）：');
 for(const [id,name] of Object.entries(hallNames)){
  const attempts=records[id]||[],latest=attempts.at(-1);
  lines.push(latest?`${name}：${attempts.length}次；最近输入 ${JSON.stringify(latest.input)}；结果 ${id==='recognition'?latest.output.candidates[0]?.name:id==='translation'?latest.output.output:id==='shopping'?latest.output.rank[0]?.name:id==='sports'?latest.output.count+'个峰值':id==='medical'?latest.output.flagged.length+'处标记':latest.output.style}`:`${name}：尚无证据`);
 }
 lines.push('',`游客对话：${f.dialogue?.history?.length||0}次回应；需修订${f.dialogue?.history?.filter(x=>!x.correct).length||0}次`);
 $('teacher-detail').textContent=lines.join('\n');
}
async function load(){const cls=$('teacher-class').value;try{const r=await fetch(`/api/teacher/class?class=${cls}`),data=await r.json();if(!r.ok)throw Error(data.error);const changed=!classroom||classroom.classId!==data.classId||JSON.stringify(classroom.students)!==JSON.stringify(data.students);classroom=data;$('teacher-sync').textContent=`最近更新：${date(data.at)}。每5秒检查更新。学生若断网，本屏显示的是上次同步记录。`;if(changed)render();}catch(e){$('teacher-sync').textContent=`更新失败：${e.message}。当前画面可能是旧数据。`;}}
$('teacher-class').addEventListener('change',()=>{selected=null;load();});$('teacher-search').addEventListener('input',render);$('only-unfinished').addEventListener('change',render);$('refresh-teacher').addEventListener('click',load);
$('teacher-rows').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)showDetail(b.dataset.id);});
$('show-answers').addEventListener('click',async()=>{
 const panel=$('answer-panel');if(!panel.hidden){panel.hidden=true;return;}
 if(!answers){try{const r=await fetch('/api/teacher/answers');answers=await r.json();}catch(e){$('teacher-sync').textContent='答案载入失败，请检查服务。';return;}}
 $('answer-content').innerHTML=`<p>服务卡评价：场景与作用是否对应；信息与结果是否关联；是否具体说明帮助。提交完整后标记“待教师反馈”，不能凭字数认定掌握。</p>${['A','B','exitA','exitB'].map(form=>`<details><summary>${form.startsWith('exit')?`四项课堂回访${form.endsWith('A')?'A':'B'}卷`:form+'卷20题'}</summary><ol>${answers[form].map(q=>`<li>${esc(q.stem)} <strong>答案 ${'ABC'[q.answer]}</strong> · ${esc(q.explanation)}</li>`).join('')}</ol></details>`).join('')}`;panel.hidden=false;panel.scrollIntoView({behavior:'smooth'});
});
load();setInterval(load,5000);
