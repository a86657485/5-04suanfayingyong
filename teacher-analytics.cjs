'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.TeacherAnalytics=api;
})(typeof window!=='undefined'?window:null,function(){
 const stageLabels=[['search','找活动'],['nav','带游客'],['reco','推荐下一站'],['service','智慧服务卡']];
 const hallLabels=[['recognition','图像识别馆'],['translation','语言翻译馆'],['shopping','购物推荐馆'],['sports','运动数据馆'],['art','图像艺术馆'],['medical','影像辅助馆']];
 const exitLabels=[['search','搜索与匹配',['E1','F1']],['route','路线与目标',['E2','F2']],['reco','记录与推荐',['E3','F3']],['role','算法与人的判断',['E4','F4']]];
 const array=value=>Array.isArray(value)?value:[];
 const round=value=>Math.round(value*10)/10;
 const percent=(count,total)=>total?round(count/total*100):0;
 function isComplete(state){return stageLabels.every(([id])=>state?.[id]?.done===true);}
 function time(value){
  if(typeof value==='number')return Number.isFinite(value)?value:0;
  if(typeof value!=='string'||!value.trim())return 0;
  const numeric=Number(value),parsed=Number.isFinite(numeric)?numeric:Date.parse(value);
  return Number.isFinite(parsed)?parsed:0;
 }
 function chronological(records){
  return array(records).filter(x=>x&&typeof x==='object').map((record,index)=>({record,index})).sort((a,b)=>time(a.record.created)-time(b.record.created)||a.index-b.index).map(x=>x.record);
 }
 function responseSummary(records,ids,total){
  let correct=0,answered=0;
  for(const record of records){
   const result=array(record?.results).find(x=>ids.includes(x?.id));
   if(result?.answered!==true)continue;
   answered++;
   if(result.correct===true)correct++;
  }
  return {correct,answered,incorrect:answered-correct,noEvidence:total-answered,rate:answered?percent(correct,answered):null};
 }
 function aggregate(classroom){
  const students=array(classroom?.students),total=students.length;
  const entered=students.filter(x=>x?.student?.entered).length;
  const completed=students.filter(x=>x?.student?.entered&&isComplete(x?.state)).length;
  const notEntered=total-entered,inProgress=entered-completed;
  const status=[{id:'notEntered',label:'未进入',count:notEntered},{id:'inProgress',label:'进行中',count:inProgress},{id:'completed',label:'完成主线',count:completed}];
  const stages=stageLabels.map(([id,label])=>{
   const count=students.filter(x=>x?.state?.[id]?.done===true).length;
   return {id,label,count,total,percent:percent(count,total)};
  });
  const halls=hallLabels.map(([id,label])=>{
   const count=students.filter(x=>array(x?.state?.gallery?.records?.[id]).length>0).length;
   return {id,label,count,total,percent:percent(count,total)};
  });
  const exitRecords=students.map(x=>chronological(x?.exit));
  const first=exitRecords.map(records=>records[0]),latest=exitRecords.map(records=>records.at(-1));
  const submitted=exitRecords.filter(records=>records.length>0).length;
  const exit={submitted,notSubmitted:total-submitted,items:exitLabels.map(([id,label,ids])=>({id,label,first:responseSummary(first,ids,total),latest:responseSummary(latest,ids,total)}))};
  const scores=[];
  let quizInProgress=0;
  for(const student of students){
   const attempts=chronological(student?.quiz);
   const valid=attempts.filter(x=>x.status==='submitted'&&typeof x.score==='number'&&Number.isFinite(x.score)&&x.score>=0&&x.score<=100);
   if(valid.length)scores.push(valid.at(-1).score);
   else if(attempts.at(-1)?.status==='draft')quizInProgress++;
  }
  const bands=[['below60','0—59分',0,60],['from60','60—79分',60,80],['from80','80—99分',80,100],['full','100分',100,101]];
  const quiz={submitted:scores.length,notSubmitted:total-scores.length,inProgress:quizInProgress,average:scores.length?round(scores.reduce((sum,score)=>sum+score,0)/scores.length):null,distribution:bands.map(([id,label,min,max])=>({id,label,count:scores.filter(score=>score>=min&&score<max).length}))};
  return {total,entered,notEntered,inProgress,completed,status,stages,halls,exit,quiz};
 }
 return {aggregate,isComplete};
});
