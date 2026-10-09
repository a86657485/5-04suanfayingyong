'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const modulePath=require('node:path').join(__dirname,'../teacher-analytics.cjs');
function api(){
 assert.ok(fs.existsSync(modulePath),'班级图表统计模块应存在');
 return require(modulePath);
}
function member(entered,state={},extra={}){return {student:{entered},state,...extra};}
const complete={search:{done:true},nav:{done:true},reco:{done:true},service:{done:true}};

test('empty class has zero counts and no fabricated scores or answer rates',()=>{
 const report=api().aggregate({classId:'501',students:[]});
 assert.deepEqual([report.total,report.entered,report.notEntered,report.inProgress,report.completed],[0,0,0,0,0]);
 assert.equal(report.stages.length,4);
 assert.equal(report.halls.length,6);
 assert.ok(report.stages.concat(report.halls).every(x=>x.count===0&&x.total===0&&x.percent===0));
 assert.equal(report.quiz.average,null);
 assert.ok(report.exit.items.every(x=>x.first.rate===null&&x.latest.rate===null));
 assert.deepEqual(api().aggregate(),report);
});

test('completion requires every main stage to contain a strict true value',()=>{
 assert.equal(api().isComplete(complete),true);
 assert.equal(api().isComplete({...complete,search:{done:1}}),false);
 assert.equal(api().isComplete({service:{done:true}}),false);
 assert.equal(api().isComplete(),false);
});

test('entry status partitions all roster and manually added students without negatives',()=>{
 const report=api().aggregate({students:[
  member(false,complete),member(true,complete),member(true,{service:{done:true}}),
  {student:{entered:true,manual:true}},{}
 ]});
 assert.deepEqual([report.total,report.entered,report.notEntered,report.inProgress,report.completed],[5,3,2,2,1]);
 assert.deepEqual(report.status.map(x=>[x.id,x.count]),[['notEntered',2],['inProgress',2],['completed',1]]);
 assert.equal(report.status.reduce((sum,x)=>sum+x.count,0),report.total);
 assert.equal(report.entered,report.inProgress+report.completed);
 assert.equal(report.stages.find(x=>x.id==='service').count,3);
});

test('stage and hall completion count each student once with the whole class denominator',()=>{
 const report=api().aggregate({students:[
  member(true,{search:{done:true},nav:{done:true},gallery:{records:{recognition:[{},{}],shopping:[{}]}}}),
  member(true,{search:{done:'true'},gallery:{records:{recognition:[],translation:'not a record array',sports:[{}]}}}),
  member(false)
 ]});
 assert.deepEqual(report.stages.map(x=>[x.id,x.count,x.total,x.percent]),[
  ['search',1,3,33.3],['nav',1,3,33.3],['reco',0,3,0],['service',0,3,0]
 ]);
 assert.deepEqual(report.halls.map(x=>x.count),[1,0,1,1,0,0]);
 assert.ok(report.halls.every(x=>x.total===3));
});

test('exit first and latest use timestamps and map shuffled A and B question IDs to learning goals',()=>{
 const first={created:100,results:[{id:'E3',answered:true,correct:false},{id:'E1',answered:true,correct:true},{id:'E4',answered:true,correct:true},{id:'E2',answered:true,correct:false}]};
 const latest={created:300,results:[{id:'F4',answered:true,correct:false},{id:'F2',answered:true,correct:true},{id:'F1',answered:true,correct:false},{id:'F3',answered:true,correct:true}]};
 const middle={created:200,results:[{id:'E1',answered:true,correct:true}]};
 const report=api().aggregate({students:[member(true,{}, {exit:[latest,first,middle]}),member(false)]});
 assert.deepEqual([report.exit.submitted,report.exit.notSubmitted],[1,1]);
 assert.deepEqual(report.exit.items.map(x=>[x.id,x.first.correct,x.latest.correct]),[['search',1,0],['route',0,1],['reco',0,1],['role',1,0]]);
 assert.ok(report.exit.items.every(x=>x.first.answered===1&&x.first.noEvidence===1));
});

