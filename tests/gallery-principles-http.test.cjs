'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../server.cjs');
const {halls}=require('../gallery-model.cjs');

test('science diagrams are available offline over classroom HTTP with only known assets exposed',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'festival-principles-http-'));
 const {server,db}=createApp({dataDir:dir,rosterPath:path.join(__dirname,'../roster.example.json')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const script=await fetch(base+'/gallery-principles.cjs');
  assert.equal(script.status,200);
  assert.match(script.headers.get('content-type'),/text\/javascript/);
  for(const hall of halls){
   const response=await fetch(`${base}/assets/principles/${hall.id}.svg`);
   assert.equal(response.status,200,`${hall.name} must load its diagram without an external network`);
   assert.match(response.headers.get('content-type'),/image\/svg\+xml/);
   assert.match(await response.text(),/<svg[\s>]/);
  }
  assert.equal((await fetch(base+'/assets/principles/not-a-hall.svg')).status,404);
  assert.equal((await fetch(base+'/assets/principles/README.md')).status,404);
 }finally{
  await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(dir,{recursive:true,force:true});
 }
});
