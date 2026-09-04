# Sentry 基本原理

前端线上最难处理的问题，往往不是代码报错了，而是用户只告诉你一句：刚才页面白屏了。

你打开本地环境，一切正常；再问用户做了什么，他可能也说不清楚。这个时候如果我们只有一条 TypeError，其实还是很难定位问题，因为真正缺少的不是错误名称，而是：哪个版本出的错、用户之前点了什么、请求了哪个接口、影响了多少人，以及压缩后的代码到底对应哪一行源码。

所以我更愿意把 Sentry 理解成一套围绕错误现场构建的可观测系统。它当然能收集报错，但它真正有价值的地方，是尽量把线上问题发生前后的上下文重新拼回来。

## Sentry 是什么

很多人第一次接触 Sentry，会把它理解成--前端错误日志平台。一开始我也是这样想的，但是后面我仔细思考了原理和链路发现其实这个说法只说对了一部分。

一条普通日志一般只告诉我们某个时间发生了某件事，而 Sentry 会把一次异常整理成一个结构化的 Event，里面可以包含异常类型、调用栈、页面地址、浏览器、操作系统、用户信息、Breadcrumbs、版本、环境和 Trace 上下文。然后，它再把相似的 Event 聚合成一个 Issue，方便研发判断这个问题出现了多少次、影响了多少用户，以及修复后有没有再次发生。

目前 Sentry 常用的能力主要包括：

*   **错误监控**：收集前端、服务端和移动端异常，展示调用栈与上下文。

*   **Issue 聚合与治理**：把重复错误合并，支持分配、忽略、解决和回归检测。

*   **性能追踪**：通过 Trace 和 Span 分析页面加载、接口请求和服务端调用链路。

*   **Session Replay**：回放用户发生问题前后的页面状态和操作过程。

*   **Release 管理**：把错误与发布版本、Commit 和部署记录关联起来。

*   **告警与统计**：根据新错误、错误增长、影响用户数或性能指标发送通知。


除此之外，Sentry 还扩展了 Profiling、Logs、Cron Monitor、User Feedback 等能力，但我个人认为不要一上来就把所有功能全开。先主要聚焦在如何把错误、版本和 Source Map 做准确，然后再逐步接入性能与 Replay，这样收益会明显一点。

### 前端错误是怎么被捕获的

我们先从最常见的浏览器场景开始。接入 Sentry 时，一般会先初始化 SDK：

```ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.url?.includes('localhost')) {
      return null
    }

    return event
  }
})
```

稍微解释一下：这里的 DSN 可以理解成项目的上报地址和项目标识。浏览器端 DSN 本身不是用来管理 Sentry 的后台密钥，所以会出现在前端产物里；但是上传 Source Map 使用的 Auth Token 具备管理权限，必须放在 CI 环境变量中，绝对不能打进前端代码。

初始化之后，SDK 会安装一组 Integration。以浏览器为例，它主要的作用就是监听全局运行时错误和没有被处理的 Promise rejection；React、Vue 等框架的 SDK 还会结合各自的错误边界或错误处理钩子，补充组件相关信息。

可以把它粗略理解成：

```text
window error / unhandledrejection / framework error handler
                            ↓
                     Sentry SDK 捕获异常
```

如果错误已经被业务代码 try catch  吃掉了，SDK 就不一定知道它发生过，这时需要去主动上报：

```ts
try {
  await submitOrder()
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      module: 'order',
      action: 'submit'
    }
  })

  throw error
}
```

这里有个问题，我需要说明一下，这是个坑：我用WMS测试的时候，fetch 收到 HTTP 500 时，Promise 默认并不会因为状态码而 reject。Sentry 可能会在性能链路里看到这个请求，但不一定会把它当成一个业务异常，所以关键接口仍然需要我们根据状态码和业务响应主动记录。

### Breadcrumbs：错误发生前，用户做了什么

只知道最后一行报错，很多时候是不够的。比如一个空指针异常，可能是用户先切换仓库、又修改筛选条件，最后点击提交才触发的。Sentry 会自动记录一部分 Breadcrumbs，也就是-面包屑。浏览器 SDK 常见的记录包括页面跳转、用户点击、console 调用和 XHR / Fetch 请求。它们不会代替完整日志，而是保留错误发生前的一条轻量操作轨迹。我们也可以加入业务面包屑：

