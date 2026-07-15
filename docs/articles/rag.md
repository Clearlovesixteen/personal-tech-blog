# RAG 

###### 1: RAG是什么

我们开个题先，RAG是啥，大家可能大多都听到过或者去查询过一些资料去了解，那我就先从名字上解释一下RAG的全称是Retrieval-Augmented Generation（检索增强生成），大家可以从字面意思上知道，“噢，这个是做检索增强的”，那么问题又来了，模型检索啥东西呢？带着问题，我往下写第二部分，为什么会有RAG或者它的作用是干啥的

###### 2:为什么会有RAG

从举一个栗子开始😁，让大家更明白一点，之前大家问chatGPT或者其他的一些模型问它一些你想知道的事情或者知识的时候，前置条件是这一定是大模型所知道的知识，而所知道的知识取决于在训练的时候给它的数据集。但是有一些是公司内部的文档或者是最近发生的事情，那么它一定是不知道的，但是它又不能直接说，“我母鸡啊” ，所以呢，但它很可能不会说自己母鸡，而是会胡乱回答，也就是所谓的幻觉（以为自己知道，这就是典型的骗骗兄弟就算了，连自己都骗）。那么我们如何解决大模型的幻觉呢？我们先思考一下，如果是你，你会怎么解决？我来告诉一下我的做法，如果用户要查询的内容，我们先去内部知识库里查一下，把它放到 prompt 里再喂给大模型。这样模型通过这些文档知道了背景知识，是不是就可以回答响应的问题了。哈哈哈，其实这就是RAG，是不是听起来so easy。

来，我们总结一下（跟我读），先去知识库里检索用户问的知识的相关文档片段，作为背景知识加到 prompt 里增强它，让模型根据这些来生成回答。到这了，其实又又又有个问题，你知识库一多，模型怎么知道你要苹果，我就给你苹果的知识库，你要香蕉我就给你香蕉的知识库？那这个怎么办呢？这里引入一个新的概念：向量。

其实向量这个东西其实是个**数学问题**，大家都初中应该都学过X轴和 Y轴吧，那么X轴代表什么，Y轴代表什么都是可以定义的对吧。那我继续写个事例吧，方便大家理解，如下：

```python
水果：[0.9, 0.3] 极高食用性，中低硬度
苹果：[0.9, 0.5] 高食用性，硬度适中
香蕉：[0.9, 0.1] 高食用性，非常软
石头：[0.1, 0.9] 几乎不可食用，非常硬
```

下面的内容我要敲黑板了！！！

拿水果来说，你可以吧0.9堪称X轴的点，0.3为Y轴的点，那么X轴与Y轴的这个交点就是水果，那模型用什么样的方式去做内容的检索增强呢？其实很简单，就是用向量与原点连成的线与另外一个向量和原点连成的线的余弦值去做判断，值越小相关性越高，当然在实际的应用场景中的话，具体的向量数据肯定不会只有二维，可能会是几百维的那种，这个就比较复杂了，但是原理是这样的。我再画个图吧，方便理解一下，不然挺抽象的[等一等] ，如图所示（灵魂画手）：

![image](/images/doc-image-31-3841558189.png)

如果上面的图没看懂的，建议复习一下初中的余弦定理，不用谢！！！！！

回归正题，其实这种方式，只适合做知识库的向量化，如果面对一些概念性的词或者句子，怎么做向量化呢，这个需要用到专门的模型，叫**嵌入模型**。它和大语言模型是不一样的，它的功能就只有把知识转成向量。这个知识可以是文本、图片、语音等，向量化之后，就可以用语义理解去做检索了，好了说到这里了，我这个灵魂画手又要开始画个闭环的图了，目的呢，还是方便大家理解

![image](/images/doc-image-32-7a2da9e87c.png)

从上图看来的话，其实向量化后，会在向量的元信息里记录来源文档。

我们再次总结一下，我们可以在原始 prompt 给到大模型之前，查询下知识库，把相关的文档作为背景知识加入到 Prompt 里，再让大模型回答，这就是一个完整的 RAG的过程。

###### 3:怎么用RAG

下面我在代码层面去边写边说

