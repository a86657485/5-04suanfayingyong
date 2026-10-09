'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const model=require('../gallery-model.cjs');
const root=path.join(__dirname,'..');
const configPath=path.join(root,'gallery-principles.cjs');
const config=()=>require(configPath);
const readSvg=id=>fs.readFileSync(path.join(root,config()[id].src),'utf8');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const element=(svg,id)=>attrs(svg.match(new RegExp('<[^>]+\\bid="'+id+'"[^>]*>'))?.[0]||'');
function validateSvg(svg,label){
 const stack=[];
 for(const tag of svg.match(/<[^>]+>/g)||[]){
  if(/^<\?|^<!/.test(tag))continue;
  const closing=/^<\//.test(tag),name=tag.match(/^<\/?([\w:-]+)/)?.[1];
  assert.ok(name,`${label} element name`);
  if(closing)assert.equal(stack.pop(),name,`${label} closing element`);
  else if(!/\/>$/.test(tag))stack.push(name);
 }
 assert.equal(stack.length,0,`${label} unclosed elements`);
 const parsed=spawnSync('xmllint',['--nonet','--noout','-'],{input:svg,encoding:'utf8'});
 if(parsed.error?.code!=='ENOENT')assert.equal(parsed.status,0,`${label} XML: ${parsed.stderr}`);
}

test('every real hall has an offline principle diagram and accessible teaching prompts',()=>{
 assert.ok(fs.existsSync(configPath),'missing the shared principle configuration');
 const data=config();
 assert.deepEqual(Object.keys(data).sort(),model.halls.map(h=>h.id).sort());
 let total=0;
 for(const hall of model.halls){
  const item=data[hall.id];
  for(const key of ['title','src','alt','focus','question'])assert.ok(typeof item[key]==='string'&&item[key].length>5,`${hall.id}.${key}`);
  assert.match(item.src,/^\/assets\/principles\/[a-z]+\.svg$/);
  const svg=readSvg(hall.id);total+=Buffer.byteLength(svg);
  validateSvg(svg,hall.id);
  assert.match(svg,/viewBox="0 0 960 440"/);
  assert.ok(!/<(?:script|image|foreignObject)\b|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg','')),'diagram must be offline vector content');
  for(const id of ['input','process','output'])assert.ok(svg.includes(`id="${id}"`),`${hall.id} ${id} mechanism`);
  assert.ok((svg.match(/<(?:path|circle|rect|polyline)\b/g)||[]).length>=10,`${hall.id} must explain through graphics`);
 }
 assert.ok(total<100000,'six diagrams should stay below 100 KB');
});

test('principle configuration also exposes the same six entries in browsers',()=>{
 assert.ok(fs.existsSync(configPath),'missing browser configuration');
 const context={window:{}};vm.runInNewContext(fs.readFileSync(configPath,'utf8'),context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.window.GalleryPrinciples)),config());
});

test('sports figure counts exactly the displayed local maxima reaching its threshold',()=>{
 const svg=readSvg('sports');
 const data=element(svg,'sensor-plot');
 const readings=data['data-values'].split(',').map(Number),threshold=Number(data['data-threshold']);
 assert.deepEqual(readings,model.readings);
 const expected=model.runDemo('sports',{threshold});
 const peaks=[...svg.matchAll(/<circle\b[^>]*class="peak"[^>]*>/g)].map(m=>Number(attrs(m[0])['data-index']));
 assert.deepEqual(peaks,expected.peaks);
 assert.equal(Number(element(svg,'peak-count')['data-count']),expected.count);
 const line=element(svg,'threshold-line');
 assert.equal(line.y1,line.y2,'threshold must be a horizontal line');
 const points=element(svg,'reading-line').points.split(' ').map(p=>p.split(',').map(Number));
 assert.equal(points.length,readings.length);
 const y=v=>Number(data['data-y-zero'])-v*Number(data['data-y-step']);
 assert.equal(Number(line.y1),y(threshold));
 assert.deepEqual(points.map(p=>p[1]),readings.map(y));
});

test('shopping bars and ranked rows agree with the demo on counts and order',()=>{
 const svg=readSvg('shopping');
 const bars=[...svg.matchAll(/<rect\b[^>]*class="browse-bar"[^>]*>/g)].map(m=>attrs(m[0]));
 const input=Object.fromEntries(bars.map(b=>[b['data-product'],Number(b['data-count'])]));
 assert.deepEqual(Object.keys(input).sort(),Object.keys(model.products).sort());
 for(const bar of bars)assert.equal(Number(bar.width),Number(bar['data-count'])*30);
 const expected=model.runDemo('shopping',input).rank;
 const order=[...svg.matchAll(/<g\b[^>]*class="rank-row"[^>]*>/g)].map(m=>attrs(m[0])['data-product']);
 assert.deepEqual(order,expected.map(p=>p.id));
});

test('art output pixels implement the same RGB inversion as the live demo',()=>{
 const svg=readSvg('art');
 const pixels=prefix=>[...svg.matchAll(new RegExp('<rect\\b[^>]*class="'+prefix+'"[^>]*>','g'))].map(m=>attrs(m[0]).fill.match(/\d+/g).map(Number));
 const original=pixels('original-pixel'),inverted=pixels('inverted-pixel');
 assert.equal(original.length,9);assert.equal(inverted.length,9);
 const source=new Uint8ClampedArray(original.flatMap(p=>[...p,255]));
 const result=model.applyArtStyle(source,'invert');
 assert.deepEqual(inverted,result.reduce((all,v,i)=>(i%4===0&&all.push(Array.from(result.slice(i,i+3))),all),[]));
 assert.equal(element(svg,'pixel-input')['data-rgb'],'120,60,30');
 assert.equal(element(svg,'pixel-output')['data-rgb'],Array.from(model.applyArtStyle(new Uint8ClampedArray([120,60,30,255]),'invert').slice(0,3)).join(','));
});

test('fictional image marks exactly the brightness cells reaching the displayed cutoff',()=>{
 const svg=readSvg('medical');
 const data=element(svg,'brightness-grid');
 const threshold=Number(data['data-threshold']);
 assert.deepEqual(data['data-values'].split(',').map(Number),model.imageValues);
 const marks=[...svg.matchAll(/<rect\b[^>]*class="review-mark"[^>]*>/g)].map(m=>Number(attrs(m[0])['data-index']));
 assert.deepEqual(marks,model.runDemo('medical',{threshold}).flagged);
 assert.match(svg,/亮点不等于病变/);
 assert.match(svg,/不能用于医疗判断/);
 assert.match(svg,/≥/);
});

test('recognition diagram explains evidence matching without revealing leaf task answers',()=>{
 const svg=readSvg('recognition');
 assert.ok(!model.leaves.some(leaf=>svg.includes(leaf.name)),'do not name quiz specimens');
 const candidates=[...svg.matchAll(/<g\b[^>]*class="candidate"[^>]*>/g)].map(m=>attrs(m[0]));
 assert.deepEqual(candidates.map(c=>Number(c['data-matches'])),[2,1,0]);
 assert.match(svg,/轮廓/);assert.match(svg,/颜色/);assert.match(svg,/候选/);assert.match(svg,/核对/);
});

test('translation follows the fixed phrase chunks and displays the actual output',()=>{
 const svg=readSvg('translation');
 const phrase=model.runDemo('translation',{phrase:'garden'});
 for(const pair of phrase.chunks)for(const chunk of pair)assert.ok(svg.includes(chunk));
 assert.ok(svg.includes(phrase.output));
 assert.match(svg,/固定短句/);assert.match(svg,/不能翻译任意句子/);
});
