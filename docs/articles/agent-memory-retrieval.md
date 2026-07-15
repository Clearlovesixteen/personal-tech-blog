# Agent 记忆检索

##### 前言

我为什么突然想写这个，是因为前两个月，我在用chatGPT5.0的时候，突发出一个问题，GPT它是怎么能够想起来，我和它说过什么，无论过了多久，他都能精准的记忆起上次我和它的对话的上下文，正是因为这个引起了我的好奇心，接下来，我会把我了解到的和大家好好说说，它是如何“记忆”对话内容的

##### 正文

先给大家说一句话：Agent 的记忆系统关键不在“能记多少”，而在“能否精准想起”。我们再去看看它的触发机制和检索策略

触发机制：

1.  规则触发 —— 窗口容量不足时检索历史
    
2.  反思触发 —— 模型自觉遗忘时主动检索
    
3.  事件触发 —— 特定情境或失败日志触发回忆
    

检索策略:

1.  语义相似检索
    
2.  混合检索
    
3.  图式检索
    
4.  元数据过滤
    
5.  重排
    
6.  反思式检索
    

上面给大家总结了一下从“何时想起”到“如何检索”的完整框架的机制和策略，其实这些策略共同构成了 RAG 的多种实现形态，从简单的语义召回到带有反思与路由能力的自适应检索。其实我们大部分人会认为在平常用的LLM的token中是一个大仓库，其实LLM上下文中token不是仓库，而是过滤器——检索策略定义了Agent 的注意力边界，也塑造了它的“思考深度”。

在之前的话，AutoGPT 曾经尝试将所有任务摘要向量化存入 Pinecone（是一家专注于开发向量数据库技术的美国公司），但检索常常召回“语义相似但任务无关”的记录，Voyager 在 Minecraft 中的“技能库”检索则恰好相反：每次仅召回可执行的技能模块，显著提升学习效率。

然后我们再来说说检索，其实每次和GPT沟通，可能会有很多的token生成，他在自我检索的过程中，其实关键不是容量，而是token 之间的相关性。所以一个好的记忆检索，你会发现，他都同时会具有如下三点

1.  什么时候需要想起？
    
2.  想起哪些内容？
    
3.  想起后如何用？
    

###### 触发机制

那GPT Agent 何时“想起”之前的对话呢？一个有记忆的 Agent，并不会在每次对话都去翻遍自己的“记忆仓库”。真正聪明的系统，知道什么时候该想起。触发检索的时机，其实构成了GPT Agent 的“意识边界”。我们可以把它想象成人类的三种“回忆瞬间”：

1.  第一种呢，大家都遇到过，那就是容量不足，场景为：大家在上下文token过多的时候，GPT会让你充会员扩容，这个就是容量不足，我们用技术的话来说，那就是当对话历史变长、任务链变复杂时，旧的信息被挤出窗口，模型开始遗忘。那么，我们一起想想，如果我们充了会员以后，会发生什么？那就是我们让 Agent 在这种情况下主动去检索——像是人类“翻笔记”的瞬间。在工程上，这通常由一个简单的规则触发：当上下文长度接近阈值（比如 80% 的窗口容量）时，调用检索模块，把最相关的历史片段重新召回。这种模式就是**节制型的记忆唤醒**。 它让GPT Agent 在不增加计算负担的前提下，维持对过去的最小感知。
    