```ts
Sentry.addBreadcrumb({
  category: 'order',
  message: '用户切换发货仓库',
  level: 'info',
  data: {
    warehouseId: 'WH-001'
  }
})
```

我个人认为，业务 Breadcrumbs 比盲目上传大量console.log  更有价值。埋点不需要多，只需要回答或者明白：用户刚才做了什么、使用了什么关键条件、在哪一步开始偏离正常流程。

### Event、Scope 和 Envelope

异常被捕获后，SDK 并不是直接把一个 Error 对象扔到服务器，而是先把它转换成标准 Event。

Event 是这一次事件本身，里面会有异常、调用栈和时间等信息；Scope 可以理解成当前上下文，里面保存用户、Tags、Extra、Breadcrumbs、环境和 Trace 信息。真正发送之前，SDK 会把 Event 与当前 Scope 合并，再执行 Event Processor、beforeSend、采样和去重等逻辑。

最后，数据会被封装成 Envelope。Envelope 不是单纯的一段错误 JSON，它更像一个运输包，里面可以携带不同类型的数据项，比如 Error Event、Span、Session、Replay、Profile 和 Attachment。这样 Sentry 可以用一套统一协议接收不同的可观测数据。

完整链路大概是这样的，为了方便大家理解，我让GPT生成了流程图：

![Sentry SDK 事件处理流程](/images/sentry-sdk-event-flow.png)

这里的最后一个节点 beforeSend 很重要，因为数据离开用户浏览器之前，还有最后一次修改或丢弃事件的机会。因为在大部分业务场景下密码、Token、手机号、身份证号这类敏感信息应该在这里或更早的位置完成脱敏，而不是等传到服务器以后再考虑。

### 服务端收到事件以后做了什么

SDK 发出去以后，事件并不会直接显示在 Sentry 页面上，中间还要经过接入、处理、聚合和存储。Sentry Cloud 和不同版本的 Self-Hosted 部署细节会有区别，但从原理上可以把服务端链路理解为：

![Sentry 服务端事件处理流程](/images/sentry-server-processing-flow.png)

Relay 是 Sentry 的事件接入层。它会检查 DSN 和项目状态，对数据做标准化、过滤、数据清洗以及额度限制，然后把可接受的数据交给后续异步管道。Sentry 的查询侧还使用 Snuba 在 ClickHouse 之上提供事件和时间序列查询能力。

这个流程里其实有个需要注意的点是：SDK 收到 200的状态码的时候，不一定代表事件已经完整处理并写入后台。有可能是为了降低上报接口的响应时间，接入层可能先快速接收请求，后面再异步完成精确校验、过滤和限流。所以 200 更接近请求已经被接收，不是你一定能在 Issues 页面看到它。

### Source Map 为什么能还原压缩代码

前端代码发布到生产环境后，通常会经过 TypeScript 编译、Tree Shaking、合并和压缩。原来这样的代码：

```ts
const userName = currentUser.profile.name
```

打包以后可能全部挤在assets/xxxx.js的第一行。当线上报错只告诉我们xxxx.js:1:xxxx，基本上是无法去定位的。

Source Map 的作用，就是保存“生成代码的位置”到“原始源码的位置”之间的映射。现代 Sentry JavaScript 工具链会在构建产物和 Source Map 中注入 Debug ID，再把这些调试文件上传到 Sentry。事件上报时也会携带对应的调试信息，服务端根据 Debug ID 找到正确的 Source Map，把压缩调用栈还原成原始文件、函数、行号和列号。

流程可以理解成：

![Source Map 构建与还原流程](/images/sentry-source-map-flow.png)

所以 Source Map 必须和实际部署的产物一一对应，而且最好在用户触发错误之前就完成上传。如果每次构建都覆盖同一个文件名、Source Map 没上传成功，或者上传的是另一个版本的产物，Sentry 也不会定位到源码位置。

所以更应该在 CI 构建阶段自动完成 Debug ID 注入和 Source Map 上传，上传成功后不再把 .map 文件部署到公开静态服务器。这样既能还原源码，也可以减少源码意外暴露的风险。

### Sentry 为什么会把重复错误合并

