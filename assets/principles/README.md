# 六馆算法原理图

六张 SVG 为本项目原创矢量示意图，用于五年级第4课“先理解，再体验”。图片、中文标签和箭头均在文件内，离线可读，不请求第三方图片、字体或服务。每图按输入、处理、结果组织，`gallery-principles.cjs` 提供六馆的图址、替代文字、学习焦点和观察问题。

图示严格对应当前 `gallery-model.cjs` 的实际运算；它们展示算法思想的教学简化，不能代表真实人工智能系统的全部原理。图中的图像识别与语言翻译不调用真实模型，运动、推荐与影像使用模拟输入，只有图像艺术馆实际运算浏览器图片的像素。

| 馆 | 图中机制与演示边界 | 核对来源 |
|---|---|---|
| 图像识别 | 观察轮廓、颜色两项特征，与已有资料比较，按匹配项数排列候选。图中叶片是无名称的泛化示意，不对应体验题，也不显示真实植物名称。体验中由学生选择所观察的特征，不自动从照片提取。 | [OpenCV 官方：Contour Properties](https://docs.opencv.org/4.x/d1/d32/tutorial_py_contour_properties.html) 说明轮廓形状及轮廓区域颜色等可比较的图像特征；不据此声称两项匹配就是完整识别系统。 |
| 语言翻译 | 固定短句“花园在哪里？”拆成词块后变换并重排，输出 `Where is the garden?`。这只是一种词块与顺序的示意，不能翻译任意句子。 | [Brown 等原始论文：The Mathematics of Statistical Machine Translation](https://aclanthology.org/J93-2003/) 讨论词语对应、位置变化等翻译建模因素；本馆不实现该论文的统计翻译模型，也不代表现代翻译模型。 |
| 购物推荐 | 示例记录为科学实验盒3次、跳绳1次、水彩笔4次，以柱长表示次数，按4、3、1排序。实际体验接受0—5次，次数相同按固定标识顺序列出；推荐必须与当前需要核对。 | [Google 官方：Recommendation systems overview](https://developers.google.com/machine-learning/recommendation/overview/types) 区分候选生成、评分、重排；本馆只保留“记录影响排序”这一环节。 |
| 运动数据 | 使用项目的12个固定读数。图中阈值6时，仅数高于前后且值≥6的6、7、8，合计3个峰；5和4虽是局部峰但未达到阈值。本馆不读取真实设备、不测量真实步数。 | [SciPy 官方：find_peaks](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.find_peaks.html) 通过邻点比较寻找局部峰，并可按峰高筛选。**本项目的“阈值”对应最小峰高，不等于该API的 `threshold` 参数**。 |
| 图像艺术 | 九格示意中每个RGB通道都用255减原值，120、60、30变为135、195、225；与 `applyArtStyle(..., 'invert')` 一致，透明度保留。图片RGB通道值为0—255。 | [MDN：Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) 的ImageData说明与反色示例直接支持RGBA数据格式、0—255通道范围及255减原值的规则。 |
| 影像辅助 | 项目虚构8×8亮度格，不是真实影像。图中阈值8时，27、28、35、36四个索引位置满足亮度≥8，给出复核标记。亮度是人为设定的0—9示意尺度，不是灰度图的0—255通道值；亮点不等于病变，不能用于医疗判断。 | [OpenCV 官方：Basic Thresholding Operations](https://docs.opencv.org/4.x/db/d8e/tutorial_threshold.html) 支持按像素值与阈值比较进行分割的基本思想；具体等号归属以本项目 `>=` 规则为准。[WHO：Ethics and governance of AI for health](https://www.who.int/publications/i/item/9789240029200) 说明健康领域AI需要人的监督与责任，图示仅辅助理解筛选与复核。 |

来源核对日期：2026-10-09。以上为概述与本项目教学边界说明，无复制来源图片。

验证：`node --test tests/gallery-principles.test.cjs` 对配置与六馆的对应关系、SVG离线结构、示例曲线坐标和峰计数、柱形长度与排序、逐像素反色结果、阈值标记位置等作检查。图形在真实页面内的显示比例和文字可读性还需随页面布局验收。
