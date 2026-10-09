'use strict';
const galleryPrinciples={
 recognition:{title:'图像识别：先找特征，再比资料',src:'/assets/principles/recognition.svg',alt:'从示意叶片提取轮廓与颜色，与资料的两项特征比较，按匹配数列出候选，再由人核对。',focus:'本馆由你观察特征，算法按匹配数排序；这是识别思想的教学简化。',question:'换一个形状或颜色线索，候选顺序会怎样变？'},
 translation:{title:'语言翻译：词块转换，还要换顺序',src:'/assets/principles/translation.svg',alt:'把花园在哪里分成词块，再将在哪里对应Where is、花园对应the garden，调整顺序组成固定短句的译文。',focus:'本馆只演示已有短句的词块转换，译文仍要核对语境。',question:'如果只逐字替换、不调整顺序，别人能读懂吗？'},
 shopping:{title:'购物推荐：记录怎样影响排序',src:'/assets/principles/shopping.svg',alt:'科学实验盒浏览3次、跳绳1次、水彩笔4次，柱形长短表示次数，按4、3、1排序形成推荐清单。',focus:'过去的浏览记录会影响排序，但不等于你今天的需要。',question:'换一份浏览记录，排在第一位的商品还一样吗？'},
 sports:{title:'运动数据：找达到条件的波峰',src:'/assets/principles/sports.svg',alt:'12个模拟读数绘成折线，阈值为6，高于前后读数且达到阈值的6、7、8三个峰被圈出，计数3次。',focus:'必须同时满足“高于前后”和“达到阈值”两个条件。',question:'把阈值从6改成7，会保留哪些峰？'},
 art:{title:'图像艺术：像素颜色可以按规则计算',src:'/assets/principles/art.svg',alt:'原图是九个颜色像素，放大一个RGB为120、60、30的像素，以255分别减去三个值，得到135、195、225，再逐像素组成反色新图。',focus:'本馆确实逐个运算像素；反色规则是每个新颜色值等于255减原值。',question:'同一个像素连续反色两次，会变成什么颜色？'},
 medical:{title:'影像辅助：条件标记交给专业人员复核',src:'/assets/principles/medical.svg',alt:'虚构的8乘8亮度格按亮度大于或等于8的条件筛选，四个格子标成复核提示；亮点不等于病变，不能用于医疗判断。',focus:'亮度阈值只会筛选格子；标记需要专业复核，不能给出诊断。',question:'降低阈值后标记变多，能说明病变变多了吗？'}
};
if(typeof module!=='undefined'&&module.exports)module.exports=galleryPrinciples;
if(typeof window!=='undefined')window.GalleryPrinciples=galleryPrinciples;
