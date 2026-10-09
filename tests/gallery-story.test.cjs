'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const model=require('../gallery-model.cjs');

test('each application hall introduces its real-life use before the existing demo',()=>{
 const principlesPath=path.join(__dirname,'../gallery-principles.cjs');
 const principles=fs.existsSync(principlesPath)?require(principlesPath):{};
 const context={window:{GalleryModel:model,GalleryPrinciples:principles}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../gallery-ui.js'),'utf8'),context);
 for(const hall of model.halls){
  const story=model.introductions[hall.id];
  assert.ok(story?.npc&&story.line&&story.input&&story.process&&story.output,`${hall.name} needs a complete introduction`);
  const html=context.window.GalleryUI.renderIntro(hall.id);
  for(const part of [story.npc,story.line])assert.ok(html.includes(part),`${hall.name} is missing ${part}`);
  assert.ok(html.includes(`/assets/principles/${hall.id}.svg`),`${hall.name} needs its science diagram before practice`);
  assert.match(html,/想一想/);
  assert.match(html,/data-action="gallery-enter"/);
  assert.doesNotMatch(html,/id="gallery-form"/);
  if(hall.id==='recognition')assert.doesNotMatch(html,/银杏|枫叶|松针/,'the introduction must not reveal the leaf demo answer');
  assert.match(context.window.GalleryUI.renderHall(hall.id,[]),/重看原理图/);
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

test('hall practice asks one compact decision after the introduction',()=>{
 const context={window:{GalleryModel:model}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../gallery-ui.js'),'utf8'),context);
  const recognition=context.window.GalleryUI.renderHall('recognition',[]);
  assert.match(recognition,/id="hall-features"/);
  assert.doesNotMatch(recognition,/id="hall-shape"|id="hall-color"/);
 const shopping=context.window.GalleryUI.renderHall('shopping',[]);
 assert.match(shopping,/id="hall-history"/);
 assert.doesNotMatch(shopping,/id="hall-science"|id="hall-sport"|id="hall-art"/);
  for(const hall of model.halls){
  const html=context.window.GalleryUI.renderHall(hall.id,[]);
  assert.doesNotMatch(html,/class="dialogue-bubble"/);
  assert.match(html,/id="gallery-form"/);
  const input={recognition:{sample:'ginkgo',shape:'fan',color:'yellow'},translation:{phrase:'garden'},shopping:{science:5,sport:1,art:0},sports:{threshold:5},art:{style:'grayscale'},medical:{threshold:7}}[hall.id];
  const withResult=context.window.GalleryUI.renderHall(hall.id,[{input,output:model.runDemo(hall.id,input)}]);
  assert.match(withResult,/class="gallery-more"/);
  assert.match(withResult,/算法在这里的作用/);
 }
});
