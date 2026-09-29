'use strict';

// Road centres are calibrated to game-map-paths.webp. The same model supplies
// free walking and the three named routes; 1 means scenery, 0 means pavement.
const width=100,height=56;
const landmarks={
 entrance:{x:52,y:49},plaza:{x:52,y:12},notice:{x:31,y:30},
 greenhouse:{x:20,y:13},recommendation:{x:81,y:31},service:{x:83,y:39},
 translation:{x:73,y:16},sports:{x:60,y:18},art:{x:82,y:38},medical:{x:72,y:19},
 barrier:{x:47,y:35}
};
const gate=[landmarks.entrance,{x:52,y:43},{x:52,y:38}];
const central=[...gate,{x:49,y:36},landmarks.barrier,{x:47,y:31},{x:47,y:27},{x:48,y:23},{x:51,y:19},{x:52,y:16},landmarks.plaza];
const centralRight=[gate.at(-1),{x:56,y:35},{x:57,y:31},{x:56,y:27},{x:55,y:23},{x:53,y:19},{x:52,y:16}];
const westLink=[landmarks.greenhouse,{x:26,y:14},{x:34,y:16},{x:42,y:17},{x:48,y:15},landmarks.plaza];
const eastLink=[landmarks.medical,{x:74,y:16},{x:67,y:16},{x:60,y:17},{x:55,y:16},landmarks.plaza];
const west=[...gate,{x:44,y:39},{x:40,y:37},{x:36,y:34},{x:32,y:31},{x:28,y:29},{x:23,y:28},{x:19,y:25},{x:18,y:22},{x:20,y:18},...westLink];
const east=[...gate,{x:60,y:39},{x:66,y:37},{x:70,y:35},{x:70,y:32},{x:66,y:29},{x:65,y:26},{x:68,y:22},...eastLink];
const sideRoads=[
 [{x:32,y:31},landmarks.notice],
 [{x:70,y:32},landmarks.recommendation],
 [{x:70,y:35},landmarks.art,landmarks.service],
 [{x:74,y:16},landmarks.translation],
 [{x:60,y:17},landmarks.sports]
];

function expandTrace(points){
 const cells=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))*3;
  for(let j=0;j<=steps;j++){
   const x=Math.round(a.x+(b.x-a.x)*j/steps),y=Math.round(a.y+(b.y-a.y)*j/steps);
   if(!cells.length||cells.at(-1).x!==x||cells.at(-1).y!==y)cells.push({x,y});
  }
 }
 return cells;
}

function makeGrid(closed=false){
 const grid=Array.from({length:height},()=>Array(width).fill(1));
 function paint(x,y,radius){
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(dx*dx+dy*dy>radius*radius)continue;
   const px=x+dx,py=y+dy;
   if(px>=0&&px<width&&py>=0&&py<height)grid[py][px]=0;
  }
 }
 for(const trace of [central,centralRight,west,east,...sideRoads])for(const p of expandTrace(trace))paint(p.x,p.y,1);
 for(const p of [landmarks.entrance,landmarks.plaza,landmarks.notice,landmarks.recommendation,landmarks.art,landmarks.service])paint(p.x,p.y,2);
 // These scene features overlap nearby paving in the painting, but are solid.
 for(const [x1,y1,x2,y2] of [[29,20,38,28],[75,17,93,30],[50,23,54,33],[0,31,27,55],[44,0,59,9],[8,0,28,11]]){
  for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=1;
 }
 if(closed)for(let y=27;y<=33;y++)for(let x=45;x<=50;x++)grid[y][x]=1;
 return grid;
}

function nearestWalkable(point,grid,maxRadius=7){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 const x0=Math.round(point.x),y0=Math.round(point.y);
 let best=null,bestDistance=Infinity;
 for(let dy=-maxRadius;dy<=maxRadius;dy++)for(let dx=-maxRadius;dx<=maxRadius;dx++){
  const x=x0+dx,y=y0+dy,distance=dx*dx+dy*dy;
  if(distance>maxRadius*maxRadius||y<0||y>=height||x<0||x>=width||grid[y][x]!==0)continue;
  if(distance<bestDistance){best={x,y};bestDistance=distance;}
 }
 return best;
}

function findPath(start,end,{closed=false,easystar}={}){
 if(!easystar?.js)throw Error('EasyStar.js pathfinder is required');
 const grid=makeGrid(closed),from=nearestWalkable(start,grid,8),to=nearestWalkable(end,grid,1);
 if(!from||!to)return null;
 if(from.x===to.x&&from.y===to.y)return [from];
 const finder=new easystar.js();
 finder.setGrid(grid);finder.setAcceptableTiles([0]);finder.enableDiagonals();finder.disableCornerCutting();finder.enableSync();
 let result=null;
 finder.findPath(from.x,from.y,to.x,to.y,path=>{result=path?.map(p=>({x:p.x,y:p.y}))||null;});
 finder.calculate();
 return result;
}

function namedRoute(id,closed=false){
 const trace=id==='A'?west:id==='B'?closed?[...gate,{x:49,y:36},landmarks.barrier]:central:id==='C'?east:null;
 return trace?expandTrace(trace):null;
}

function percentToCell(x,y){return {x:Math.max(0,Math.min(width-1,Math.round(x*(width-1)/100))),y:Math.max(0,Math.min(height-1,Math.round(y*(height-1)/100)))};}
function cellToPercent(point){return {x:point.x/(width-1)*100,y:point.y/(height-1)*100};}

const walkMapApi={width,height,landmarks,makeGrid,nearestWalkable,findPath,namedRoute,percentToCell,cellToPercent};
if(typeof module!=='undefined'&&module.exports)module.exports=walkMapApi;
if(typeof window!=='undefined')window.WalkMap=walkMapApi;
