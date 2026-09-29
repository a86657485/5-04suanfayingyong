'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const model=require('../gallery-model.cjs');

test('each application hall introduces its real-life use before the existing demo',()=>{
 const context={window:{GalleryModel:model}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../gallery-ui.js'),'utf8'),context);
 for(const hall of model.halls){
  const story=model.introductions[hall.id];
  assert.ok(story?.npc&&story.line&&story.input&&story.process&&story.output,`${hall.name} needs a complete introduction`);
  const html=context.window.GalleryUI.renderIntro(hall.id);
  for(const part of [story.npc,story.line,story.input,story.process,story.output])assert.ok(html.includes(part),`${hall.name} is missing ${part}`);
  assert.match(html,/class="gallery-scene/);
  assert.match(html,/data-action="gallery-enter"/);
  assert.doesNotMatch(html,/id="gallery-form"/);
  if(hall.id==='recognition')assert.doesNotMatch(html,/银杏|枫叶|松针/,'the introduction must not reveal the leaf demo answer');
  assert.match(context.window.GalleryUI.renderHall(hall.id,[]),/data-action="gallery-intro"/);
 }
});

test('a demo result points back to the algorithm’s real-life role',()=>{
 const context={window:{GalleryModel:model}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../gallery-ui.js'),'utf8'),context);
 const input={sample:'ginkgo',shape:'fan',color:'yellow'};
 const output=model.runDemo('recognition',input);
 const html=context.window.GalleryUI.renderHall('recognition',[{input,output}]);
 assert.match(html,/算法在这里的作用/);
 assert.ok(html.includes(model.introductions.recognition.focus));
});
