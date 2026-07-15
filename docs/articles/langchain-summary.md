# LangChain 学习总结

前段时间自己已经完整的学习了 LangChain，目前还是感触挺多的，下面表述一下自己在学习上的一些心得。

先给个结论其实LangChain不是为了多套一层框架，而是为了把大模型应用从“调用一个 API”升级成“可切换、可组合、可观测、可扩展的工程系统”。

如果只是写一个简单 Demo，直接调 OpenAI、Claude、Gemini 或国产大模型的 API 就够了。但真正做 AI Agent 项目时，很快就会遇到一个问题：不同模型的 API 格式、能力边界、工具调用方式、结构化输出方式都不一样。如果代码和某个模型强耦合，后面想切换模型、接入新模型、复用组件，就会非常痛苦。

LangChain 要解决的第一个问题，就是屏蔽这些差异。

#### 一、为什么需要 LangChain

市面上的大模型 API 大体可以分成几类：OpenAI 格式、Anthropic Claude 格式、Google Gemini 格式，以及大量兼容 OpenAI 格式的国产大模型。

比如系统提示词的写法就不一样。

OpenAI 把 system 消息放在 messages 数组里：

```javascript
{"model": "gpt-3.5-turbo","messages": [{ "role": "system", "content": "你是代码助手" },{ "role": "user", "content": "你好" }]}
```

Anthropic 会把 system 单独放到顶层字段：

```javascript
{"model": "claude-opus","system": "你是一个代码助手","messages": [{"role": "user","content": [{ "type": "text", "text": "分析这段代码" }]}]}
```

Gemini 又是另一套写法：

```javascript
{"contents": [{"role": "user","parts": [{ "text": "解释下这段代码" }]}],"system_instruction": {"parts": [{ "text": "你是一个代码专家" }]}}
```

这只是 system prompt 的差异。实际开发里，工具调用、流式输出、多模态输入、JSON 结构化输出、token 统计、错误格式也都有差别。

如果直接面向具体模型 API 编程，代码就会被模型厂商绑定住。

LangChain 的做法是抽象出统一的 BaseChatModel。不管底层是 OpenAI、Claude、Gemini、DeepSeek、通义千问，调用方式都尽量保持一致。具体差异由 ChatOpenAI、ChatAnthropic、ChatGoogleGenerativeAI、ChatDeepSeek 这些类去处理。所以 LangChain 的第一层价值是：用统一的 ChatModel API 调用各种大模型，屏蔽底层差异。

虽然很多国产大模型都兼容 OpenAI 格式，可以直接用 ChatOpenAI 调用，但如果想使用某个模型的完整能力，通常还是要用专门的 ChatModel 类。兼容 OpenAI 只是能调用，不代表所有特性都完全一致。这也是我们学习 LangChain 的意义：我们不是只学某个模型的 API，而是基于 LangChain 的统一抽象来理解大模型应用开发。

#### 二、PromptTemplate：管理复杂提示词

有了统一的模型调用方式之后，下一步就是控制输入。

大模型应用本质上还是围绕 prompt 展开的。但实际项目里的 prompt 往往不会很简单，它会长期迭代，会包含角色设定、任务说明、格式要求、上下文信息、历史对话、Few-shot 示例等内容。

如果全部用字符串拼接，后期会很难维护。LangChain 提供了 PromptTemplate 和 ChatPromptTemplate 来组件化管理 prompt。

比如：

```javascript
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个简洁、有帮助的中文助手"],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);
```

这里的 {question} 是普通变量占位符，调用时传入即可。而 MessagesPlaceholder("history") 用来插入对话历史。它不是普通字符串，而是一组 message，所以特别适合做多轮对话。

如果 prompt 更复杂，还可以用 PipelinePromptTemplate 把多个 prompt 组合起来。比如先生成背景信息，再生成任务说明，最后合成最终 prompt。

另外，有些场景需要给模型示例，也就是 Few-shot Prompt。LangChain 提供了 FewShotPromptTemplate，可以定义示例模板和示例数据，让模型参考这些例子输出更稳定的结果。

更进一步，还可以根据长度或语义相似度动态选择示例，而不是每次都塞固定示例。所以 PromptTemplate 的核心价值是：让 prompt 从一段难维护的字符串，变成可以组合、复用、迭代的组件。

#### 三、OutputParser：控制模型输出

输入控制之后，就是输出控制。很多 AI 应用不希望模型随便回答一段自然语言，而是希望它返回某种固定格式，比如 JSON、XML，或者某个结构化对象。

这类需求一般有三种实现方式。

第一种是 tool call。我们定义一个工具的名称、描述和参数 schema，模型在需要调用工具时，会返回符合 schema 的参数。