test('unanswered and absent exit responses have no evidence instead of being wrong answers',()=>{
 const report=api().aggregate({students:[
  member(true,{}, {exit:[{created:1,results:[{id:'E1',answered:false,correct:false},{id:'E2',answered:true,correct:false},{id:'E3',answered:true,correct:true},{id:'E4',answered:1,correct:true}]}]}),
  member(true,{}, {exit:[{created:2,results:[]}]}),
  member(false)
 ]});
 assert.deepEqual(report.exit.items[0].first,{correct:0,answered:0,incorrect:0,noEvidence:3,rate:null});
 assert.deepEqual(report.exit.items[1].first,{correct:0,answered:1,incorrect:1,noEvidence:2,rate:0});
 assert.deepEqual(report.exit.items[2].first,{correct:1,answered:1,incorrect:0,noEvidence:2,rate:100});
 assert.deepEqual(report.exit.items[3].first,{correct:0,answered:0,incorrect:0,noEvidence:3,rate:null});
});

test('exit chronology accepts ISO times and unknown IDs never masquerade as answers',()=>{
 const report=api().aggregate({students:[member(true,{}, {exit:[
  {created:'2026-10-09T09:00:00+08:00',results:[{id:'F1',answered:true,correct:true}]},
  {created:'2026-10-09T08:00:00+08:00',results:[{id:'unknown',answered:true,correct:true},{id:'E1',answered:true,correct:false}]}
 ]})]});
 assert.equal(report.exit.items[0].first.rate,0);
 assert.equal(report.exit.items[0].latest.rate,100);
 assert.ok(report.exit.items.slice(1).every(x=>x.first.rate===null&&x.latest.rate===null));
});

test('quiz uses each students latest valid submission even when a newer draft exists',()=>{
 const report=api().aggregate({students:[
  member(true,{}, {quiz:[{created:30,status:'draft',score:null},{created:20,status:'submitted',score:80},{created:10,status:'submitted',score:40}]}),
  member(true,{}, {quiz:[{created:10,status:'draft',score:null},{created:20,status:'submitted',score:0}]}),
  member(true,{}, {quiz:[{created:10,status:'draft',score:null}]}),
  member(false)
 ]});
 assert.deepEqual([report.quiz.submitted,report.quiz.notSubmitted,report.quiz.inProgress,report.quiz.average],[2,2,1,40]);
 assert.deepEqual(report.quiz.distribution.map(x=>x.count),[1,0,1,0]);
});

test('quiz validity and score band edges preserve real zero while rejecting impossible scores',()=>{
 const scores=[0,59,60,79,80,99,100,null,NaN,Infinity,-1,101,'80'];
 const report=api().aggregate({students:scores.map(score=>member(true,{}, {quiz:[{created:1,status:'submitted',score}]}))});
 assert.equal(report.quiz.submitted,7);
 assert.equal(report.quiz.notSubmitted,6);
 assert.equal(report.quiz.inProgress,0);
 assert.deepEqual(report.quiz.distribution.map(x=>x.count),[2,2,2,1]);
 assert.equal(report.quiz.average,68.1);
});

test('aggregation does not mutate or share class data between calls',()=>{
 const classroom={classId:'501',students:[member(true,complete,{quiz:[{created:2,status:'submitted',score:100},{created:1,status:'submitted',score:0}],exit:[{created:2,results:[]},{created:1,results:[]}]})]};
 const before=structuredClone(classroom);
 const a=api().aggregate(classroom);
 const b=api().aggregate({classId:'502',students:[member(false),member(false)]});
 assert.deepEqual(classroom,before);
 assert.deepEqual([a.total,a.completed,a.quiz.average],[1,1,100]);
 assert.deepEqual([b.total,b.completed,b.quiz.average],[2,0,null]);
 assert.notEqual(a.stages,b.stages);
});

test('the same no-dependency module provides the browser API',()=>{
 api();
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(modulePath,'utf8'),sandbox);
 assert.equal(typeof sandbox.window.TeacherAnalytics.aggregate,'function');
 assert.equal(typeof sandbox.window.TeacherAnalytics.isComplete,'function');
 assert.equal(sandbox.window.TeacherAnalytics.aggregate({students:[]}).total,0);
});
