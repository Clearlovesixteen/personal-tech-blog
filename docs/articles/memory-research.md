# memory 研究

如果未来要做AI agent , 这个memory 研究算是真正意义上的memory 管理，之前的agent 记忆的文章是从更深层次的原理去写的，今天这篇从我最近的实践去出发，让大家能够知道目前AI agent是如何做memory管理的

先看看这个图：

![/Users/hpt-qf/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_59cubby5d3lg22_4346/temp/RWTemp/2026-03/d7ea980bc81a738553c6f3c203206a89.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/YdgOk2b5dwY5Kq4B/img/ac9cb634-d204-4e75-af4c-0cf92a3b0f00.png)

如果进行一次对话的话，传给LLM模型有个message数组，一开始只会有SystemMessage和HumanMessage两种消息，但是如果经过LLM语义理解后，可能要完成你的需求模型会返回对应所需要的Tool\_call，也就是对应的工具集，然后我们基于 tool\_calls 去调用工具，然后把结果封装成 ToolMessage 也放入 messages 数组。然后messages 数组里就有了 SystemMessage、HumanMessage、AIMessage、ToolMessage（如下图所示），以此循环进行第二次的LLM调用，以此往复直到不再有tools\_calls，然后再把当次AI message当作结果返回

![/Users/hpt-qf/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_59cubby5d3lg22_4346/temp/RWTemp/2026-03/cf700d8084498eaddbaf8b2258652989.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/YdgOk2b5dwY5Kq4B/img/fe00c126-2b24-4cf2-8899-b1815610d9e4.png)

到这里，流程大概应该很清楚了，我总结一下，就是递归的原理，无tools\_calls就是递归的循环结束的必要条件。好，接下来，有些人可能已经出现了疑问了，**因为一般的模型上下文大概是200k token，那如果message的东西调用LLM次数足够多，那这样上下文token是不是会爆炸了**？这个就是我们今天主要要说的点，如何去基于message数组去管理memory。

可以先自己想想怎么解决上面的问题...............................

下面我尽量让大家能清楚的了解到目前主流的解决方案：**截断，总结，检索**

首先，在用cursor的时候，大家应该都应该看到过一个现象![/Users/hpt-qf/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_59cubby5d3lg22_4346/temp/RWTemp/2026-03/fc3ae88917ba5cc67a3a842b91d1b20f.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/YdgOk2b5dwY5Kq4B/img/eb6f8bf2-c1e8-42a1-bdb8-97d8a0561f1b.png)

如果到达100%，cursor实际上会进行总结，然后进行下一轮的计数

那么又有一个问题，message数组存在哪里？实际上是可以做持久化的，也就是存在文件、redis、数据库（mySQL)中。

所以之前的memory一共有两个维度的api的

一个是存储层：

![/Users/hpt-qf/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_59cubby5d3lg22_4346/temp/RWTemp/2026-03/4fc6d7dc4ddd92a255482c7b4894a20f.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/YdgOk2b5dwY5Kq4B/img/048f80db-1f5a-4b34-9b28-18266403a5f9.png)

一个是逻辑层：

![/Users/hpt-qf/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_59cubby5d3lg22_4346/temp/RWTemp/2026-03/6754e72b00243c2361eba003ab8f61a6.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/YdgOk2b5dwY5Kq4B/img/9a0427be-2401-4884-9862-bb703c40cb33.png)

但是现在这所有的api都被废弃掉了

现在都被移入到 langchain/classic这个包里了，那为什么会被废弃掉呢？

大概的原因就是因为不够灵活，像之前提到的截断、总结、检索完全可以自己实现的

截断： 根据总 token 数量来保留最近的 message

总结： 调用大模型对之前的 message 生成一个摘要

检索： 向量数据库就是之前的 RAG 流程，只不过用来对 message 做语义检索

所以呢，用 memory 这些 api 反而黑盒而且也不灵活，所以在新版干脆都去掉了。

下面我把我练手的代码push出来，大家可以看一下基本的逻辑，很简单

