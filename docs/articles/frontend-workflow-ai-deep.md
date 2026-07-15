# 前端领域 Workflow 与 AI 结合的深度技术分享

前端与 AI 的结合，不能只停留在“页面输入 + 后端调用大模型 API + 前端渲染结果”的阶段。这个阶段当然能快速做出摘要生

成、文案生成、问答助手等功能，但从工程复杂度和业务价值看，它更像是把 LLM 能力包装成一个 UI，而不是把 AI 真正融入业务流程。

更有价值的方向，是 **Workflow + AI**。也就是把复杂任务拆成多个步骤，通过可视化节点、流程编排、模型推理、工具调用、人工确认、日志追踪和版本治理，构建一个可配置、可运行、可复用、可审计的智能工作流系统。

在这个系统里，需要先分清三个基础概念：**Tools、Agent、Workflow**。Tools 是最小的能力单元，只负责被调用时执行；Agent 是由 LLM 主导的动态决策系统，会根据目标选择工具、观察结果并决定下一步；Workflow 是由开发者或平台预先定义控制流的流程编排系统。三者的核心差异不是“谁更高级”，而是：**下一步该做什么，到底由谁决定**。

在生产环境里，最推荐的形态不是纯 Agent，也不是纯 Workflow，而是 **Agentic Workflow**：用 Workflow 固定主流程骨架，用 Agent 处理局部不确定问题，用 Tools / MCP 承接外部能力，用日志、权限、预算和人工审批保证系统可控。

本文面向前端工程师、产品经理和架构师，从概念、架构、协议、前端实现、执行引擎、可观测性、安全治理、产品模板和实施路线九个方面，系统说明前端如何参与并主导这类系统的建设。

## [圆角星星] 1. 为什么前端要关注 Workflow + AI [圆角星星]

过去我们理解 AI 应用时，常见的产品形态是一个聊天框：用户输入问题，系统返回答案。对前端来说，这种模式的工作量主要集中在输入框、对话列表、流式输出、Markdown 渲染、历史记录、复制下载等体验层。它有价值，但前端的角色仍然偏展示层。

而 Workflow + AI 的不同之处在于，它要求前端把一个“不可见的智能流程”变成“用户看得懂、配得动、跑得起来、查得清楚”的产品系统。用户不再只是输入一句话，而是可以看到流程由哪些节点组成，每个节点负责什么，节点之间如何流转，失败后如何处理，最终结果如何产生。

这件事天然需要前端能力，因为它涉及四类典型前端问题：

01

**可视化编排**：节点拖拽、连线、画布缩放、流程分支、节点状态展示。

02

**配置表单**：不同节点对应不同参数，参数需要校验、提示、默认值和动态显隐。

03

**执行反馈**：运行中、成功、失败、重试、等待人工审批、查看中间产物。

04

**产品封装**：把复杂工作流封装成模板，让非技术用户也能直接使用。

原始文档中已经提到，前端实现这类系统可以使用 **React Flow + React + JSON Schema**，其中 React Flow 负责画布和节点，JSON Schema 负责协议描述和配置驱动。这是一个非常正确的方向。但如果要进一步上升到生产系统，还需要补齐执行引擎、日志监控、成本控制、安全治理、版本管理和模板运营等能力。

## [圆角星星] 2. 基础概念：Tools、Agent、Workflow 的边界 [圆角星星]

理解这三个概念时，最容易犯的错误是把它们看成并列选项，甚至认为 Workflow 就是“多个 Agent 串起来”。更准确的理解是：它们是不同粒度、可以互相嵌套的结构。

### 2.1 Tools：最小的能力积木

Tool 本质上就是一个被模型或系统调用的函数。它可以是一次 HTTP 请求、一次数据库查询、一次文件解析、一次搜索、一次邮件发送，也可以是一个企业内部系统接口。

Tool 的特点是：

*   有明确输入；
    
*   有明确输出；
    
*   职责应该尽量单一；
    
*   本身不做流程决策；
    
