'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {createHash}=require('node:crypto');
const analytics=require('../teacher-analytics.cjs');
const charts=require('../teacher-charts.js');
const {initialState}=require('../game-rules.cjs');
const source=fs.readFileSync(path.join(__dirname,'../teacher.js'),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function dashboard(){
 const elements=new Map(),requests=[];
 function element(id){
  if(!elements.has(id)){
   const classes=new Set();
   elements.set(id,{
    value:id==='teacher-class'?'501':'',checked:false,hidden:false,innerHTML:'',textContent:'',listeners:{},
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
    addEventListener(kind,handler){this.listeners[kind]=handler;},
    replaceChildren(){this.innerHTML='';},setAttribute(){},focus(){}
   });
  }
  return elements.get(id);
 }
 const document={getElementById:element,querySelector:()=>element('tabs'),querySelectorAll:()=>[],addEventListener(){}};
 const fetch=url=>new Promise(resolve=>requests.push({url,resolve}));
 vm.runInNewContext(source,{document,window:{TeacherAnalytics:analytics,TeacherCharts:charts},fetch,setInterval(){},Date,JSON,Number});
 return {
  element,requests,
  changeClass(id){element('teacher-class').value=id;element('teacher-class').listeners.change();},
  refresh(){element('refresh-teacher').listeners.click();},
  async respond(index,data,ok=true){requests[index].resolve({ok,json:async()=>data});await settle();},
  snapshot(){return {metrics:element('teacher-metrics').innerHTML,chartsHash:createHash('sha256').update(element('teacher-charts').innerHTML).digest('hex'),sync:element('teacher-sync').textContent,error:element('teacher-sync').classList.contains('sync-error')};}
 };
}

function classroom(classId,at,total){
 return {classId,at,students:Array.from({length:total},(_,index)=>({
  student:{id:`fictional-${classId}-${index}`,name:`虚构学生${index+1}`,classId,entered:true},
  state:initialState(),quiz:[],exit:[],points:0,updated:at
 }))};
}

test('returning to the same class keeps its newest chart response when an earlier visit arrives late',async()=>{
 const page=dashboard();
 page.changeClass('502');page.changeClass('501');
 assert.deepEqual(page.requests.map(x=>x.url),['/api/teacher/class?class=501','/api/teacher/class?class=502','/api/teacher/class?class=501']);
 await page.respond(2,classroom('501',3000,1));
 const newest=page.snapshot();
 assert.match(newest.metrics,/<strong>1<\/strong>/);
 await page.respond(0,classroom('501',1000,0));
 assert.deepEqual(page.snapshot(),newest,'a late response from the earlier 501 visit must not roll back charts or sync time');
 await page.respond(1,classroom('502',2000,2));
 assert.deepEqual(page.snapshot(),newest,'a response from the abandoned class must not replace the selected class');
});

test('overlapping refreshes in one class keep the newest successful response',async()=>{
 const page=dashboard();
 page.refresh();
 await page.respond(1,classroom('501',3000,2));
 const newest=page.snapshot();
 await page.respond(0,classroom('501',1000,1));
 assert.deepEqual(page.snapshot(),newest,'an older refresh must not overwrite newer class totals');
});

test('a late success cannot clear the newest refresh failure or populate its stale charts',async()=>{
 const page=dashboard();
 page.refresh();
 await page.respond(1,{error:'虚构的最新请求失败'},false);
 const newest=page.snapshot();
 assert.equal(newest.error,true);
 assert.match(newest.sync,/虚构的最新请求失败/);
 await page.respond(0,classroom('501',1000,1));
 assert.deepEqual(page.snapshot(),newest,'a superseded success must not hide the current connection error');
});

test('a late failure cannot replace the newest successful refresh status',async()=>{
 const page=dashboard();
 page.refresh();
 await page.respond(1,classroom('501',3000,2));
 const newest=page.snapshot();
 assert.equal(newest.error,false);
 await page.respond(0,{error:'虚构的旧请求失败'},false);
 assert.deepEqual(page.snapshot(),newest,'a superseded error must not mark current class data as failed');
});