```javascript
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({ 
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

async function inMemoryDemo() {
  const history = new InMemoryChatMessageHistory();

  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。"
  );

  // 第一轮对话
  const userMessage1 = new HumanMessage(
    "你今天吃的什么？"
  );
  await history.addMessage(userMessage1);
  
  const messages1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(messages1);
  await history.addMessage(response1);
 

  // 第二轮对话（基于历史记录）
  const userMessage2 = new HumanMessage(
    "好吃吗？"
  );
  await history.addMessage(userMessage2);
  
  const messages2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(messages2);
  await history.addMessage(response2);

  // 展示所有历史消息
  const allMessages = await history.getMessages();
  allMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === 'human' ? '用户' : '助手';
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`);
  });
}

inMemoryDemo().catch(console.error);
```

上面的代码还是很简单的，核心就是借助了InMemoryChatMessageHistory去把message里memory的内容存在内存中，但是这个是短时记忆（STM）,还有一个是长时记忆（LTM），也就是把内容存在文件中，并且存储起来，具体做法就是把上述的InMemoryChatMessageHistory 替换为FileSystemChatMessageHistory，（本来不想copy代码的，想想还是贴上来吧）

长时记忆：

```javascript
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import path from "node:path";

const model = new ChatOpenAI({ 
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

async function fileHistoryDemo() {
  // 指定存储文件的路径
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_001";

  // 系统提示词
  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。"
  );

  
  const restoredHistory = new FileSystemChatMessageHistory({
    filePath: filePath,
    sessionId: sessionId,
  });
  
  const restoredMessages = await restoredHistory.getMessages();
  restoredMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === 'human' ? '用户' : '助手';
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`);
  });

  const userMessage3 = new HumanMessage(
    "需要哪些食材？"
  );
  await restoredHistory.addMessage(userMessage3);
  
  const messages3 = [systemMessage, ...(await restoredHistory.getMessages())];
  const response3 = await model.invoke(messages3);
  await restoredHistory.addMessage(response3);
}

fileHistoryDemo().catch(console.error);
```

以上就是短时记忆和长时记忆的简单代码示范

后面就是结合RAG去做比较完整的memory的落地

先把数据存储到向量数据库中

```javascript
import "dotenv/config";
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from "@langchain/openai";

const COLLECTION_NAME = 'conversations';
const VECTOR_DIM = 1024;

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-v3',
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  dimensions: VECTOR_DIM
});

const client = new MilvusClient({
  address: 'localhost:19530'
});


async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

async function main() {
  try {
    //链接向量数据库
    await client.connectPromise;

    // 创建集合
    await client.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
        { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
        { name: 'round', data_type: DataType.Int64 },
        { name: 'timestamp', data_type: DataType.VarChar, max_length: 100 }
      ]
    });

    // 创建索引
    await client.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'vector',
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE
    });

    // 加载集合
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    // 插入对话数据（模拟训练数据）
    const conversations = [
      {
        id: 'conv_001',
        content: '用户: 我叫赵六，是一名数据科学家\n助手: 很高兴认识你，赵六！数据科学是一个很有趣的领域。',
        round: 1,
        timestamp: new Date().toISOString()
      },
      {
        id: 'conv_002',
        content: '用户: 我最近在研究机器学习算法\n助手: 机器学习确实很有意思，你在研究哪些算法呢？',
        round: 2,
        timestamp: new Date().toISOString()
      },
      {
        id: 'conv_003',
        content: '用户: 我喜欢打篮球和看电影\n助手: 运动和文化娱乐都是很好的爱好！',
        round: 3,
        timestamp: new Date().toISOString()
      },
      {
        id: 'conv_004',
        content: '用户: 我周末经常去电影院\n助手: 看电影是很好的放松方式。',
        round: 4,
        timestamp: new Date().toISOString()
      },
      {
        id: 'conv_005',
        content: '用户: 我的职业是软件工程师\n助手: 软件工程师是个很有前景的职业！',
        round: 5,
        timestamp: new Date().toISOString()
      }
    ];
    //转为向量数据

    const conversationData = await Promise.all(
      conversations.map(async (conv) => ({
        ...conv,
        vector: await getEmbedding(conv.content)
      }))
    );
    //嵌入向量数据库
    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: conversationData
    });

  } catch (error) {
    console.error('错误:', error.message);
  }
}

main();
```

再就是结合RAG去做，代码如下

```javascript
import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const COLLECTION_NAME = 'conversations';
const VECTOR_DIM = 1024;

// 初始化 OpenAI Chat 模型
const model = new ChatOpenAI({ 
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 初始化 Embeddings 模型
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-v3',
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM
});

// 初始化 Milvus 客户端
const client = new MilvusClient({
  address: 'localhost:19530'
});


async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

// 检索milvus 对话数据
async function retrieveRelevantConversations(query, k = 2) {
  try {
    // 生成查询的向量
    const queryVector = await getEmbedding(query);

    // 在 Milvus 中搜索相似的对话
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'content', 'round', 'timestamp']
    });

    return searchResult.results;
  } catch (error) {
    console.error('检索对话时出错:', error.message);
    return [];
  }
}

//检索使用 Milvus 向量数据库存储历史对话，并且实现RAG流程

async function retrievalMemoryDemo() {  
  try {
    await client.connectPromise;
  } catch (error) {
    console.log('请确保 Milvus 服务正在运行');
    return;
  }

  // 创建历史消息存储
  const history = new InMemoryChatMessageHistory();

  const conversations = [
    { input: "我之前提到的机器学习项目进展如何？" },
    { input: "我周末经常做什么？" },
    { input: "我的职业是什么？" },
  ];

  for (let i = 0; i < conversations.length; i++) {
    const { input } = conversations[i];
    const userMessage = new HumanMessage(input);
    
    
    // 检索相关的历史对话
    const retrievedConversations = await retrieveRelevantConversations(input, 2);
    
    let relevantHistory = "";
    if (retrievedConversations.length > 0) {
      // 显示检索到的相关历史及相似度
      retrievedConversations.forEach((conv, idx) => {
        console.log(`\n[历史对话 ${idx + 1}] 相似度: ${conv.score.toFixed(4)}`);
        console.log(`轮次: ${conv.round}`);
        console.log(`内容: ${conv.content}`);
      });
      
      // 构建上下文
      relevantHistory = retrievedConversations
        .map((conv, idx) => {
          return `[历史对话 ${idx + 1}]
轮次: ${conv.round}
${conv.content}`;
        })
        .join('\n\n━━━━━\n\n');
    } else {
      console.log('未找到相关历史对话');
    }
    
    // 构建 prompt
    const contextMessages = relevantHistory 
      ? [
          new HumanMessage(`相关历史对话：\n${relevantHistory}\n\n用户问题: ${input}`)
        ]
      : [userMessage];
    
    // 调用模型生成回答
    const response = await model.invoke(contextMessages);
    
    // 保存当前对话到历史消息
    await history.addMessage(userMessage);
    await history.addMessage(response);
    
    // 将对话保存到 Milvus 向量数据库
    const conversationText = `用户: ${input}\n助手: ${response.content}`;
    const convId = `conv_${Date.now()}_${i + 1}`;
    const convVector = await getEmbedding(conversationText);
    
    try {
      await client.insert({
        collection_name: COLLECTION_NAME,
        data: [{
          id: convId,
          vector: convVector,
          content: conversationText,
          round: i + 1,
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      console.warn('保存到向量数据库时出错:', error.message);
    }
    
    console.log(`助手: ${response.content}`);
  }
}

retrievalMemoryDemo().catch(console.error);

```

上面就是完整的RAG+memory的流程

我总结一下memory 有三种管理策略：截断、总结、检索

截断：就是超出一定条数、一定 token 数量就去掉之前的 message

总结：就是调用大模型生成对话摘要，这样就可以删掉原始 message 了

检索：是结合向量数据库来做语义检索，通过 RAG 来检索之前聊的内容

上面就是用总结 + 检索，首先在 milvus 中存储对话总结，然后结合检索来查找