*   需要通过描述信息告诉模型它能做什么。
    
    OpenAI 的 function calling 文档中，工具输入参数通常通过 JSON Schema 描述；这和前端的配置协议、表单渲染协议天然可以打通。\[3\]
    
    一个 Tool 可以写成这样：
    
```json
{
  "name": "search_component_docs",
  "description": "查询公司组件库文档，适合在生成前端页面代码前查找组件 API 和示例",
  "parameters": {
    "type": "object",
    "properties": {
      "componentName": {
        "type": "string",
        "description": "组件名称，例如 FormilyTable、SearchForm、DetailModal"
      },
      "scenario": {
        "type": "string",
        "description": "使用场景，例如列表筛选、详情弹窗、可编辑表格"
      }
    },
    "required": ["componentName", "scenario"],
    "additionalProperties": false
  }
}
```
    
    这段描述解决的是“模型如何知道工具存在、如何填参数”的问题。但 Tool 并不知道自己什么时候该被调用。决定调用它的，可以是 Agent，也可以是 Workflow，也可以是普通业务代码。
    
    ### 2.2 Agent：能动态决定下一步的执行者
    
    Agent 是一个带有决策能力的运行系统。它通常由 LLM、工具列表、上下文记忆、任务循环和停止条件组成。用户给它一个目标后，它会根据当前状态决定下一步是否需要调用工具、调用哪个工具、如何解释结果、是否继续执行。
    
    经典 Agent 循环可以理解为：
    
    Thought -> Action -> Observation -> Thought -> Action -> Observation -> Final Answer
    
    ReAct 论文提出了 reasoning 与 acting 交替推进的思想：模型通过推理形成行动，再通过行动获得环境反馈，随后根据反馈继续推理。\[10\]
    
    Agent 的优势是灵活，适合路径不确定的问题，例如竞品调研、复杂排障、多文件代码修改、资料分析等。但它的缺点也很明显：
    
*   执行路径不稳定；
    
*   成本和耗时不容易预测；
    
*   失败后不容易复现；
    
*   如果工具权限过大，安全风险更高；
    
*   如果没有停止条件，容易产生循环或过度调用。
    
    所以 Agent 适合放在“需要灵活判断的节点”里，而不一定适合支配整条业务主流程。
    
    ### 2.3 Workflow：由开发者预设控制流的流程编排
    
    Workflow 的核心是：整体流程由开发者或平台预先定义。节点可以是 LLM、Tool、Agent 或普通代码，但下一步怎么走，主要由流程图、条件节点或代码规则决定。
    
    例如客服流程：
    
    用户问题 -> 意图识别 -> 判断问题类型  
      -> 产品问题：检索知识库 -> 生成回复  
      -> 退款问题：查询订单 -> 判断是否符合退款条件 -> 处理退款 / 转人工  
      -> 其他问题：转人工
    
    这里 LLM 可以负责意图识别，Tool 可以负责查询订单，Agent 可以负责复杂追问，但主流程是写死的。Anthropic 在《Building effective agents》中也将 workflow 定义为：LLM 和工具通过预定义代码路径组织起来的系统；而 agent 则是由 LLM 动态指导自身流程和工具使用的系统。\[1\]
    
    Workflow 的优势是可控、可预测、可测试、易审计，更适合生产系统。缺点是灵活性有限，不能穷举所有异常输入。
    
    ### 2.4 Agentic Workflow：生产环境更现实的组合
    
    纯 Workflow 太硬，纯 Agent 太散。企业生产环境更常见的方式是 **Agentic Workflow**：
    
*   用 Workflow 固定主干流程；
    
*   在关键节点嵌入 Agent；
    
*   由 Tool / MCP 提供外部能力；
    
