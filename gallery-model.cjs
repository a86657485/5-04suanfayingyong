'use strict';
const halls=[
 {id:'recognition',name:'图像识别馆',place:'植物馆',landmark:'greenhouse',short:'观察特征，匹配候选'},
 {id:'translation',name:'语言翻译馆',place:'语言小屋',landmark:'translation',short:'看词块如何转换'},
 {id:'shopping',name:'购物推荐馆',place:'小镇商店',landmark:'recommendation',short:'改变浏览记录，看推荐'},
 {id:'sports',name:'运动数据馆',place:'运动角',landmark:'sports',short:'调阈值，数运动峰值'},
 {id:'art',name:'图像艺术馆',place:'画室',landmark:'art',short:'亲手给图像换效果'},
 {id:'medical',name:'影像辅助馆',place:'健康角',landmark:'medical',short:'模拟标记亮点并复核'}
];
const leaves=[
 {id:'ginkgo',name:'银杏',shape:'fan',color:'yellow'},
 {id:'maple',name:'枫叶',shape:'palm',color:'red'},
 {id:'pine',name:'松针',shape:'needle',color:'green'}
];
const phrases={
 garden:{source:'花园在哪里？',output:'Where is the garden?',chunks:[['在哪里','Where is'],['花园','the garden']]},
 welcome:{source:'欢迎来到游园会。',output:'Welcome to the festival.',chunks:[['欢迎来到','Welcome to'],['游园会','the festival']]},
 library:{source:'请问图书馆在哪里？',output:'Where is the library?',chunks:[['请问','polite question'],['在哪里','Where is'],['图书馆','the library']]}
};
const products={science:'科学实验盒',sport:'跳绳',art:'水彩笔'};
const readings=[1,2,6,2,7,1,5,1,8,1,4,1];
const imageValues=[
 2,2,2,2,2,2,2,2,
 2,3,3,3,3,3,2,2,
 2,3,4,5,5,3,2,2,
 2,3,5,8,9,4,2,2,
 2,3,5,9,8,5,2,2,
 2,3,4,5,5,3,2,2,
 2,2,3,3,3,2,2,2,
 2,2,2,2,2,2,2,2
];
function boundedInteger(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max;}
function runDemo(hall,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('请选择体验馆的输入条件');
 if(hall==='recognition'){
  if(!leaves.some(x=>x.id===input.sample)||!['fan','palm','needle'].includes(input.shape)||!['yellow','red','green'].includes(input.color))throw Error('请选择照片与可见特征');
  const candidates=leaves.map(x=>({id:x.id,name:x.name,score:Number(x.shape===input.shape)+Number(x.color===input.color)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return {mode:'教学模拟',sample:input.sample,shape:input.shape,color:input.color,candidates,explanation:'比较形状与颜色的匹配数，得分相同按固定顺序列出；候选仍需核对。'};
 }
 if(hall==='translation'){
  const phrase=phrases[input.phrase];if(!phrase)throw Error('请选择已有的短句');
  return {mode:'离线词块示范',phrase:input.phrase,...phrase,explanation:'先分出词块，再按目标语言的表达顺序组合；本示范不翻译任意句子。'};
 }
 if(hall==='shopping'){
  const counts=['science','sport','art'].map(id=>input[id]);
  if(!counts.every(x=>boundedInteger(x,0,5)))throw Error('浏览次数应为0至5');
  const rank=Object.entries(products).map(([id,name])=>({id,name,count:input[id]})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
  return {mode:'教学模拟',rank,explanation:'按过去浏览次数排序；排在前面不代表今天一定想买。'};
 }
 if(hall==='sports'){
  if(!boundedInteger(input.threshold,3,8))throw Error('阈值应为3至8');
  const peaks=readings.map((value,index)=>({value,index})).filter(({value,index})=>index>0&&index<readings.length-1&&value>=input.threshold&&value>readings[index-1]&&value>readings[index+1]).map(x=>x.index);
  return {mode:'模拟传感器数据',threshold:input.threshold,readings:[...readings],peaks,count:peaks.length,explanation:'只计入达到阈值、且高于前后读数的峰值；此数据不是实际步数测量。'};
 }
 if(hall==='art'){
  if(!['grayscale','posterize','invert'].includes(input.style))throw Error('请选择图像效果');
  return {mode:'实际像素处理',style:input.style,explanation:'页面对图片像素逐个运算生成效果；不同效果会改变颜色信息。'};
 }
 if(hall==='medical'){
  if(!boundedInteger(input.threshold,4,9))throw Error('阈值应为4至9');
  const flagged=imageValues.map((value,index)=>({value,index})).filter(x=>x.value>=input.threshold).map(x=>x.index);
  return {mode:'虚构影像教学模拟',threshold:input.threshold,values:[...imageValues],flagged,explanation:'阈值算法只标记较亮的格子，不能据此诊断疾病；结果需要专业人员判断。'};
 }
 throw Error('体验馆不存在');
}
function applyArtStyle(pixels,style){
 if(!['grayscale','posterize','invert'].includes(style))throw Error('图像效果不存在');
 const out=new Uint8ClampedArray(pixels);
 for(let i=0;i<out.length;i+=4){
  if(style==='grayscale'){const gray=Math.round(.299*out[i]+.587*out[i+1]+.114*out[i+2]);out[i]=out[i+1]=out[i+2]=gray;}
  if(style==='posterize')for(let n=0;n<3;n++)out[i+n]=Math.min(255,Math.round(out[i+n]/85)*85);
  if(style==='invert')for(let n=0;n<3;n++)out[i+n]=255-out[i+n];
 }
 return out;
}
const galleryModelApi={halls,leaves,phrases,products,readings,imageValues,runDemo,applyArtStyle};
if(typeof module!=='undefined'&&module.exports)module.exports=galleryModelApi;
if(typeof window!=='undefined')window.GalleryModel=galleryModelApi;