如果同一个错误影响了一万名用户，我们肯定不希望 Issues 页面出现一万条记录，所以 Sentry 区分了两个概念：

*   **Event**：错误的某一次具体发生。

*   **Issue**：一批被认为来自同一个根因的 Event。


Sentry 会根据异常类型、错误信息和调用栈等数据生成分组依据，把相似事件合并。调用栈中真正属于业务代码的 Frame 很重要，因为第三方依赖、浏览器扩展和随机参数都可能制造噪声。

如果默认分组不符合业务，我们还可以设置自定义 Fingerprint。例如支付渠道不同，但底层都抛出相同异常时，可以把渠道加入 Fingerprint；反过来，如果错误信息里带有随机订单号，也可以使用稳定字段，避免同一个问题被拆成大量 Issue。

分组完成后，Sentry 才能继续做首次出现、最后出现、影响人数、是否回归、在哪个版本引入等分析。错误聚合是为了把海量 Event 总结并且聚焦成某几个问题。方便问题的归因

### 性能追踪是怎么实现的

一般错误监控是为了快速定位并且解决Bug，然而性能追踪是为了知道哪里的渲染或者接口慢了，导致用户体验不佳。而sentry的性能追踪主要的链路是：

Sentry 会用 Trace 表示一条完整调用链，用 Span 表示链路中的一个操作。浏览器可以产生页面加载、路由跳转、XHR / Fetch 等 Span；服务端可以继续记录 Controller、数据库、缓存和外部 HTTP 请求。

```text
用户打开订单页 Trace
 ├─ pageload
 ├─ GET /api/order
 │   ├─ controller
 │   ├─ database query
 │   └─ redis get
 └─ render order table
```

前后端想串成同一条 Trace，需要传播 Trace 信息。浏览器请求通常会携带sentry-trace  和 baggage 等 Header头，服务端 SDK 读取后继续创建子 Span。如果接口跨域，后端 CORS 也要允许这些 Header，否则前端链路和服务端链路会断开。

性能数据量通常远大于错误数据，所以生产环境不建议无脑设置tracesSampleRate:1.0 。更合理的做法是按环境、接口和业务重要度采样：核心下单链路保留更多，健康检查和高频低价值请求降低比例。主要是为了在监控成本和排查精度之间做平衡。

### Session Replay 原理

Session Replay 看起来像视频回放，但它的原理并不是持续给用户屏幕录像。浏览器端会记录 DOM 初始状态、后续 DOM 变化、点击、输入、滚动、网络与控制台等事件，再在 Sentry 后台重新构建出用户当时看到的页面过程。这种方式比录制视频更容易和错误、网络请求、Breadcrumbs、Trace 对齐，也方便查看某个时间点的页面状态。但是也会有对应的问题：它会增加 SDK 体积、浏览器开销、网络流量和存储成本，而且页面里可能存在隐私数据。

所以 Replay 做了三件事：

1.  设置合理采样率，不要默认全量记录。

2.  对输入框、文本和敏感区域做 Mask 或 Block。

3.  重点保留错误会话，而不是把所有正常操作都录下来。


replaysOnErrorSampleRate 的主要功能点就在这里：平时只保留少量正常会话，一旦会话中出现错误，再提高错误现场的保留比例。

## 总结

最后我们再把总结一下链路：Sentry SDK 先监听运行时和框架异常，记录 Breadcrumbs，把异常转换成 Event，再合并 Scope 中的用户、版本、环境和 Trace 信息；经过过滤、脱敏和采样后，数据被装进 Envelope 发送到 Relay；服务端继续完成标准化、限流、Source Map 还原、Issue 分组、存储和告警，最终才变成我们在后台看到的错误现场。

所以 Sentry 的核心并不是收集错误，而是把一次无法复现的线上问题，变成一条可以检索、聚合、还原和追踪的工程化链路。

我个人认为，真正有效的接入顺序应该是：先保证 Error、Release 和 Source Map 准确，再补充业务 Breadcrumbs 与 Tags，然后接性能 Trace，最后根据隐私和成本决定是否开启 Replay。工具开得多不代表可观测性就做得好，能更快找到问题并且定位问题、让同类问题更少再次发生，才是 Sentry 的价值。