*   用权限、预算、日志、审批来限制风险。
    
    例如“前端需求分析助手”可以这样设计：
    
    用户输入需求  
     -> LLM 抽取需求要素  
     -> 条件节点判断任务类型  
     -> Agent 分析页面结构和组件选择  
     -> Tool 检索组件库文档  
     -> LLM 生成页面代码草稿  
     -> 评估节点检查规范  
     -> 不通过则回到优化节点  
     -> 通过则输出文档和代码片段
    
    这里主干是 Workflow，分析页面结构的部分可以用 Agent，组件库检索是 Tool，最终形成兼具可控性和灵活性的系统。
    
    ## [圆角星星] 3. 概念对照表：谁决定下一步 [圆角星星]
    
    | **形态** | **下一步由谁决定** | **核心组成** | **执行路径** | **可控性** | **灵活性** | **典型场景** |
    | --- | --- | --- | --- | --- | --- | --- |
    | Tools | 调用方决定 | 函数、API、数据库、文件解析 | 被动执行 | 最高 | 最低 | 单点能力封装 |
    | Agent | LLM 决定 | LLM + Tools + Memory + Loop | 动态、多轮、自主 | 较低 | 最高 | 路径未知、需要规划和试探的任务 |
    | Workflow | 开发者 / 平台决定 | 节点、边、条件、执行器 | 预定义图路径 | 高 | 中等 | 业务流程、审批流程、自动化处理 |
    | Agentic Workflow | 主干由 Workflow 决定，局部由 Agent 决定 | Workflow + Agent + Tools / MCP | 混合路径 | 较高 | 较高 | 企业级 AI 应用、研发助手、客服、数据分析 |
    
    面试或技术分享时可以用一句话总结：Tool 只执行，Agent 会自己决定下一步，Workflow 是开发者提前把下一步写好，Agentic Workflow 是把主流程交给 Workflow，把局部不确定性交给 Agent。
    
    ## [圆角星星] 4. 前端可编排系统的总体架构 [圆角星星]
    
    前端要做的不只是一个流程图编辑器，而是一个完整的“可编排 AI 应用平台”。推荐架构如下：
    
    _图 1：前端 Agentic Workflow 平台参考架构_
    
    这个架构可以分为四层。
    
    ### 4.1 产品模板层
    
    这是用户真正接触的入口。用户通常不希望从零拖节点，而是希望直接使用一个已经配置好的解决方案，例如：
    
*   埋点方案生成助手；
    
*   前端组件升级迁移助手；
    
*   智能客服处理流程；
    
*   合同审核助手；
    
*   周报生成助手；
    
*   需求分析助手。
    
    每个模板背后对应一条 Workflow，只是普通用户不需要看到全部细节。
    
    ### 4.2 可视化编排层
    
    这一层负责把协议变成用户可操作的界面。React Flow 很适合做节点式编辑器，因为它提供节点、边、缩放、拖拽、选择、保存恢复、防止非法连线等基础能力。\[5\]
    
    前端需要实现：
    
*   节点面板；
    
*   画布编辑器；
    
*   连线规则；
    
*   节点配置抽屉；
    
*   变量选择器；
    
*   运行预览；
    
*   节点状态展示；
    
*   失败节点定位；
    
*   版本对比和回滚。
    
    ### 4.3 协议与编译层
    
    这是系统最核心的一层。UI 不能只保存 React 组件状态，而应该保存一份可执行的 Workflow JSON。它既服务前端渲染，也服务后端执行。
    
    协议层需要描述：
    
*   节点 id、类型、名称、位置；
    
*   节点输入、输出；
    
*   节点私有配置 props；
    
*   节点执行策略 policies；
    
*   节点之间的边；
    
*   条件分支；
    
*   版本信息；
    
*   权限和预算约束。
    
    编译层则负责把 JSON 变成可运行的图：校验节点、构建邻接表、检查非法环、检查变量引用、检查权限和预算。
    
    ### 4.4 运行时层
    
    运行时层负责真正执行 Workflow。它需要支持：
    
*   LLM 节点；
    
*   Tool 节点；
    
*   Agent 节点；
    
*   条件节点；
    
*   并行节点；
    
*   人工审批节点；
    
*   重试和 fallback；
    
*   日志、指标和 trace；
    
