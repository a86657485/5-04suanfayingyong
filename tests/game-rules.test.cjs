'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {initialState,step,searchResults,routeChoices,recommendation,dialogueFor}=require('../game-rules.cjs');

function act(state,type,data={}){return step(state,{type,...data}).state;}

test('search uses matching terms, accepts two different visitor needs, and records revision',()=>{
 assert.deepEqual(searchResults(['植物','识别']).slice(0,2).map(x=>x.id),['A','B']);
 let state=initialState();
 state=act(state,'search/query',{terms:['拍照']});
 state=act(state,'search/invite',{id:'C'});
 assert.equal(state.search.guest,0);
 assert.equal(state.search.attempts[0].correct,false);
 state=act(state,'search/query',{terms:['植物','识别']});
 state=act(state,'search/invite',{id:'A'});
 state=act(state,'search/query',{terms:['植物','手工']});
 state=act(state,'search/invite',{id:'B'});
 state=act(state,'search/reason',{reason:'匹配游客的需要并核对活动内容'});
 assert.equal(state.search.done,true);
 assert.equal(state.search.attempts.length,3);
});

test('navigation changes the valid fastest route when central road closes',()=>{
 assert.equal(routeChoices(0).find(r=>r.id==='B').minutes,4);
 assert.equal(routeChoices(2).find(r=>r.id==='B').open,false);
 let state=initialState();state.search.done=true;
 state=act(state,'nav/choose',{route:'A'});
 assert.equal(state.nav.phase,0);
 state=act(state,'nav/choose',{route:'B'});
 state=act(state,'nav/choose',{route:'A'});
 state=act(state,'nav/choose',{route:'B'});
 assert.equal(state.nav.phase,2);
 state=act(state,'nav/choose',{route:'C'});
 state=act(state,'nav/choose',{route:'C'});
 assert.equal(state.nav.done,false);
 state=act(state,'nav/reason',{reason:'因为河边风景最好，所以改走花园路'});
 assert.equal(state.nav.done,false);
 state=act(state,'nav/reason',{reason:'道路通行和预计用时改变，要按游客目标重选'});
 assert.equal(state.nav.done,true);
 assert.equal(state.nav.attempts.some(x=>x.reason==='道路封闭'),true);
});

test('recommendation changes with history but honors explicit current need',()=>{
 assert.equal(recommendation(0).rank[0],'S');
 assert.equal(recommendation(1).rank[0],'U');
 assert.equal(recommendation(2).rank[0],'U');
 assert.equal(recommendation(3).rank[0],'T');
 let state=initialState();state.search.done=true;state.nav.done=true;
 for(const [pred,invite] of [['S','S'],['U','U'],['U','U'],['T','S']]){
  state=act(state,'reco/predict',{id:pred});
  state=act(state,'reco/invite',{id:invite});
 }
 assert.equal(state.reco.done,false);
 state=act(state,'reco/reason',{reason:'历史记录提供建议，当前需要仍要由人判断'});
 assert.equal(state.reco.done,true);
 assert.equal(state.reco.attempts.at(-1).invite,'S');
});

test('service card requires coherent information, action and benefit',()=>{
 let state=initialState();state.search.done=true;state.nav.done=true;state.reco.done=true;
 const invalid=step(state,{type:'service/submit',topic:'plant',input:'声音',action:'翻译',benefit:'辨认植物'});
 assert.equal(invalid.state.service.done,false);
 const valid=step(state,{type:'service/submit',topic:'plant',input:'植物照片',action:'比对图像特征',benefit:'查找可能的植物名称'});
 assert.equal(valid.state.service.done,true);
});

test('visitor dialogue records a wrong interpretation then reveals the relevant task',()=>{
 let state=initialState(),scene=dialogueFor(state);
 assert.equal(scene.stage,'search');
 assert.equal(scene.phase,0);
 assert.equal(scene.done,false);
 state=act(state,'dialogue/choose',{id:'photo-only'});
 assert.equal(dialogueFor(state).done,false);
 assert.equal(state.dialogue.history[0].correct,false);
 state=act(state,'dialogue/choose',{id:'check-need'});
 assert.equal(dialogueFor(state).done,true);
 assert.equal(state.dialogue.history[1].correct,true);
 state=act(state,'search/query',{terms:['植物','识别']});
 state=act(state,'search/invite',{id:'A'});
 scene=dialogueFor(state);
 assert.equal(scene.phase,1);
 assert.equal(scene.done,false);
});

test('optional hall demo records input and output without advancing the required route',()=>{
 let state=initialState();
 state=act(state,'gallery/run',{hall:'sports',input:{threshold:7}});
 assert.equal(state.gallery.records.sports.at(-1).output.count,2);
 assert.equal(state.search.done,false);
 assert.equal(state.nav.done,false);
 assert.equal(state.gallery.records.sports.at(-1).input.threshold,7);
});