第二种是 JSON schema。让模型直接按照某个 JSON 结构输出。

第三种是传统 OutputParser。也就是在 prompt 里告诉模型输出格式，然后用解析器把模型返回的文本解析成对象。

在 LangChain 里，常用做法是直接用：

```javascript
model.withStructuredOutput(schema)
```

它会根据模型能力选择合适的结构化输出方式，一般会优先使用 tool call。这样开发者不需要自己判断当前模型到底该用 tool call、JSON schema，还是普通 parser。

当然，在一些特殊场景下，还是需要手动使用 OutputParser。比如流式输出时，模型返回的 tool call 参数可能是碎片化的。某一刻可能只返回了半个 JSON，括号不完整，引号也不完整。如果自己解析会很麻烦。这时候就可以用 JsonOutputToolsParser 去解析流式 tool call 片段。

常见的 OutputParser 包括：

StringOutputParser：把模型输出转成普通字符串。

StructuredOutputParser：按指定 JSON 格式解析成对象。

XMLOutputParser：按 XML 格式解析成对象。

JsonOutputToolsParser：解析 tool call 信息，尤其适合流式场景。

整体来说，大模型输出控制主要靠 withStructuredOutput 和 OutputParser。前者适合结构化对象输出，后者适合更细的解析控制。

#### 四、Tool Calling：让模型具备行动能力

Tool Calling 是 AI Agent 的核心能力之一。

普通大模型只能生成文本，但 Agent 不只是回答问题，还要能调用工具、查询数据、操作系统、访问服务。在 LangChain 里，我们可以定义工具：

```javascript
const tools = [
  {
    name: "search",
    description: "搜索实时信息",
    schema: searchSchema,
  }
];

```

然后绑定到模型：

```javascript
const modelWithTools = model.bindTools(tools);

```

当用户的问题需要调用工具时，模型不会直接给最终答案，而是返回 tool\_calls。里面会包含工具名称和参数。程序拿到 tool\_calls 后，真正执行对应工具，再把执行结果封装成 ToolMessage 放回 messages 里，继续调用模型。

这个过程会循环执行：

**模型判断是否要调用工具，如果要调用，返回** **tool\_calls****，程序执行工具，工具结果返回给模型，模型继续判断下一步，直到模型不再返回新的 tool call，最终回答用户。**

这就是 Agent 最基础的执行循环。

#### 五、MCP：复用跨进程工具

并不是所有工具都要自己写。现在很多工具可以通过 MCP，也就是 Model Context Protocol，直接暴露给大模型使用。

MCP 的价值是把工具做成独立服务，让不同客户端都能复用。比如地图服务、浏览器控制、数据库查询、文件系统操作，都可以通过 MCP Server 提供。

MCP Server 如果跑在本地进程，可以用 stdio 通信；如果跑在远程服务，可以用 HTTP 通信。

在 LangChain 里，可以通过 @langchain/mcp-adapters 连接 MCP Server：

```javascript
const tools = await client.getTools();
const modelWithTools = model.bindTools(tools);

```

拿到工具之后，后面的流程和自己定义 tool 没区别，依然是 tool call 循环。所以 MCP 解决的是工具生态复用问题。自己写 tool 是局部能力，接入 MCP 是把外部工具系统接进 Agent。

#### 六、Memory：让 Agent 记住上下文

如果每次调用都只传当前问题，模型就没有记忆。最原始的做法是把所有历史消息都放进 messages 数组。但聊得多了之后，消息会越来越长，最终超过模型上下文窗口。所以 Agent 必须有 memory 管理。

LangChain 提供了 ChatMessageHistory 这一层 API，可以把消息历史存到内存、Redis、文件、数据库等地方。

常见 memory 策略有三种。

第一种是截断。只保留最近的一部分消息，丢掉更早的内容。简单直接，但容易丢失重要信息。

第二种是总结。用大模型把早期对话总结成摘要，后续只带摘要和最近消息。Cursor、Claude Code 这类工具在上下文接近上限时，本质上也会做类似处理。

第三种是检索。把长期记忆向量化，用户提问时再根据语义相似度检索相关内容。这种方式更适合长时记忆。

简单来说，短期上下文可以用消息历史，长期记忆通常要靠向量检索。

#### 七、RAG：让模型基于外部知识回答

RAG 是 Agent 必备能力之一。大模型自己的知识有边界，不能保证知道你的私有文档、业务数据、电子书内容、内部规范。所以需要把外部知识检索出来，再交给模型生成答案。

RAG 的流程分成两个阶段。

第一个阶段是入库。各种来源的内容先通过 loader 加载，然后用 splitter 分割成小片段，再用 embedding 模型向量化，最后存入 Milvus、Zilliz、Pinecone、Chroma 这类向量数据库。