*   成本控制和超时控制。
    
    这层通常不完全在前端执行，但前端必须参与设计，因为前端需要展示执行状态、调试日志和运行结果。
    
    ## [圆角星星] 5. 协议设计：JSON Schema 为什么重要 [圆角星星]
    
    原始文档中非常强调 JSON Schema 协议，这一点是对的。因为一个工作流系统能不能长期扩展，关键不在画布，而在协议。
    
    协议设计需要满足四个原则：
    
    01
    
    **足够抽象**：不同节点共享统一字段结构。
    
    02
    
    **字段唯一**：不要让同一个字段在不同节点里表达不同含义。
    
    03
    
    **私有属性内聚**：节点特有配置放在 props 中，避免污染顶层协议。
    
    04
    
    **可扩展**：后续可以增加新节点、新策略、新工具和新运行模式。
    
    JSON Schema 官方将其定义为描述 JSON 数据结构与约束的声明式语言，可用于校验、文档生成和系统互操作。\[6\] 对 Workflow 平台来说，这意味着同一份协议可以同时驱动：
    
*   节点配置表单；
    
*   节点参数校验；
    
*   执行前静态检查；
    
*   模型工具参数定义；
    
*   文档自动生成；
    
*   模板市场检索。
    
    ### 5.1 建议的 Workflow 协议结构
    
```json
{
  "workflowId": "wf_frontend_demo",
  "version": "1.0.0",
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  },
  "nodes": [
    {
      "id": "start_1",
      "type": "start",
      "title": "用户输入",
      "position": {
        "x": 80,
        "y": 120
      },
      "inputs": {},
      "outputs": {
        "query": {
          "type": "string"
        }
      },
      "props": {},
      "policies": {
        "timeoutMs": 1000
      },
      "meta": {
        "tags": ["entry"]
      }
    },
    {
      "id": "llm_1",
      "type": "llm",
      "title": "需求抽取",
      "position": {
        "x": 360,
        "y": 120
      },
      "inputs": {
        "query": "{{start_1.query}}"
      },
      "outputs": {
        "intent": {
          "type": "string",
          "enum": ["page", "tracking", "migration"]
        },
        "entities": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "props": {
        "model": "gpt-4.1",
        "temperature": 0.2,
        "prompt": "请抽取任务意图与关键实体，输出结构化 JSON。"
      },
      "policies": {
        "timeoutMs": 15000,
        "maxRetries": 1,
        "costBudget": {
          "maxInputTokens": 4000,
          "maxOutputTokens": 600
        }
      },
      "meta": {
        "tags": ["classification", "llm"]
      }
    }
  ],
  "edges": [
    {
      "id": "e_start_llm",
      "source": "start_1",
      "target": "llm_1"
    }
  ]
}
```
    
    ### 5.2 节点字段说明
    
    | **字段** | **含义** | **前端用途** | **执行用途** |
    | --- | --- | --- | --- |
    | id | 节点唯一标识 | key、连线锚点、定位 | 运行索引、日志定位 |
    | type | 节点类型 | 渲染不同节点组件 | 选择不同执行器 |
    | title | 节点名称 | 画布展示、搜索 | 审计可读性 |
    | position | 画布坐标 | React Flow 渲染 | 通常不参与执行 |
    | inputs | 输入绑定 | 配置面板、变量选择器 | 运行时解析依赖 |
    | outputs | 输出声明 | 下游变量提示 | 类型检查、上下文写入 |
    | props | 私有配置 | 表单渲染 | 执行器参数 |
    | policies | 策略配置 | 高级设置 | 超时、重试、预算、审批 |
    | meta | 元数据 | 模板检索、版本信息 | 发布审计 |
    
    ### 5.3 为什么要区分 props 和 policies
    
    很多系统一开始会把所有配置都塞进 props，后期就会变得难以治理。建议把“节点业务参数”和“运行治理参数”分开：
    
*   props 表达这个节点要做什么；
    
