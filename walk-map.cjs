'use strict';

// The hand-authored roads follow the paths in game-map.webp. Coordinates are
// grid cells, independent of the displayed image's pixel size.
const width=100,height=56;
const landmarks={
 entrance:{x:50,y:49},plaza:{x:50,y:10},notice:{x:31,y:25},
 greenhouse:{x:22,y:16},recommendation:{x:77,y:28},service:{x:78,y:43},
 translation:{x:89,y:16},sports:{x:62,y:14},art:{x:79,y:36},medical:{x:74,y:14},
 barrier:{x:45,y:35}
};
const central=[landmarks.entrance,{x:50,y:44},{x:46,y:39},{x:45,y:35},{x:45,y:28},{x:47,y:23},{x:50,y:15},landmarks.plaza];
const west=[landmarks.entrance,{x:43,y:44},{x:34,y:39},{x:25,y:33},{x:22,y:28},{x:24,y:23},{x:33,y:20},{x:42,y:15},landmarks.plaza];
const east=[landmarks.entrance,{x:60,y:44},{x:69,y:38},{x:75,y:31},{x:75,y:25},{x:69,y:19},{x:60,y:15},landmarks.plaza];
const sideRoads=[
 [{x:24,y:23},landmarks.notice],
 [{x:22,y:28},{x:21,y:21},landmarks.greenhouse],
 [{x:75,y:31},landmarks.recommendation],
 [{x:69,y:38},{x:76,y:42},landmarks.service],
 [{x:75,y:25},{x:83,y:20},landmarks.translation],
 [{x:69,y:19},landmarks.medical],
 [{x:60,y:15},landmarks.sports],
 [{x:75,y:31},landmarks.art]
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
   if(dx*dx+dy*dy>radius*radius+1)continue;
   const px=x+dx,py=y+dy;
   if(px>=0&&px<width&&py>=0&&py<height)grid[py][px]=0;
  }
 }
 for(const trace of [central,west,east,...sideRoads])for(const p of expandTrace(trace))paint(p.x,p.y,2);
 for(const p of [landmarks.entrance,landmarks.plaza,landmarks.notice,landmarks.recommendation,landmarks.service])paint(p.x,p.y,p===landmarks.plaza?6:4);
 if(closed)for(let y=26;y<=33;y++)for(let x=42;x<=48;x++)grid[y][x]=1;
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
 const grid=makeGrid(closed),from=nearestWalkable(start,grid,5),to=nearestWalkable(end,grid,6);
 if(!from||!to)return null;
 if(from.x===to.x&&from.y===to.y)return [from];
 const finder=new easystar.js();
 finder.setGrid(grid);finder.setAcceptableTiles([0]);finder.enableDiagonals();finder.enableSync();
 let result=null;
 finder.findPath(from.x,from.y,to.x,to.y,path=>{result=path?.map(p=>({x:p.x,y:p.y}))||null;});
 finder.calculate();
 return result;
}

function namedRoute(id,closed=false){
 const trace=id==='A'?west:id==='B'?closed?[landmarks.entrance,{x:50,y:44},{x:46,y:39},landmarks.barrier]:central:id==='C'?east:null;
 return trace?expandTrace(trace):null;
}

function percentToCell(x,y){return {x:Math.max(0,Math.min(width-1,Math.round(x*(width-1)/100))),y:Math.max(0,Math.min(height-1,Math.round(y*(height-1)/100)))};}
function cellToPercent(point){return {x:point.x/(width-1)*100,y:point.y/(height-1)*100};}

const walkMapApi={width,height,landmarks,makeGrid,nearestWalkable,findPath,namedRoute,percentToCell,cellToPercent};
if(typeof module!=='undefined'&&module.exports)module.exports=walkMapApi;
if(typeof window!=='undefined')window.WalkMap=walkMapApi;
