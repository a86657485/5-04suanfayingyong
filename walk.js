'use strict';
(function(){
 const map=window.WalkMap,EasyStar=window.EasyStar;
 function create({scene,guide,visitor,marker,start,onPosition}){
 let position={...(start||map.landmarks.entrance)},frame=0,request=0,resolveActive=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sprites={front:['/assets/guide.webp','/assets/guide-front-pass.webp'],back:['/assets/guide-back.webp','/assets/guide-back-pass.webp'],side:['/assets/guide-side.webp','/assets/guide-side-pass.webp']};
  for(const src of Object.values(sprites).flat()){const image=new Image();image.src=src;}
  let lastDirection='front';
  function render(follower=position,dx=0,dy=0){
  const p=map.cellToPercent(position),q=map.cellToPercent(follower);
  guide.style.left=`${p.x}%`;guide.style.top=`${p.y}%`;
  visitor.style.left=`${q.x}%`;visitor.style.top=`${q.y}%`;
   const direction=Math.abs(dx)+Math.abs(dy)<.02?lastDirection:Math.abs(dx)>Math.abs(dy)*.75?'side':dy<0?'back':'front';
   lastDirection=direction;
   const frame=guide.classList.contains('walking')&&!reduced.matches?Math.floor(Date.now()/185)%2:0;
   const sprite=sprites[direction][frame];
   if(guide.getAttribute('src')!==sprite)guide.setAttribute('src',sprite);
  guide.classList.toggle('facing-left',direction==='side'&&dx<0);
  visitor.classList.toggle('facing-left',direction==='side'&&dx<0);
  }
  function stop(snap=false){
   if(frame)cancelAnimationFrame(frame);
   frame=0;request++;
   if(resolveActive){resolveActive({cancelled:!snap,position:{...position}});resolveActive=null;}
   guide.classList.remove('walking');visitor.classList.remove('walking');
   render(position);
   if(marker)marker.hidden=true;
   onPosition?.({...position});
  }
  function movePath(path){
   if(!path?.length)return Promise.resolve({unreachable:true,position:{...position}});
   stop();
   const token=request,waypoints=[{...position},...path.map(p=>({...p}))];
   const destination=waypoints.at(-1),point=map.cellToPercent(destination);
   if(marker){marker.style.left=`${point.x}%`;marker.style.top=`${point.y}%`;marker.hidden=false;}
   if(reduced.matches){position={...destination};render();if(marker)marker.hidden=true;onPosition?.({...position});return Promise.resolve({arrived:true,position:{...position}});}
   guide.classList.add('walking');visitor.classList.add('walking');
   let next=1,last=0,lastSaved=0;
   return new Promise(resolve=>{
    resolveActive=resolve;
    function tick(time){
     if(token!==request)return;
     if(!last)last=time;
     let distance=Math.min((time-last)/1000*11,1.5);last=time;
     while(distance>0&&next<waypoints.length){
      const target=waypoints[next],dx=target.x-position.x,dy=target.y-position.y,length=Math.hypot(dx,dy);
      if(length<=distance+0.001){position={...target};distance-=length;next++;}
      else{position={x:position.x+dx/length*distance,y:position.y+dy/length*distance};distance=0;}
     }
     const behind=waypoints[Math.max(0,next-6)];
     const toward=waypoints[Math.min(next,waypoints.length-1)];
     render(behind,toward.x-position.x,toward.y-position.y);
     if(time-lastSaved>350){onPosition?.({...position});lastSaved=time;}
     if(next>=waypoints.length){frame=0;resolveActive=null;guide.classList.remove('walking');visitor.classList.remove('walking');render(position);if(marker)marker.hidden=true;onPosition?.({...position});resolve({arrived:true,position:{...position}});return;}
     frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
   });
  }
  function moveTo(target,closed=false){
   const path=map.findPath(position,target,{closed,easystar:EasyStar});
   if(!path)return Promise.resolve({unreachable:true,position:{...position}});
   return movePath(path);
  }
  function followNamedRoute(id,closed=false){
   const approach=map.findPath(position,map.landmarks.entrance,{closed,easystar:EasyStar});
   const route=map.namedRoute(id,closed);
   if(!approach||!route)return Promise.resolve({unreachable:true,position:{...position}});
   return movePath([...approach,...route.slice(1)]);
  }
  function clickToMove(event,closed=false){
   const rect=scene.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*100,y=(event.clientY-rect.top)/rect.height*100;
   return moveTo(map.percentToCell(x,y),closed);
  }
  render();
  return {moveTo,followNamedRoute,clickToMove,stop,position:()=>({...position})};
 }
 window.WalkEngine={create};
})();