第二个阶段是检索和生成。用户提问后，把 query 也向量化，然后去向量数据库里做相似度检索。常见的相似度计算方式是余弦相似度。检索出最相关的几个片段后，把这些片段作为上下文交给大模型，让模型基于这些材料回答。比如电子书阅读助手，就是先把电子书切块、向量化、存入向量数据库。用户提问时，检索出最相关的 5 个片段，再让模型基于这些片段回答。可以直接用 Milvus SDK 做这件事，也可以用 LangChain 对向量数据库的封装。后者的好处和 ChatModel 类似：屏蔽不同向量数据库的底层差异，用统一 API 做相似度检索。

#### 八、LCEL：把组件编排成 Chain

学完 ChatModel、PromptTemplate、OutputParser、Tool、MCP、Memory、RAG 之后，LangChain 看起来像一个工具集。但真正让它变成工程化框架的是 LCEL。

LCEL 的核心思想是：每个组件都实现 Runnable 接口。

ChatModel 是 Runnable。

PromptTemplate 是 Runnable。

OutputParser 是 Runnable。

自定义函数也可以包装成 Runnable。

然后这些 Runnable 可以通过统一方式组合成 chain。

比如：

```javascript
const chain = prompt.pipe(model).pipe(new StringOutputParser());
```

这就是一条最简单的链：

输入进入 prompt，prompt 生成消息，消息传给 model，model 输出结果，结果交给 parser 解析。

最后统一调用：

```javascript
await chain.invoke(input);
```

除了 invoke，还有：

stream：流式调用。

batch：批量调用。

这就是声明式写法的好处。你不再是手动写一堆流程控制代码，而是把组件声明成一条流水线。

更重要的是，Runnable 天然支持 callbacks。如果你想记录每个节点的输入、输出、耗时、token 消耗，不需要在每段代码里硬编码日志逻辑，只要加 callbacks，就可以动态观察整个 chain 的执行过程。后面学习 LangSmith 时会发现，它之所以能监测 chain 中每个节点的情况，本质上就是基于 Runnable callbacks。

LCEL 还提供了很多编排能力：

RunnableSequence：顺序执行。

RunnableLambda：把函数包装成 Runnable。

RunnableMap：并行执行多个 chain，并把结果放到对象属性上。

RunnableBranch：实现 if else 逻辑。

RouterRunnable：类似 switch case，根据 key 选择不同 chain。

RunnableEach：对数组每个元素执行 chain。

RunnablePassthrough：保留原始输入。

RunnablePick：从输入对象中选择部分字段。

RunnableWithMessageHistory：给 chain 增加消息历史能力。

刚开始写 LCEL 可能不习惯，但思路其实很固定：

先分析流程，再拆分原子步骤，然后根据步骤关系选择对应 Runnable，最后统一用 invoke、stream 或 batch 调用。

#### 九、从工具集到工业流水线

如果只看组件，LangChain 是一个大模型应用工具集。它提供了 ChatModel、PromptTemplate、OutputParser、Tool、MCP、Memory、RAG 等模块，分别解决模型调用、输入控制、输出控制、工具调用、外部工具接入、对话记忆、知识检索这些问题。但学完 LCEL 之后，LangChain 就不只是工具集了。它变成了一套工业化流水线系统。每个节点都可以独立配置、独立观测、独立重试，也可以动态增加 callbacks、日志、监控、备选模型、错误处理等能力。

这也是 LangChain 相比手写代码最大的价值：它让 AI 应用从“能跑”变成“可维护”。

#### 总结

LangChain 的核心可以分成两部分。

第一部分是组件。

ChatModel 屏蔽不同大模型差异

PromptTemplate 管理复杂 prompt。

OutputParser 和 withStructuredOutput 控制模型输出。

Tool Calling 让模型具备调用工具的能力。

MCP 让 Agent 可以复用外部工具生态。

Memory 解决多轮对话和长期记忆问题。

RAG 让模型可以基于外部知识回答问题。

第二部分是 LCEL。

LCEL 把这些组件都抽象成 Runnable，然后用声明式方式组合成 chain。它让流程编排、流式调用、批量调用、日志监控、重试、回调、备选方案都变得统一。所以，学 LangChain 的路线也很清楚：先学组件，理解每个模块解决什么问题。再学 LCEL，理解如何把组件编排成真正的 Agent 流程。

掌握这两部分，就基本掌握了 LangChain 的核心。

到这里，LangChain 部分可以算是告一段落。回头看，它不是单纯教我们怎么调用大模型，而是在教我们怎么用工程化方式构建 AI Agent。组件是零件，LCEL 是流水线。把这两件事想明白，后面再学 LangSmith、多 Agent、复杂工作流，都会顺很多。