```javascript
import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from"@langchain/openai";
import { Document } from"@langchain/core/documents";
import { MemoryVectorStore } from"@langchain/classic/vectorstores/memory";

// 用GPT的LLM
const model = new ChatOpenAI({
temperature: 0,
model: process.env.MODEL_NAME,
apiKey: process.env.OPENAI_API_KEY,
configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// OpenAIEmbeddings 这个就是嵌入模型 ，专门把内容向量化的模型
const embeddings = new OpenAIEmbeddings({
apiKey: process.env.OPENAI_API_KEY,
model: process.env.EMBEDDINGS_MODEL_NAME,
configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
});

const documents = [
new Document({
    pageContent: `秋枫是一个活泼开朗的小男孩，他有一双明亮的大眼睛，总是带着灿烂的笑容。秋枫最喜欢的事情就是和朋友们一起玩耍，他特别擅长踢足球，每次在球场上奔跑时，就像一道阳光一样充满活力。`,
    metadata: { 
      chapter: 1, 
      character: "秋枫", 
      type: "角色介绍", 
      mood: "活泼"
    },
  }),
new Document({
    pageContent: `叶子是秋枫最好的朋友，他是一个安静而聪明的男孩。叶子喜欢读书和画画，他的画总是充满了想象力。虽然性格不同，但叶子和秋枫从幼儿园就认识了，他们一起度过了无数个快乐的时光。`,
    metadata: { 
      chapter: 2, 
      character: "叶子", 
      type: "角色介绍", 
      mood: "温馨"
    },
  }),
new Document({
    pageContent: `有一天，学校要举办一场足球比赛，秋枫非常兴奋，他邀请叶子一起参加。但是叶子从来没有踢过足球，他担心自己会拖累秋枫。秋枫看出了叶子的担忧，他拍着叶子的肩膀说："没关系，我们一起练习，我相信你一定能行的！"`,
    metadata: {
      chapter: 3,
      character: "叶子和秋枫",
      type: "友情情节",
      mood: "鼓励",
    },
  }),
new Document({
    pageContent: `接下来的日子里，秋枫每天放学后都会教叶子踢足球。秋枫耐心地教叶子如何控球、传球和射门，而叶子虽然一开始总是踢不好，但他从不放弃。叶子也用自己的方式回报秋枫，他画了一幅画送给秋枫，画上是两个小男孩在球场上一起踢球的场景。`,
    metadata: {
      chapter: 4,
      character: "秋枫和叶子",
      type: "友情情节",
      mood: "互助",
    },
  }),
new Document({
    pageContent: `比赛那天终于到了，秋枫和叶子一起站在球场上。虽然叶子的技术还不够熟练，但他非常努力，而且他用自己的观察力帮助秋枫找到了对手的弱点。在关键时刻，叶子传出了一个漂亮的球，秋枫接球后射门得分！他们赢得了比赛，更重要的是，他们的友谊变得更加深厚了。`,
    metadata: {
      chapter: 5,
      character: "秋枫和叶子",
      type: "高潮转折",
      mood: "激动",
    },
  }),
new Document({
    pageContent: `从那以后，秋枫和叶子成为了学校里最要好的朋友。秋枫教叶子运动，叶子教秋枫画画，他们互相学习，共同成长。每当有人问起他们的友谊，他们总是笑着说："真正的朋友就是互相帮助，一起变得更好的人！"`,
    metadata: {
      chapter: 6,
      character: "秋枫和叶子",
      type: "结局",
      mood: "欢乐",
    },
  }),
new Document({
    pageContent: `多年后，秋枫成为了一名程序员，而叶子成为了一名优秀的卫生间管理员。虽然他们走上了不同的道路，但他们的友谊从未改变。秋枫为叶子设计了卫生间的图案，秋枫在每次编程后后都会给叶子打电话分享喜悦。他们证明了，真正的友情可以跨越时间和距离，永远闪闪发光。`,
    metadata: {
      chapter: 7,
      character: "秋枫和叶子",
      type: "尾声",
      mood: "温馨",
    },
  }),
];

const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings,
);
// 再稍微解释一下，这个3就是余弦值相近的3个文档
const retriever = vectorStore.asRetriever({ k: 3 });

const questions = [
"秋枫和叶子是怎么成为朋友的？"
];

for (const question of questions) {

// 使用 retriever 获取文档，
const retrievedDocs = await retriever.invoke(question);

// 使用 similaritySearchWithScore 获取相似度评分
const scoredResults = await vectorStore.similaritySearchWithScore(question, 3);

// 相似度评分
  retrievedDocs.forEach((doc, i) => {
    // 找到对应的评分
    const scoredResult = scoredResults.find(([scoredDoc]) =>
      scoredDoc.pageContent === doc.pageContent
    );
    const score = scoredResult ? scoredResult[1] : null;
    const similarity = score !== null ? (1 - score).toFixed(4) : "N/A";
  });

// 构建 prompt
const context = retrievedDocs
    .map((doc, i) =>`[片段${i + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

const prompt = `你是一个讲友情故事的老师。基于以下故事片段回答问题，用温暖生动的语言。如果故事中没有提到，就说"这个故事里还没有提到这个细节"。

故事片段:
${context}

问题: ${question}

老师的回答:`;

const response = await model.invoke(prompt);
console.log(response.content);
}
```

###### 4:结尾

大家应该都清楚大模型训练完后，知识就不再更新了，它没法知道最新的一些信息，以及一些非互联网上公开的信息， 其实RAG更多的是联网的RAG，可以排除很多“幻觉问题”，可以对网络上所有的内容进行向量化，同时可以获取最新联网的数据。