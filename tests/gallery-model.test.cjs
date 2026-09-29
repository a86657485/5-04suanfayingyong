'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const gallery=require('../gallery-model.cjs');

test('image feature matching changes candidate order with observed shape and color',()=>{
 const ginkgo=gallery.runDemo('recognition',{sample:'ginkgo',shape:'fan',color:'yellow'});
 const maple=gallery.runDemo('recognition',{sample:'ginkgo',shape:'palm',color:'red'});
 assert.equal(ginkgo.candidates[0].name,'银杏');
 assert.equal(maple.candidates[0].name,'枫叶');
 assert.equal(ginkgo.mode,'教学模拟');
});

test('translation exposes processed chunks and output for a limited phrase set',()=>{
 const result=gallery.runDemo('translation',{phrase:'garden'});
 assert.equal(result.output,'Where is the garden?');
 assert.equal(result.chunks.length>1,true);
});

test('shopping recommendation reorders products when browsing history changes',()=>{
 assert.equal(gallery.runDemo('shopping',{science:3,sport:1,art:0}).rank[0].id,'science');
 assert.equal(gallery.runDemo('shopping',{science:3,sport:1,art:4}).rank[0].id,'art');
});

test('sports peak counting changes with the threshold on identical sensor data',()=>{
 const low=gallery.runDemo('sports',{threshold:4});
 const high=gallery.runDemo('sports',{threshold:7});
 assert.ok(low.count>high.count);
 assert.deepEqual(low.readings,high.readings);
});

test('art style is a valid pixel operation and medical marks are only simulated hints',()=>{
 assert.equal(gallery.runDemo('art',{style:'grayscale'}).style,'grayscale');
 assert.throws(()=>gallery.runDemo('art',{style:'magic'}));
 const pixels=new Uint8ClampedArray([120,60,30,255]);
 const changed=gallery.applyArtStyle(pixels,'grayscale');
 assert.equal(changed[0],changed[1]);
 assert.equal(changed[1],changed[2]);
 assert.notEqual(changed[0],120);
 const low=gallery.runDemo('medical',{threshold:5});
 const high=gallery.runDemo('medical',{threshold:8});
 assert.ok(low.flagged.length>high.flagged.length);
 assert.equal(low.diagnosis,undefined);
});
