'use strict';
(function(){
 const M=window.GalleryModel;
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pick=(value,expected)=>value===expected?'selected':'';
 const browseProfiles={science:{science:5,sport:1,art:0},sport:{science:1,sport:5,art:0},art:{science:1,sport:0,art:5}};
 function renderIntro(hall){
  const info=M.introductions[hall],place=M.halls.find(x=>x.id===hall),principle=window.GalleryPrinciples[hall];
  if(!info||!place||!principle)return '';
  const mark={recognition:'叶',translation:'译',shopping:'购',sports:'动',art:'艺',medical:'影'}[hall];
  return `<div class="gallery-topline"><button class="text-button" type="button" data-hall="hub">← 返回体验馆一览</button><span>先看科学原理图 · 再亲手体验</span></div><section class="gallery-story" aria-label="${escape(place.name)}介绍"><div class="story-dialogue"><span class="story-npc-mark" aria-hidden="true">${mark}</span><div><strong>${escape(info.npc)}说</strong><p>“${escape(info.line)}”</p></div></div><figure class="gallery-scene principle-diagram" aria-label="${escape(principle.title)}"><img class="principle-image" src="${escape(principle.src)}" alt="${escape(principle.alt)}"><figcaption>${escape(principle.focus)}</figcaption></figure><p class="principle-question"><strong>想一想：</strong>${escape(principle.question)}</p><button class="primary-button full story-enter" type="button" data-action="gallery-enter">看完原理图，开始体验 →</button></section>`;
 }
 function renderHall(hall,records){
  const latest=records?.at(-1),lastInput=latest?.input||{},out=latest?.output;
  let form='';
  if(hall==='recognition'){
   const featureValue=lastInput.shape&&lastInput.color?`${lastInput.shape}:${lastInput.color}`:'';
   const features=[['fan','扇形'],['palm','掌状'],['needle','针状']].flatMap(([shape,shapeName])=>[['yellow','黄色'],['red','红色'],['green','绿色']].map(([color,colorName])=>`<option value="${shape}:${color}" ${pick(featureValue,`${shape}:${color}`)}>${shapeName} · ${colorName}</option>`)).join('');
   form=`<p class="gallery-task">看照片，选一组你观察到的特征。</p><fieldset class="gallery-photo-picker"><legend>选哪张照片？</legend><div class="hall-sample-row">${M.leaves.map((x,i)=>`<label class="hall-sample"><input type="radio" name="hall-sample" value="${x.id}" ${x.id===(lastInput.sample||'ginkgo')?'checked':''}><img src="/assets/leaf-${x.id}.webp" alt="叶片照片${'ABC'[i]}"><strong>照片${'ABC'[i]}</strong></label>`).join('')}</div></fieldset><label for="hall-features">我看到的特征</label><select id="hall-features" required><option value="">先观察，再选形状与颜色</option>${features}</select>`;
  }
  if(hall==='translation')form=`<p class="gallery-task">选一句标牌文字，看看算法怎样帮游客理解。</p><label for="hall-phrase">标牌上的短句</label><select id="hall-phrase">${Object.entries(M.phrases).map(([id,p])=>`<option value="${id}" ${pick(lastInput.phrase||'garden',id)}>${escape(p.source)}</option>`).join('')}</select>`;
  if(hall==='shopping'){
   const lastProfile=Object.keys(browseProfiles).find(id=>Object.entries(browseProfiles[id]).every(([key,value])=>lastInput[key]===value))||'science';
   form=`<p class="gallery-task">选一份浏览记录，看看商店先推荐什么。</p><label for="hall-history">这位游客最近常看</label><select id="hall-history"><option value="science" ${pick(lastProfile,'science')}>科学实验盒 5 次 · 跳绳 1 次</option><option value="sport" ${pick(lastProfile,'sport')}>跳绳 5 次 · 科学实验盒 1 次</option><option value="art" ${pick(lastProfile,'art')}>水彩笔 5 次 · 科学实验盒 1 次</option></select>`;
  }
  if(hall==='sports')form=`<p class="gallery-task">调一个阈值，同一串读数会数出几次运动？</p><div class="reading-chart">${M.readings.map((n,i)=>`<span class="reading-bar" style="height:${n*9}%" title="第${i+1}次读数：${n}">${n}</span>`).join('')}</div><label for="hall-threshold">判断峰值的阈值 <output id="value-threshold">${lastInput.threshold||5}</output></label><input class="gallery-range" type="range" min="3" max="8" value="${lastInput.threshold||5}" id="hall-threshold" data-output="value-threshold">`;
  if(hall==='art')form=`<p class="gallery-task">选一种效果，看算法怎样改变同一张图片。</p><label for="hall-style">画面效果</label><select id="hall-style"><option value="grayscale" ${pick(lastInput.style||'grayscale','grayscale')}>灰度</option><option value="posterize" ${pick(lastInput.style,'posterize')}>色阶</option><option value="invert" ${pick(lastInput.style,'invert')}>反色</option></select><div class="art-canvases"><figure><canvas id="art-source" width="240" height="140"></canvas><figcaption>原图</figcaption></figure><figure><canvas id="art-result" width="240" height="140"></canvas><figcaption>运行后</figcaption></figure></div>`;
  if(hall==='medical')form=`<p class="gallery-task">改变阈值，看哪些亮格会被标记供复核。</p><div class="medical-grid">${M.imageValues.map((value,index)=>`<span class="medical-cell ${out?.flagged.includes(index)?'flagged':''}" style="background:rgb(${value*25},${value*25},${value*25})" title="格子${index+1}：亮度${value}"></span>`).join('')}</div><label for="hall-threshold">标记亮点的阈值 <output id="value-threshold">${lastInput.threshold||7}</output></label><input class="gallery-range" type="range" min="4" max="9" value="${lastInput.threshold||7}" id="hall-threshold" data-output="value-threshold">`;
  const label={recognition:'看识别候选',translation:'看翻译过程',shopping:'看推荐顺序',sports:'数一数运动',art:'生成画面效果',medical:'标记亮点'}[hall];
  return `<div class="gallery-topline"><button class="text-button" type="button" data-hall="hub">← 返回体验馆一览</button><button class="text-button" type="button" data-action="gallery-intro">重看原理图</button></div><form id="gallery-form" class="gallery-form" data-hall-id="${hall}">${form}<button class="primary-button full" type="submit">${label}</button></form>${out?`<div class="gallery-result" aria-live="polite"><strong>本次结果</strong>${resultHtml(hall,out)}<p class="story-takeaway"><strong>算法在这里的作用：</strong>${escape(M.introductions[hall].focus)}</p><details class="gallery-more"><summary>为什么会这样？</summary><p>${escape(out.explanation)}</p></details></div>`:''}`;
 }
 function resultHtml(hall,out){
  if(hall==='recognition')return `<p>最可能：<strong>${escape(out.candidates[0].name)}</strong>（匹配${out.candidates[0].score}/2项特征）</p>`;
  if(hall==='translation')return `<p><strong>${escape(out.source)} → ${escape(out.output)}</strong></p><div class="translation-chunks">${out.chunks.map(([zh,en])=>`<span>${escape(zh)} → ${escape(en)}</span>`).join('')}</div>`;
  if(hall==='shopping')return `<p>先推荐：<strong>${escape(out.rank[0].name)}</strong>（浏览${out.rank[0].count}次）</p>`;
  if(hall==='sports')return `<p>检测到 <strong>${out.count}</strong> 个运动峰值。</p>`;
  if(hall==='art')return `<p>已对原图运行 ${({grayscale:'灰度',posterize:'色阶',invert:'反色'})[out.style]} 像素运算。</p>`;
  if(hall==='medical')return `<p>标记了 <strong>${out.flagged.length}</strong> 个亮度达到阈值的格子，供进一步复核。</p>`;
  return '';
 }
 function readInput(hall){
  if(hall==='recognition'){const [shape='',color='']=document.getElementById('hall-features').value.split(':');return {sample:document.querySelector('input[name="hall-sample"]:checked')?.value,shape,color};}
  if(hall==='translation')return {phrase:document.getElementById('hall-phrase').value};
  if(hall==='shopping')return {...browseProfiles[document.getElementById('hall-history').value]};
  if(hall==='sports'||hall==='medical')return {threshold:Number(document.getElementById('hall-threshold').value)};
  if(hall==='art')return {style:document.getElementById('hall-style').value};
  return {};
 }
 function paintArt(style){
  const source=document.getElementById('art-source'),result=document.getElementById('art-result');
  if(!source||!result)return;
  const a=source.getContext('2d',{willReadFrequently:true}),b=result.getContext('2d');
  function finish(){const original=a.getImageData(0,0,240,140),pixels=M.applyArtStyle(original.data,style||'grayscale');b.putImageData(new ImageData(pixels,240,140),0,0);}
  const img=new Image();img.onload=()=>{a.drawImage(img,310,140,700,410,0,0,240,140);finish();};
  img.onerror=()=>{a.fillStyle='#d78b62';a.fillRect(0,0,240,140);a.fillStyle='#3b8277';a.fillRect(40,30,110,80);finish();};
  img.src='/assets/game-map-paths.webp';
 }
 function afterRender(hall,latest){if(hall==='art')paintArt(latest?.output?.style);}
 window.GalleryUI={renderIntro,renderHall,readInput,afterRender};
})();