2.  第二种呢，则是模型自己在生成中评估到不确定性上升、连续几步推理逻辑断裂，或自己产生了矛盾，这种情况叫反思触发，遇到的场景: 之前我用GPT或者国产的大模型，在询问时，有时候会遇到比如它给我的反馈就是“需要回忆一下之前用户提过的xxx条件”，其实它是根据这句话，再去检索相关记忆。这种机制不靠固定阈值，而靠**自我监控**。这种情况，其实更像人类的思维，因为有时候人也会在遇到问题时，去回忆之前的某种模糊的场景，事实上我们会给模型一个简单的函数调用接口，例如：
    
    ```python
    if model.confidence < 0.5:
        memories = retrieve(query)
    ```
    
    让反思和检索之间形成闭环。这正是 Self-RAG(自我检索 ,文章：[https://zhuanlan.zhihu.com/p/661465330](https://zhuanlan.zhihu.com/p/661465330))、A-Mem( 文章详细说了A-Mem， [https://zhuanlan.zhihu.com/p/1888290059859514793](https://zhuanlan.zhihu.com/p/1888290059859514793) ) 这类系统的核心思想：**Agent 主动决定何时“想起”**。
    
3.  第三种则是情景型的，就比如，一个任务执行失败、某个工具调用报错，Agent 会去搜索之前的失败记录，又或者，当用户在不同会话中再次提到某个主题，Agent 会识别关键词，自动检索该主题下的历史交互。这类触发往往和**事件监听**或**日志回放机制**相关。它让 Agent 的记忆像一个条件反射系统： “相同的信号 → 激活相似的记忆 → 快速反应。”
    

上面就是三种不同的触发机制，我其实是长话短说，有兴趣可以自行上网查找

###### 检索机制

接下来再给大家介绍一下六种检索机制（按复杂度，可能会偏专业度一点的语言去说）

1.  语义相似检索 最基础的做法：将每条记忆文本编码为向量，通过余弦相似度召回前 K 条。
    
    ```python
    # 工程核心代码
    from sentence_transformers import SentenceTransformer
    import faiss, numpy as np
    
    # 初始化模型和索引
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    index = faiss.IndexFlatIP(384)  # 内积相似度
    
    # 写入记忆
    docs = ["用户喜欢猫", "昨天搜索了寿司餐厅", "会议纪要：讨论新功能"]
    embeddings = embedder.encode(docs, normalize_embeddings=True)
    index.add(np.array(embeddings))
    
    # 查询检索
    query = "找一家日本料理店"
    q_emb = embedder.encode([query], normalize_embeddings=True)
    scores, idx = index.search(q_emb, k=2)
    retrieved = [docs[i] for i in idx[0]]
    print(retrieved)
    
    # 改进方向：加上时间/任务过滤，形成 Hybrid 检索。
    ```
    
    优点：语义泛化强，易实现  
    缺点：可能召回“看似相关”的错误记忆（例如“猫”与“寿司”都和“喜欢”同义）
    
2.  稀疏检索与混合检索  
    BM25 等稀疏方法对关键词精确匹配更可靠，可与向量检索融合
    
    ```python
    # Hybrid 检索
    from rank_bm25 import BM25Okapi
    
    corpus = [doc.split() for doc in docs]
    bm25 = BM25Okapi(corpus)
    
    def hybrid_search(query, topk=3, alpha=0.6):
        q_emb = embedder.encode([query], normalize_embeddings=True)
        dense_scores, idx = index.search(q_emb, k=len(docs))
        bm25_scores = bm25.get_scores(query.split())
    
        combined = []
        for i, doc in enumerate(docs):
            dense = float(np.dot(q_emb, embedder.encode([doc], normalize_embeddings=True).T))
            score = alpha * dense + (1 - alpha) * bm25_scores[i]
            combined.append((score, doc))
        return sorted(combined, key=lambda x: -x[0])[:topk]
    ```
    
    优点：平衡语义与精确匹配，适合问答与代码检索
    
    缺点：参数 α 需按语料调节，否则会失衡
    
3.  图式检索  
    上面一种看不懂没关系，毕竟太过专业了，我自己也理解了好久，大家可以看下这个，图式检索的话其实这个将记忆组织为事件或知识图谱，更适合任务型 Agent。
    
    ```python
    import networkx as nx
    
    G = nx.Graph()
    G.add_edge("任务A", "任务B", relation="前置")
    G.add_edge("用户A", "任务B", relation="触发")
    
    def graph_retrieve(node, relation=None):
        neighbors = []
        for n, attr in G[node].items():
            if relation isNoneor attr["relation"] == relation:
                neighbors.append(n)
        return neighbors
    
    print(graph_retrieve("任务A"))  # -> ['任务B']
    ```
    
    优点：可解释、支持多跳推理
    
    缺点：构建与维护成本高，适合结构化日志/工具链场景
    
4.  元数据过滤与上下文路由  
    在语义检索前，先用元信息过滤搜索空间：如「同会话」「同用户」「近7天」「主题=工具调用」等。
    
    ```python
    def metadata_filter(memory, user=None, topic=None, since=None):
        results = memory
        if user:
            results = [m for m in results if m["user"] == user]
        if topic:
            results = [m for m in results if topic in m["tags"]]
        if since:
            results = [m for m in results if m["timestamp"] >= since]
        return results
    
    ```
    
    优点：降低搜索噪声、提升召回精度
    
    缺点：依赖高质量标注（tagging/日志结构）
    
5.  重排  
    我自己也不是很理解这个，用通俗点的话就是用额外模型重新打分前 K 条结果。取最优解就行，优缺点也一目了然  
    优点：提升最终 Top-1 准确度  
    缺点：增加计算成本；通常仅用于检索后的 re-ranking
    
6.  反思式检索  
    让 Agent 先自我评估检索结果是否足够，再决定是否“再搜一次”。  
    

```python
def reflective_retrieve(query):
    results = hybrid_search(query)
    # Step 1: 让 LLM 评估是否充分
    assessment = llm(f"是否足够回答此问题？结果如下：{results}")
    if "不足" in assessment:
        new_query = llm(f"请改写更精确的查询：{query}")
        results = hybrid_search(new_query)
    return results
```

这个其实是最好理解的，你可以理解为while循环，只是这个判断条件是在Agent自己手里，是否符合它自己的标准答案，这个优缺点也一目了然

优点：适合复杂任务或模糊查询

缺点：多次调用 LLM，延迟较高；但往往带来最自然的“记忆感”

###### 总结

最后我来总结一下，到这里我们已经看完六种检索策略。它们从语义相似、混合检索，到图式、重排、反思式检索——构成了一个完整的“找回记忆”的谱系。

那这些策略，与我们常说的 **RAG** 又是什么关系？（[https://www.zhihu.com/tardis/zm/art/675509396?source\_id=1003](https://www.zhihu.com/tardis/zm/art/675509396?source_id=1003) ，RAG文章）

RAG 的核心逻辑其实很简单：**先检索，再生成**。也就是说，当模型面对一个问题时，先到外部知识库中“查资料”，把相关文本取回来，再把这些资料和问题一起交给语言模型，生成最终回答。这是一个流程定义，而不是具体算法。换句话说，RAG 规定了“查资料”的框架，但没有规定“怎么查”。于是你看到的那些检索策略——Dense、Hybrid、Graph、Rerank、Self-RAG——其实都是在实现这个“查”的部分。它们是 RAG 框架的不同实现形态。