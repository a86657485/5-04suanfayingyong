'use strict';
(function(){
 const M=window.GalleryModel;
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pick=(value,expected)=>value===expected?'selected':'';
 function renderHall(hall,records){
  const latest=records?.at(-1),lastInput=latest?.input||{},out=latest?.output;
  let form='';
  if(hall==='recognition')form=`<div class="hall-sample-row">${M.leaves.map((x,i)=>`<div class="hall-sample"><img src="/assets/leaf-${x.id}.webp" alt="叶片照片${'ABC'[i]}"><strong>照片${'ABC'[i]}</strong></div>`).join('')}</div><label for="hall-sample">选一张照片卡</label><select id="hall-sample">${M.leaves.map((x,i)=>`<option value="${x.id}" ${pick(lastInput.sample||'ginkgo',x.id)}>照片${'ABC'[i]}</option>`).join('')}</select><p class="small-note">先观察照片，再告诉工具你看到的两个特征；它会和特征库比较。候选名称在运行后才出现。</p><label for="hall-shape">叶片形状</label><select id="hall-shape"><option value="" ${pick(lastInput.shape||'','')}>先选形状</option><option value="fan" ${pick(lastInput.shape,'fan')}>扇形</option><option value="palm" ${pick(lastInput.shape,'palm')}>掌状</option><option value="needle" ${pick(lastInput.shape,'needle')}>针状</option></select><label for="hall-color">颜色</label><select id="hall-color"><option value="" ${pick(lastInput.color||'','')}>先选颜色</option><option value="yellow" ${pick(lastInput.color,'yellow')}>黄色</option><option value="red" ${pick(lastInput.color,'red')}>红色</option><option value="green" ${pick(lastInput.color,'green')}>绿色</option></select>`;
  if(hall==='translation')form=`<p class="dialogue-bubble">游客：我看不懂另一种语言的标牌，能帮我理解吗？</p><label for="hall-phrase">选择要翻译的短句</label><select id="hall-phrase">${Object.entries(M.phrases).map(([id,p])=>`<option value="${id}" ${pick(lastInput.phrase||'garden',id)}>${escape(p.source)}</option>`).join('')}</select><p class="small-note">这是离线词块示范，只处理下方三句；任意长句需要其他翻译工具和核验。</p>`;
  if(hall==='shopping')form=`<p class="dialogue-bubble">商店老板：两位游客的浏览记录不同，我该给谁先展示哪件商品？</p>${[['science','科学实验盒'],['sport','跳绳'],['art','水彩笔']].map(([id,label])=>`<label for="hall-${id}">${label}的浏览次数 <output id="value-${id}">${lastInput[id]??(id==='science'?3:id==='sport'?1:0)}</output></label><input class="gallery-range" type="range" min="0" max="5" value="${lastInput[id]??(id==='science'?3:id==='sport'?1:0)}" id="hall-${id}" data-output="value-${id}">`).join('')}<p class="small-note">只改一类浏览次数，再比较推荐顺序。</p>`;
  if(hall==='sports')form=`<p class="dialogue-bubble">运动教练：同一串传感器读数，用不同阈值统计，结果会怎样？</p><div class="reading-chart">${M.readings.map((n,i)=>`<span class="reading-bar" style="height:${n*9}%" title="第${i+1}次读数：${n}">${n}</span>`).join('')}</div><label for="hall-threshold">判为一次运动峰值的阈值 <output id="value-threshold">${lastInput.threshold||5}</output></label><input class="gallery-range" type="range" min="3" max="8" value="${lastInput.threshold||5}" id="hall-threshold" data-output="value-threshold"><p class="small-note">模拟读数固定不变；达到阈值且高于前后读数，才计入一次峰值。</p>`;
  if(hall==='art')form=`<p class="dialogue-bubble">画室主人：同一张小镇图片，能用怎样的步骤做出不同效果？</p><label for="hall-style">选择图像处理效果</label><select id="hall-style"><option value="grayscale" ${pick(lastInput.style||'grayscale','grayscale')}>灰度：把RGB变成同一亮度</option><option value="posterize" ${pick(lastInput.style,'posterize')}>色阶：把颜色归并成少数等级</option><option value="invert" ${pick(lastInput.style,'invert')}>反色：用255减去原颜色</option></select><div class="art-canvases"><figure><canvas id="art-source" width="240" height="140"></canvas><figcaption>原图</figcaption></figure><figure><canvas id="art-result" width="240" height="140"></canvas><figcaption>运行后的图</figcaption></figure></div><p class="small-note">点击运行后，浏览器会逐个改变图片像素，结果不是预先放好的另一张图。</p>`;
  if(hall==='medical')form=`<p class="dialogue-bubble">影像辅助员：我先把较亮的区域标记出来，再交给医生复核。</p><div class="medical-grid">${M.imageValues.map((value,index)=>`<span class="medical-cell ${out?.flagged.includes(index)?'flagged':''}" style="background:rgb(${value*25},${value*25},${value*25})" title="格子${index+1}：亮度${value}"></span>`).join('')}</div><label for="hall-threshold">标记亮点的阈值 <output id="value-threshold">${lastInput.threshold||7}</output></label><input class="gallery-range" type="range" min="4" max="9" value="${lastInput.threshold||7}" id="hall-threshold" data-output="value-threshold"><p class="small-note">虚构影像中的亮点检测教学模拟。标记不等于疾病判断，诊断须由专业人员完成。</p>`;
  const label={recognition:'比较特征',translation:'运行词块翻译',shopping:'重新生成推荐',sports:'分析运动读数',art:'处理图片像素',medical:'标记模拟亮点'}[hall];
  return `<div class="gallery-topline"><button class="text-button" type="button" data-hall="hub">← 返回体验馆一览</button><span>自由体验 · 不影响主线进度</span></div><form id="gallery-form" class="gallery-form" data-hall-id="${hall}">${form}<button class="primary-button full" type="submit">${label}</button></form>${out?`<div class="gallery-result"><strong>本次运行结果</strong>${resultHtml(hall,out)}<p class="small-note">${escape(out.explanation)}</p></div>`:''}`;
 }
 function resultHtml(hall,out){
  if(hall==='recognition')return `<ol>${out.candidates.map(x=>`<li>${escape(x.name)} · 匹配${x.score}项特征</li>`).join('')}</ol>`;
  if(hall==='translation')return `<p><strong>${escape(out.source)} → ${escape(out.output)}</strong></p><div class="translation-chunks">${out.chunks.map(([zh,en])=>`<span>${escape(zh)} → ${escape(en)}</span>`).join('')}</div>`;
  if(hall==='shopping')return `<ol>${out.rank.map(x=>`<li>${escape(x.name)}：${x.count}次浏览</li>`).join('')}</ol>`;
  if(hall==='sports')return `<p>检测到 <strong>${out.count}</strong> 个峰值；位置：${out.peaks.map(i=>i+1).join('、')||'无'}</p>`;
  if(hall==='art')return `<p>已对原图运行 ${({grayscale:'灰度',posterize:'色阶',invert:'反色'})[out.style]} 像素运算。</p>`;
  if(hall==='medical')return `<p>标记了 <strong>${out.flagged.length}</strong> 个亮度达到阈值的格子，供进一步复核。</p>`;
  return '';
 }
 function readInput(hall){
  if(hall==='recognition')return {sample:document.getElementById('hall-sample').value,shape:document.getElementById('hall-shape').value,color:document.getElementById('hall-color').value};
  if(hall==='translation')return {phrase:document.getElementById('hall-phrase').value};
  if(hall==='shopping')return Object.fromEntries(['science','sport','art'].map(id=>[id,Number(document.getElementById(`hall-${id}`).value)]));
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
 window.GalleryUI={renderHall,readInput,afterRender};
})();
