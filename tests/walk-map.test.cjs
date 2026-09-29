'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../vendor/easystarjs/easystar-0.4.4.min.js'),'utf8'));
const walk=require('../walk-map.cjs');
const gallery=require('../gallery-model.cjs');

function pathFrom(start,end,closed=false){return walk.findPath(start,end,{closed,easystar:globalThis.EasyStar});}

test('a tap on the path produces a continuous path that never crosses scenery',()=>{
 const target=walk.landmarks.notice;
 const route=pathFrom(walk.landmarks.entrance,target);
 assert.ok(route&&route.length>15);
 const grid=walk.makeGrid(false);
 for(const p of route)assert.equal(grid[p.y][p.x],0,`blocked tile ${p.x},${p.y}`);
 assert.deepEqual([route.at(-1).x,route.at(-1).y],[target.x,target.y]);
});

test('tapping deep into a building does not select a walkable destination',()=>{
 assert.equal(walk.nearestWalkable({x:10,y:4},walk.makeGrid(false),4),null);
});

test('a closed central road causes automatic detour but cannot be crossed',()=>{
 const route=pathFrom(walk.landmarks.entrance,walk.landmarks.plaza,true);
 assert.ok(route&&route.length>20);
 assert.equal(route.some(p=>p.x>=42&&p.x<=48&&p.y>=26&&p.y<=33),false);
});

test('navigating to a new point starts from the current position',()=>{
 const first=pathFrom(walk.landmarks.entrance,walk.landmarks.notice);
 const midway=first[Math.floor(first.length/2)];
 const redirected=pathFrom(midway,walk.landmarks.recommendation);
 assert.ok(redirected&&redirected.length>0);
 assert.deepEqual([redirected[0].x,redirected[0].y],[midway.x,midway.y]);
});

test('named routes have distinct road traces and blocked B ends before the barrier',()=>{
 const A=walk.namedRoute('A',false),B=walk.namedRoute('B',false),C=walk.namedRoute('C',false),blocked=walk.namedRoute('B',true);
 assert.notDeepEqual(A,B);assert.notDeepEqual(B,C);
 assert.deepEqual(A.at(-1),walk.landmarks.plaza);
 assert.deepEqual(C.at(-1),walk.landmarks.plaza);
 assert.notDeepEqual(blocked.at(-1),walk.landmarks.plaza);
 assert.ok(blocked.at(-1).y>walk.landmarks.plaza.y);
 assert.equal(B.filter(p=>p.y>=27&&p.y<=33).every(p=>p.x<50),true,'中心路应绕开花坛左侧');
 assert.equal(blocked.at(-1).x,walk.landmarks.barrier.x);
});

test('each named route stays on its collision map, including the closed-road ending',()=>{
 for(const [id,closed] of [['A',false],['B',false],['C',false],['B',true]]){
  const grid=walk.makeGrid(closed),route=walk.namedRoute(id,closed);
  for(const p of route)assert.equal(grid[p.y][p.x],0,`${id} crosses scenery at ${p.x},${p.y}`);
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i];
   if(a.x!==b.x&&a.y!==b.y){
    assert.equal(grid[a.y][b.x],0,`${id} cuts a blocked corner`);
    assert.equal(grid[b.y][a.x],0,`${id} cuts a blocked corner`);
   }
  }
 }
});

test('every optional experience hall has a reachable doorway',()=>{
 for(const hall of gallery.halls){
  const door=walk.landmarks[hall.landmark];
  assert.ok(door,`${hall.name} has no map doorway`);
  assert.ok(pathFrom(walk.landmarks.entrance,door),`${hall.name} cannot be reached`);
 }
});

test('tapping a hall again while already at its doorway still completes arrival',()=>{
 const door=walk.landmarks.sports;
 const path=pathFrom(door,door);
 assert.deepEqual(path,[door]);
});

test('the walkable map excludes visible buildings, water, planter and stage',()=>{
 const grid=walk.makeGrid(false);
 for(const [place,{x,y}] of Object.entries({
  searchBooth:{x:33,y:26},eastBuilding:{x:82,y:25},
  centralPlanter:{x:52,y:28},westWater:{x:23,y:33},stageRoof:{x:52,y:7}
 }))assert.equal(grid[y][x],1,`${place} (${x},${y}) should block walking`);
});

test('a click inside the east building is rejected instead of snapping onto a nearby path',()=>{
 assert.equal(pathFrom(walk.landmarks.entrance,{x:82,y:25}),null);
});
