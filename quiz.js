'use strict';
let attempt=null,questions=null,saveTimer=null;
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){const r=await fetch(path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await r.json();if(!r.ok)throw Error(data.error||'连接失败');return data;}
function restoreLocalDraft(){if(!attempt||attempt.status!=='draft')return;try{attempt.answers={...attempt.answers,...JSON.parse(localStorage.getItem(`festival-quiz-${attempt.id}`)||'{}')};}catch{}}
async function init(){try{const s=await api('/api/state');$('quiz-student').textContent=`${s.student.classId}班 · ${s.student.name}`;const x=await api('/api/quiz/latest');if(x.attempt){attempt=x.attempt;questions=x.questions;restoreLocalDraft();render();}}catch(e){$('quiz-message').textContent=e.message;}}
async function start(){try{const data=await api('/api/quiz/start',{});attempt=data.attempt;questions=data.questions;restoreLocalDraft();render();}catch(e){$('quiz-message').textContent=e.message;}}
function answersFromForm(){const result={};document.querySelectorAll('.quiz-item input:checked').forEach(x=>result[x.name]=Number(x.value));return result;}
async function save(){if(!attempt||attempt.status!=='draft')return;const answers=answersFromForm();localStorage.setItem(`festival-quiz-${attempt.id}`,JSON.stringify(answers));await api('/api/quiz/save',{attemptId:attempt.id,answers});attempt.answers=answers;localStorage.removeItem(`festival-quiz-${attempt.id}`);$('quiz-progress').textContent=`已答 ${Object.keys(answers).length} / 20 · 已保存`;} 
function render(){
 const content=$('quiz-content');
 if(!attempt){content.innerHTML='<button class="primary-button" id="start-quiz">开始20题考核</button>';return;}
 if(attempt.status==='submitted'){
  $('quiz-progress').innerHTML=`<span class="score-big">${attempt.score}</span> / 100 · ${attempt.form}卷 · 已提交`;
  content.innerHTML=`<h2>逐题回看</h2><div class="quiz-grid">${attempt.results.map((r,i)=>`<div class="quiz-item"><strong>第${i+1}题 · ${r.correct?'正确':'需要回学'}</strong><p>你的选择：${'ABC'[attempt.answers[r.id]]||'未答'}；正确选择：${'ABC'[r.answer]}</p><p>${esc(r.explanation)}</p></div>`).join('')}</div><p>可以回到游园会根据目标重新体验，再使用另一套20题检验。</p><button class="primary-button" id="start-quiz">开始下一套考核</button>`;
  return;
 }
 $('quiz-progress').textContent=`${attempt.form}卷 · 已答 ${Object.keys(attempt.answers||{}).length} / 20`;
 content.innerHTML=`<form id="quiz-form"><div class="quiz-grid">${questions.map((q,i)=>`<fieldset class="quiz-item"><legend>${i+1}. ${esc(q.stem)}</legend>${q.options.map((opt,j)=>`<label><input type="radio" name="${q.id}" value="${j}" ${attempt.answers[q.id]===j?'checked':''}> ${'ABC'[j]}. ${esc(opt)}</label>`).join('')}</fieldset>`).join('')}</div><div class="quiz-actions"><button class="secondary-button" type="button" id="save-quiz">保存草稿</button><button class="primary-button" type="submit">提交20题并查看解析</button><span>提交前只显示已答数量。</span></div></form>`;
}
document.addEventListener('click',async event=>{if(event.target.id==='start-quiz')await start();if(event.target.id==='save-quiz'){try{await save();$('quiz-message').textContent='草稿已保存。';}catch(e){$('quiz-message').textContent=`未同步：${e.message}。请保持此页面并检查网络。`;}}});
document.addEventListener('change',event=>{if(!event.target.matches('.quiz-item input'))return;const answers=answersFromForm(),n=Object.keys(answers).length;localStorage.setItem(`festival-quiz-${attempt.id}`,JSON.stringify(answers));$('quiz-progress').textContent=`${attempt.form}卷 · 已答 ${n} / 20 · 正在保存…`;clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await save();}catch(e){$('quiz-message').textContent=`未同步：${e.message}。答案已留在本机，联网后重试。`;}},450);});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='quiz-form')return;event.preventDefault();clearTimeout(saveTimer);
 try{await save();const data=await api('/api/quiz/submit',{attemptId:attempt.id});attempt=data.attempt;questions=null;$('quiz-message').textContent='已提交。下面可以对照每一题的理由。';render();}
 catch(e){$('quiz-message').textContent=e.message;}
});
window.addEventListener('online',async()=>{if(attempt?.status==='draft'&&localStorage.getItem(`festival-quiz-${attempt.id}`)){try{await save();$('quiz-message').textContent='本机草稿已同步。';}catch(e){$('quiz-message').textContent=`草稿仍待同步：${e.message}`;}}});
init();
