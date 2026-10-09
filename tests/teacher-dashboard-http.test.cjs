'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../server.cjs');

test('teacher dashboard serves its complete offline chart stack and both overview and detail views',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'festival-dashboard-http-'));
 const {server,db}=createApp({dataDir:dir,rosterPath:path.join(__dirname,'../roster.example.json')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const html=await fetch(base+'/teacher').then(r=>r.text());
  assert.match(html,/id="teacher-charts"/);
  assert.match(html,/data-teacher-view="overview"/);
  assert.match(html,/data-teacher-view="students"/);
  for(const [url,type] of [['/teacher-analytics.cjs','text/javascript'],['/teacher-charts.js','text/javascript'],['/teacher-charts.css','text/css'],['/teacher.css','text/css']]){
   assert.ok(html.includes(url),`teacher page must load ${url}`);
   const response=await fetch(base+url);
   assert.equal(response.status,200);
   assert.ok(response.headers.get('content-type').includes(type));
  }
  assert.ok(html.indexOf('/teacher-analytics.cjs')<html.indexOf('/teacher.js'));
  assert.ok(html.indexOf('/teacher-charts.js')<html.indexOf('/teacher.js'));
 }finally{
  await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(dir,{recursive:true,force:true});
 }
});