*   policies 表达这个节点允许怎么做。
    
    例如 LLM 节点的 prompt、model、temperature 属于 props；timeout、maxRetries、tokenBudget、approvalRequired 属于 policies。
    
    这种区分可以让平台后续做统一治理：比如所有 Tool 节点默认最多重试 2 次；所有外部写操作必须人工审批；所有 Agent 节点最大循环 8 轮。
    
    ## [圆角星星] 6. 前端可视化编排实现细节 [圆角星星]
    
    ### 6.1 基于 React Flow 的编辑器结构
    
    一个基础编辑器可以拆成以下组件：
    
    WorkflowEditor  
     ├── NodePalette          节点物料面板  
     ├── FlowCanvas           React Flow 画布  
     ├── NodeConfigDrawer     节点配置抽屉  
     ├── VariablePanel        变量选择器  
     ├── RunConsole           运行控制台  
     ├── VersionPanel         版本记录  
     └── TemplatePanel        模板管理
    
    React Flow 的 nodes、edges 和 viewport 可以作为编辑态的基础结构。保存时，不应只保存 UI 状态，而要转换为平台自己的 Workflow JSON。React Flow 官方也提供了 save and restore 相关示例，适合作为保存草稿、恢复画布和版本管理的基础参考。\[5\]
    
    ### 6.2 编辑态和运行态要分离
    
    前端很容易把编辑状态和运行状态混在一起，这是后期难维护的重要原因。建议至少分成两类 store：
    
    | **状态类型** | **内容** | **生命周期** |
    | --- | --- | --- |
    | 编辑态状态 | nodes、edges、viewport、当前选中节点、配置表单 | 用户编辑期间存在 |
    | 运行态状态 | runId、nodeRunStatus、logs、outputs、trace、errors | 每次运行独立存在 |
    
    这样做的好处是：
    
*   用户可以编辑草稿，不影响已发布版本；
    
*   一次运行失败不会污染画布配置；
    
*   同一个 Workflow 可以有多次运行记录；
    
*   运行结果可以回放和对比。
    
    ### 6.3 连线规则与环检测
    
    不是所有节点都能随便连。例如：
    
*   start 节点不能有入边；
    
*   end 节点不能有出边；
    
*   condition 节点至少要有两个分支；
    
*   llm 节点不能直接连接到没有输入声明的节点；
    
*   默认不允许隐式环；
    
*   如果允许循环，必须通过 loop 节点显式表达，并设置最大循环次数。
    
    React Flow 有防止循环连线的示例，前端可以在 onConnect 阶段就进行校验，避免非法图进入保存阶段。\[5\]
    
    ### 6.4 变量系统
    
    变量系统是 Workflow 平台的关键。用户需要在下游节点引用上游节点输出，例如：
    
    &#123;&#123;start\_1.query}}  
    &#123;&#123;llm\_1.intent}}  
    &#123;&#123;search\_1.docs\[0\].title}}
    
    前端需要提供变量选择器，而不是让用户手写路径。变量选择器应该根据当前节点的上游依赖动态生成可选项，并显示字段类型、字段说明和示例值。
    
    建议变量系统具备以下能力：
    
*   只展示当前节点可访问的上游输出；
    
*   支持字段类型提示；
    
*   支持默认值和空值处理；
    
*   支持数组取值和 map；
    
*   支持运行时预览；
    
*   支持变量引用校验。
    
    ## [圆角星星] 7. 执行引擎：从流程图到可运行系统 [圆角星星]
    
    如果只有画布和协议，系统仍然只是“能画”。真正的难点是执行引擎。
    
    _图 2：Workflow 执行引擎流程_
    
    ### 7.1 执行引擎需要解决的问题
    
    执行引擎至少要解决八类问题：
    
    请输入标题
    
    **01 图校验：节点是否完整、边是否合法、变量是否可解析。**
    **02 图编译：构建邻接表、入度表、分支规则和执行计划。**
    **03 状态管理：保存每个节点的状态和输出。**
    **04 调度策略：顺序执行、并行执行、条件执行、循环执行。**
    **05 异常处理：失败重试、fallback、人工接管、终止。**
    **06 成本控制：token 预算、模型调用次数、工具调用次数。**
    **07 日志追踪：每个节点的输入、输出、耗时、错误和中间产物。**
    **08 安全治理：权限、密钥、敏感操作审批、输出拦截。**
    
    ### 7.2 节点状态机
    
    建议每个节点运行时都有明确状态：
    
```text
idle -> ready -> running -> succeeded
                       -> failed
                       -> skipped
                       -> waiting_approval
                       -> cancelled
```
    
    这种状态机可以直接驱动画布展示。例如：
    
