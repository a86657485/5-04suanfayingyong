'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function character(){
 const classes=new Set();
 let src='';
 return {
  style:{},
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name)},
  getAttribute:name=>name==='src'?src:null,
  setAttribute:(name,value)=>{if(name==='src')src=value;}
 };
}

test('reduced motion keeps the guide walking along the path instead of teleporting',async()=>{
 const scheduled=[];
 const map={
  landmarks:{entrance:{x:0,y:0}},
  cellToPercent:p=>({x:p.x*10,y:p.y*10}),
  findPath:(start,end)=>[{...start},{...end}]
 };
 const context={
  window:{WalkMap:map,EasyStar:{}},
  matchMedia:()=>({matches:true}),
  Image:class {},
  requestAnimationFrame:callback=>scheduled.push(callback),
  cancelAnimationFrame:()=>{}
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../walk.js'),'utf8'),context);
 const guide=character(),visitor=character();
 const walker=context.window.WalkEngine.create({scene:{},guide,visitor,start:{x:0,y:0}});
 const arrival=walker.moveTo({x:10,y:0});
 assert.equal(walker.position().x,0,'movement must not finish in the click handler');
 assert.equal(guide.classList.contains('walking'),true);
 assert.equal(scheduled.length,1,'movement should schedule an animation frame');
 for(const time of [1000,1100,1200])scheduled.shift()(time);
 assert.ok(walker.position().x>0&&walker.position().x<10,'guide should pass through intermediate positions');
 for(let time=1300;scheduled.length&&time<2500;time+=100)scheduled.shift()(time);
 assert.equal((await arrival).arrived,true);
 assert.equal(walker.position().x,10);
});
