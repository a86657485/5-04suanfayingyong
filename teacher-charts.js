'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.TeacherCharts=api;
})(typeof window!=='undefined'?window:null,function(){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const array=value=>Array.isArray(value)?value:[];
 const count=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
 const percent=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;
 const number=value=>String(Math.round(value*10)/10);
 const colors={notEntered:'#b9c5bd',inProgress:'#DCAD58',completed:'#2C827A'};
 function card(id,title,caption,body,footer,className=''){
  return `<section class="teacher-chart-card ${className}" aria-labelledby="teacher-chart-${id}-heading"><header class="teacher-chart-heading"><h2 id="teacher-chart-${id}-heading">${esc(title)}</h2><p>${esc(caption)}</p></header>${body}<p class="teacher-chart-note">${esc(footer)}</p></section>`;
 }
 function statusChart(report){
  const total=count(report.total),entered=count(report.entered),radius=42,circumference=2*Math.PI*radius;
  const status=array(report.status),description=status.map(item=>`${item.label}${count(item.count)}人`).join('，');
  let offset=0;
  const segments=status.map(item=>{
   const length=total?Math.min(count(item.count),total)/total*circumference:0;
   const segment=`<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${colors[item.id]||colors.notEntered}" stroke-width="14" stroke-dasharray="${length.toFixed(2)} ${circumference.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
   offset+=length;
   return segment;
  }).join('');
  const svg=`<svg class="teacher-chart-ring" viewBox="0 0 120 120" role="img" aria-labelledby="teacher-status-title teacher-status-desc"><title id="teacher-status-title">班级学习状态</title><desc id="teacher-status-desc">全班${total}人，已进入${entered}人。${esc(description)}。状态表示活动进度。</desc><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#edf0e8" stroke-width="14"/>${segments}<text x="60" y="58" text-anchor="middle" class="teacher-chart-ring-value">${entered}<tspan class="teacher-chart-ring-total"> / ${total}</tspan></text><text x="60" y="76" text-anchor="middle" class="teacher-chart-ring-label">已进入 / 全班</text></svg>`;
  const legend=`<ul class="teacher-chart-status-list">${status.map(item=>`<li><span class="teacher-chart-dot" style="background:${colors[item.id]||colors.notEntered}" aria-hidden="true"></span><span>${esc(item.label)}</span><strong>${count(item.count)}<small>人</small></strong></li>`).join('')}</ul>`;
  return card('status','班级学习状态','名单与手动加入学生均计入全班',`<div class="teacher-chart-status-body">${svg}${legend}</div>`,'完成主线表示完成活动，需结合回访判断理解。','teacher-chart-status');
 }
 function bars(items){
  return `<ul class="teacher-chart-bars">${array(items).map(item=>{
   const done=count(item.count),total=count(item.total),width=total?percent(done/total*100):0;
   return `<li><span class="teacher-chart-bar-label">${esc(item.label)}</span><span class="teacher-chart-track" aria-hidden="true"><span class="teacher-chart-fill" style="width:${number(width)}%"></span></span><strong class="teacher-chart-bar-count">${done}/${total}<small> · ${number(width)}%</small></strong></li>`;
  }).join('')}</ul>`;
 }
 function exitCell(evidence,tone){
  const answered=count(evidence?.answered),correct=count(evidence?.correct),noEvidence=count(evidence?.noEvidence);
  const hasRate=answered>0&&typeof evidence?.rate==='number'&&Number.isFinite(evidence.rate);
  const rate=hasRate?percent(evidence.rate):null;
  return `<td><div class="teacher-chart-evidence ${tone}"><div class="teacher-chart-comparison-meter"><span class="teacher-chart-comparison-fill" style="width:${rate===null?0:number(rate)}%" aria-hidden="true"></span><strong>${rate===null?'尚无证据':number(rate)+'%'}</strong></div><small>正确 ${correct}/${answered}人 · 无证据 ${noEvidence}人</small></div></td>`;
 }
 function exitChart(report){
  const exit=report.exit||{};
  const table=`<table class="teacher-chart-comparison-table"><caption class="teacher-chart-sr-only">四项目标的首次和最新回答：正确率以该目标已回答人数为分母，无证据人数单独显示。</caption><thead><tr><th scope="col">课堂回访目标</th><th scope="col"><span class="teacher-chart-key first" aria-hidden="true"></span>首次正确率</th><th scope="col"><span class="teacher-chart-key latest" aria-hidden="true"></span>最新正确率</th></tr></thead><tbody>${array(exit.items).map(item=>`<tr><th scope="row">${esc(item.label)}</th>${exitCell(item.first,'first')}${exitCell(item.latest,'latest')}</tr>`).join('')}</tbody></table>`;
  return card('exit','四项目标：首次与最新',`已提交回访 ${count(exit.submitted)}人 · 未提交 ${count(exit.notSubmitted)}人`,table,'正确率分母为各目标已回答人数；未回答记为“无证据”。','teacher-chart-exit');
 }
 function quizChart(report){
  const quiz=report.quiz||{},submitted=count(quiz.submitted),bands=array(quiz.distribution),max=Math.max(1,...bands.map(item=>count(item.count)));
  const average=submitted&&typeof quiz.average==='number'&&Number.isFinite(quiz.average)?number(Math.max(0,Math.min(100,quiz.average))):null;
  const summary=`<div class="teacher-chart-quiz-summary">${submitted?`<strong>${average??'—'}<small>分</small></strong><span>最新已提交均分</span>`:'<strong class="teacher-chart-empty">尚无提交</strong><span>提交考核后显示成绩分布</span>'}</div>`;
  const histogram=`<ul class="teacher-chart-histogram" aria-label="20题最新已提交成绩的人数分布">${bands.map(item=>`<li><div class="teacher-chart-column"><strong>${count(item.count)}<small>人</small></strong><span style="height:${number(percent(count(item.count)/max*100))}%" aria-hidden="true"></span></div><span class="teacher-chart-band-label">${esc(item.label)}</span></li>`).join('')}</ul>`;
  return card('quiz','20题考核成绩',`已提交 ${submitted}人 · 未提交 ${count(quiz.notSubmitted)}人（其中作答中 ${count(quiz.inProgress)}人）`,summary+histogram,'每人取最新已提交成绩；未提交不计为0分。','teacher-chart-quiz');
 }
 function render(report={}){
  const data=report&&typeof report==='object'?report:{};
  return statusChart(data)+card('stages','主线任务完成','依次完成4项主线任务',bars(data.stages),'每条为完成人数 / 全班人数。','teacher-chart-stages')+card('halls','六馆参与情况',`完成主线 ${count(data.completed)}人可进入体验馆`,bars(data.halls),'每人每馆成功运行计1人；分母为全班。','teacher-chart-halls')+exitChart(data)+quizChart(data);
 }
 return {render};
});