*   running：节点高亮并显示 loading；
    
*   succeeded：节点显示绿色状态和耗时；
    
*   failed：节点显示红色状态和错误摘要；
    
*   waiting\_approval：节点显示待审批标识；
    
*   skipped：节点灰色显示。
    
    ### 7.3 编译阶段伪代码
    
```ts
function compileWorkflow(definition) {
  assertValidSchema(definition);

  const nodeMap = new Map();
  const outgoing = new Map();
  const incomingCount = new Map();

  for (const node of definition.nodes) {
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }

    nodeMap.set(node.id, normalizeNode(node));
    outgoing.set(node.id, []);
    incomingCount.set(node.id, 0);
  }

  for (const edge of definition.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      throw new Error(`Invalid edge: ${edge.id}`);
    }

    outgoing.get(edge.source).push(edge.target);
    incomingCount.set(edge.target, incomingCount.get(edge.target) + 1);
  }

  detectIllegalCycles(nodeMap, outgoing);
  validateBindings(nodeMap, outgoing);
  validatePolicies(nodeMap);

  return { nodeMap, outgoing, incomingCount };
}
```
    
    ### 7.4 运行阶段伪代码
    
```ts
async function runWorkflow(compiled, input, services) {
  const ctx = createRunContext(input);
  const readyQueue = seedStartNodes(compiled);

  while (readyQueue.length > 0) {
    const nodeId = readyQueue.shift();
    const node = compiled.nodeMap.get(nodeId);

    if (!canExecute(node, ctx)) continue;

    const record = beginNodeRun(ctx, node);

    try {
      enforceBudget(ctx, node);
      enforcePermission(ctx, node);

      const resolvedInputs = resolveBindings(node.inputs, ctx.blackboard);
      const result = await executeNode(node, resolvedInputs, services, ctx);

      writeOutputs(ctx.blackboard, node.id, result.outputs);
      finishNodeRun(record, "succeeded", result.meta);

      const nextNodes = activateSuccessors(compiled, node, ctx.blackboard);
      readyQueue.push(...nextNodes);
    } catch (error) {
      recordError(record, error);

      if (shouldRetry(node, record, error)) {
        readyQueue.push(nodeId);
        continue;
      }

      const fallbackNodes = activateFallback(compiled, node, error, ctx);

      if (fallbackNodes.length > 0) {
        readyQueue.push(...fallbackNodes);
      } else {
        markRunFailed(ctx, node, error);
        break;
      }
    }
  }

  return finalizeRun(ctx);
}
```
    
    ### 7.5 Agent 节点的停止条件
    
    Agent 节点必须设置停止条件，否则生产环境不可控。建议至少包含：
    
*   最大循环轮数；
    
*   最大工具调用次数；
    
*   最大 token 预算；
    
*   最大运行时间；
    
*   最大重试次数；
    
*   人工审批触发条件；
    
*   失败 fallback。
    
    例如：
    
```json
{
  "type": "agent",
  "props": {
    "goal": "分析需求并给出页面实现方案",
    "tools": ["search_component_docs", "query_design_rules"],
    "model": "gpt-4.1"
  },
  "policies": {
    "maxSteps": 8,
    "maxToolCalls": 5,
    "timeoutMs": 60000,
    "approvalRequiredTools": ["create_pull_request"]
  }
}
```
    
    ## [圆角星星] 8. MCP 与工具链接入 [圆角星星]
    
    随着工具数量变多，单纯在系统里手写工具列表会越来越难维护。MCP 的价值在于，它试图为 AI 应用和外部系统之间建立统一连接标准。MCP 官方文档将其定义为连接 AI 应用与外部系统的开放标准，并采用 host-client-server 架构。\[8\]
    
    对 Workflow 平台来说，MCP 可以解决几个问题：
    
*   工具发现：平台可以从 MCP Server 获取工具列表。
    
*   工具描述：工具自带参数结构和说明。
    
*   权限边界：通过客户端控制哪些 server 和工具可用。
    
*   工具复用：同一个 MCP Server 可以被多个 Workflow 使用。
    
