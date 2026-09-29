'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp,isTeacherAddress,isPrivateLanAddress}=require('../server.cjs');

async function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'festival-test-'));
 const roster=path.join(dir,'roster.json');
 fs.writeFileSync(roster,JSON.stringify([{id:'501-a',classId:'501',name:'测试甲'},{id:'501-b',classId:'501',name:'测试乙'},{id:'502-a',classId:'502',name:'同名甲'}]));
 const {server,db}=createApp({dataDir:dir,rosterPath:roster});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 return {base,db,close:async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
async function post(base,path,body,cookie=''){
 const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}

test('teacher pages and management APIs allow loopback only',()=>{
 assert.equal(isTeacherAddress('127.0.0.1'),true);
 assert.equal(isTeacherAddress('::1'),true);
 assert.equal(isTeacherAddress('192.168.1.28'),false);
});

test('teacher test mode serves its script from the local classroom service',async()=>{
 const f=await fixture();
 try{
  const response=await fetch(f.base+'/demo.js');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/javascript/);
  assert.match(await response.text(),/demo-stage/);
 }finally{await f.close();}
});

test('startup address list prefers classroom private-network ranges',()=>{
 assert.equal(isPrivateLanAddress('192.168.0.14'),true);
 assert.equal(isPrivateLanAddress('10.2.4.5'),true);
 assert.equal(isPrivateLanAddress('172.23.0.4'),true);
 assert.equal(isPrivateLanAddress('198.18.0.1'),false);
});

test('student identity is isolated, wrong action has evidence, and repeated event cannot award twice',async()=>{
 const f=await fixture();
 try{
  const first=await post(f.base,'/api/login',{classId:'501',id:'501-a'});
  const second=await post(f.base,'/api/login',{classId:'501',id:'501-b'});
  assert.equal(first.status,200);assert.equal(second.status,200);
  let n=0;const send=(action,eventId)=>post(f.base,'/api/action',{eventId:eventId||`test-event-${++n}`,action},first.cookie);
  await send({type:'search/query',terms:['拍照']});
  const wrong=await send({type:'search/invite',id:'C'});
  assert.equal(wrong.data.state.search.attempts[0].correct,false);
  await send({type:'search/query',terms:['植物','识别']});
  await send({type:'search/invite',id:'A'});
  await send({type:'search/query',terms:['植物','手工']});
  await send({type:'search/invite',id:'B'});
  const complete=await send({type:'search/reason',reason:'匹配游客的需要并核对活动内容'},'finish-search');
  assert.equal(complete.data.points,20);
  const duplicate=await send({type:'search/reason',reason:'匹配游客的需要并核对活动内容'},'finish-search');
  assert.equal(duplicate.data.points,20);
  const optional=await send({type:'gallery/run',hall:'sports',input:{threshold:7}});
  assert.equal(optional.data.points,20);
  assert.equal(optional.data.state.gallery.records.sports[0].output.count,2);
  const other=await fetch(f.base+'/api/state',{headers:{cookie:second.cookie}}).then(x=>x.json());
  assert.equal(other.points,0);
  assert.equal(other.state.search.attempts.length,0);
  const unauth=await fetch(f.base+'/api/teacher/class?class=501',{headers:{cookie:first.cookie}});
  assert.equal(unauth.status,200); // local teacher computer may read its own classroom screen
  const teacher=await unauth.json();
  assert.equal(teacher.students.find(x=>x.student.id==='501-a').points,20);
 }finally{await f.close();}
});

test('manual name restores its class record and quiz hides answers before submission',async()=>{
 const f=await fixture();
 try{
  const one=await post(f.base,'/api/login',{classId:'501',name:'新同学'});
  const two=await post(f.base,'/api/login',{classId:'501',name:'新同学'});
  assert.equal(one.data.student.id,two.data.student.id);
  const other=await post(f.base,'/api/login',{classId:'502',name:'新同学'});
  assert.notEqual(one.data.student.id,other.data.student.id);
  const begin=await post(f.base,'/api/quiz/start',{},one.cookie);
  assert.equal(begin.data.questions.length,20);
  assert.equal(begin.data.questions.some(q=>'answer'in q),false);
  assert.equal(begin.data.attempt.form,'A');
  const empty=await post(f.base,'/api/quiz/submit',{attemptId:begin.data.attempt.id},one.cookie);
  assert.equal(empty.status,400);
  const answers=Object.fromEntries(begin.data.questions.map(q=>[q.id,0]));
  assert.equal((await post(f.base,'/api/quiz/save',{attemptId:begin.data.attempt.id,answers},one.cookie)).status,200);
  const submitted=await post(f.base,'/api/quiz/submit',{attemptId:begin.data.attempt.id},one.cookie);
  assert.equal(submitted.status,200);
  assert.equal(submitted.data.attempt.results.length,20);
  const next=await post(f.base,'/api/quiz/start',{},one.cookie);
  assert.equal(next.data.attempt.form,'B');
  assert.equal(next.data.questions.length,20);
  assert.equal(next.data.questions.some(q=>'answer'in q),false);
 }finally{await f.close();}
});