*   生态扩展：接入 GitHub、文件系统、浏览器、数据库、内部系统。
    
    Dify 的 GitHub 仓库将其描述为一个开源 LLM 应用开发平台，包含 AI workflow、RAG pipeline、agent capabilities、model management、observability 等能力，并强调可以通过可视化画布构建 AI workflow。\[7\]
    
    ### 8.1 平台中的 MCP 适配层
    
    建议不要让业务节点直接对接 MCP Server，而是在平台中增加 MCP Client 适配层：
    
    Workflow Engine  
       -> Tool Adapter  
          -> Built-in Tools  
          -> HTTP Tools  
          -> MCP Client  
              -> MCP Server: GitHub  
              -> MCP Server: File System  
              -> MCP Server: Browser  
              -> MCP Server: Internal ERP
    
    这样做有三个好处：
    
    01
    
    可以统一鉴权和审计；
    
    02
    
    可以统一限流和预算；
    
    03
    
    可以统一处理工具描述变更和版本兼容。
    
    ### 8.2 工具设计原则
    
    好的 Tool 设计比很多人想象得重要。Agent 表现不好，很多时候不是模型差，而是工具设计差。
    
    建议遵循：
    
*   一个工具只做一件事；
    
*   工具描述要具体，不要写“查询数据”这种泛描述；
    
*   参数尽量少；
    
*   返回结果结构化；
    
*   错误信息要给模型看得懂；
    
*   高风险工具必须人工审批；
    
*   工具调用要记录日志；
    
*   工具版本要可追踪。
    
    ## [圆角星星] 9. 日志、可观测性与成本控制 [圆角星星]
    
    ### 9.1 为什么日志是核心能力
    
    Workflow + AI 系统如果没有日志，基本无法上线。因为 LLM 输出存在不确定性，Agent 也可能走不同路径。如果没有每个节点的输入、输出、耗时、错误和工具调用记录，出了问题很难定位。
    
    OpenTelemetry 将 observability 信号分为 traces、metrics、logs；trace 用于理解请求经过系统的路径，log 用于记录带时间戳的事件，metrics 用于观察趋势和系统状态。\[11\]
    
    在 Workflow 平台中可以这样映射：
    
    | **信号** | **平台含义** | **示例** |
    | --- | --- | --- |
    | Trace | 一次完整 Workflow 运行链路 | runId、traceId、节点顺序 |
    | Log | 节点级事件 | 输入、输出摘要、错误、工具结果 |
    | Metrics | 聚合指标 | 成功率、耗时、token、成本、失败节点排行 |
    
    ### 9.2 建议的日志结构
    
```json
{
  "trace_id": "tr_01J...",
  "run_id": "run_20260527_001",
  "workflow_id": "wf_frontend_demo",
  "workflow_version": "1.0.0",
  "node_id": "llm_1",
  "node_type": "llm",
  "status": "succeeded",
  "latency_ms": 2840,
  "retry_count": 0,
  "model": "gpt-4.1",
  "tool_name": null,
  "prompt_tokens": 1632,
  "completion_tokens": 278,
  "cost_estimate": 0.012,
  "error_class": null,
  "approval_required": false,
  "timestamp": "2026-05-27T10:24:13+09:00"
}
```
    
    ### 9.3 成本控制
    
    AI Workflow 的成本不是单次模型调用价格这么简单，而是由以下因素共同决定：
    
*   节点数量；
    
*   模型调用次数；
    
*   每次上下文长度；
    
*   tool 定义数量；
    
*   Agent 循环次数；
    
*   重试次数；
    
*   并行分支数量；
    
*   是否命中 prompt caching。
    
    OpenAI 的成本优化建议包括减少请求数量、减少 token、选择更小模型，并注意 tool/function 定义本身也会占用输入 token。\[9\]
    
    因此平台层应提供：
    
*   单次运行最大成本；
    
*   单节点最大 token；
    
*   Agent 最大循环；
    
*   工具调用次数上限；
    
*   超预算自动停止；
    
*   成本看板；
    
*   模型分级策略，例如分类节点用小模型、生成节点用强模型。