# 微前端架构

#### 1:微前端架构是什么？和之前的SPA应用以及MPA应用区别在哪？

开头先给大家灌输一下概念性的东西

微前端是什么？ 它是一种类似于微服务的架构，是一种由独立交付的多个前端应用组成整体的架构风格，将前端应用分解成一些更小、更简单的能够独立开发、测试、部署的应用，而在用户看来仍然是内聚的单个产品

大家能记住上面这个概念，然后自己思考一下，如果这是一个优化代码和项目结构的需求交给你想想你会怎么去做,怎么去拆分？

正式说微前端之前，我来先带大家捋一下前端的这些年主要的项目设计策略

*   SPA（单页应用模式）
    
    ERP现在就是SPA应用，所有的ERP业务都会在一个仓库里进行迭代开发，
    
*   MPA （多页应用模式）
    

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/r4mlQ5bNw1oENlxo/img/fad0f068-f6d2-4ff8-81cd-369ca4c53e8a.png)

举个例子，如果把甘草医生整个系统看成是个大的业务系统，那么将业务系统分为多个仓库维护，在首页聚合所有平台的入口 ，这种开发模式就是MPA

上面是为了给大家能带来实际的体感结合的公司的系统来举例说明的，那么上面两种模式这样的开发好处是什么，坏处是什么呢

*   好处: 
    
    *   统一的权限管控、统一的 Open API 开发能力
        
    *   更好的代码复用，基础库复用
        
    *   统一的运营管理能力
        
    *   不同系统可以很好的通信
        
    *   SPA 应用特有优势：
        
        *   更好的性能
            
        *   具备局部更新，无缝的用户体验
            
        *   提前预加载用户下一页的内容
            
*   劣势：
    
    *   代码权限管控问题
        
    *   项目构建时间长
        
    *   需求发布相互阻塞
        
    *   代码 commit 混乱、分支混乱
        
    *   技术体系要求统一（ps: 目前是通过应用的方式进行区分，那么可以想一下，如果我ERP采购要用VUE，库存要用React, 这种是不是就做不了 ）
        
    *   无法同时灰度多条产品功能
        
    *   代码回滚相互影响
        
    *   错误监控无法细粒度拆分
        

##### 1.1:SPA应用的解读

采用**SPA的劣势非常明显，在日常开发中研发：代码构建半小时以上**、发布需求时被需求阻塞、无法局部灰度局部升级、项目遇到问题时回滚影响其他业务、无法快速引进新的技术体系提高生产力，项目的迭代和维护对于前端来说真的太糟心了

**真实感受**：可能大家暂时没遇到过，但是我之前遇到过一个内部项目，可能一个文件就有1000行代码，把所有功能都在一个仓库，那真的，启动到构建成功我都得启动半分钟，每次写功能简直噩梦，后面我丢给外包干了，真的干不动 

但是不可否认的是，尽管降低了开发体验，如果对项目整体的代码拆分，懒加载控制得当，其实对于使用平台的用户而言体验却是提升的（**不过得有很好的模块化拆分的能力，对于每一块的能力边界要有很强的划分能力**），这一切都归因于 SPA 应用带来的优势，SPA 应用跳转页面时无需刷新整个页面，路由变化时仅更新局部，不用让用户产生在 MPA 应用切换时整个页面刷新带来的抖动感而降低体验，并且由于页面不刷新的特性可以极大程度的复用页面间的资源，降低切换页面时带来的性能损耗，用户也不会感知他在使用不同平台。

##### 1.2:MPA应用的解读

说到这了，可能会有人说，那我们可以把他拆分MPA应用呀，拆成多个仓库去维护就好了呀。OK ，带着这个问题，我们继续往下走

假如拆成MPA应用我们可以解决什么样的问题呢？

*   完美解决我上面说的构建卡顿问题，
    
*   可以使用不同的技术栈，这样对于人员的技术体系要求可以适当放宽
    
*   不存在同一个仓库维护时的 commit 混乱和分支混乱等问题
    
*   功能灰度互不影响
    

相对的，那么又会带来什么样的问题呢？

*   用户在使用时体验割裂，会在不同平台间跳转，无法达到 SPA 应用带来的用户体验（现在的ERP详情就有这样的问题，会跳新页面，会有一定程度上的割裂感）
    
*   只能以页面维度拆分，无法拆分至区块部分，只能以业务为维度划分
    
*   多系统同灰度策略困难
    
*   公共包基础库重复加载
    
*   不同系统间不可以直接通信
    
*   公共部分只能每个系统独立实现，同一运维通知困难
    
*   产品权限无法进行统一收敛 采用方案二在一定程度上提升了开发体验，但却降低了用户体验，在日常开发工作中需要使用大量的平台，但是却需要跳转到不同的平台上进行日常的研发工作，整体使用体验较差。体验较差的原因在于将由于通过项目维度拆分了整体「研发中台」这样的一个产品，使各个产品之间是独立的孤岛，系统间相互跳转都是传统意义上的 MPA，跳转需要重新加载整个页面的资源，除了性能是远不如 SPA 应用的并且应用间是没法直接通信，这就进一步增强了用户在使用产品时的割裂感
    

我们总结一下，通过以上给大家阐述的MPA和SPA应用，其实我们可以通过前端这几年的发展去分析，由于 Web 应用在逐步取代传统的 PC 软件时（ 小程序，H5 ，electron ,  flutter ），大规模 Web 应用在面对高复杂度和涉及团队成员广下无法同时保证 DX 和 UX 的交付质量。传统的分而治之的策略已经无法应对现代 Web 应用的复杂性，因此衍生出了微前端这样一种新的架构模式，与后端微服务相同，它同样是延续了分而治之的设计模式，不过却以全新的方法来实现，其实我更愿意称之为一个全新的思维，为什么这么说？等我介绍原理的时候，大家就能明白

#### 2:微前端核心原理

##### 2.1 主流的微前端框架介绍

先给大家介绍一下我们前端目前主流的微前端框架有哪些

*   ice-stark ( 阿里飞冰 )[https://v3.ice.work/](https://v3.ice.work/)
    
*   qiankun ( 蚂蚁 )[https://qiankun.umijs.org/zh/guide](https://qiankun.umijs.org/zh/guide)
    
*   wujie ( 腾讯 )[https://wujie-micro.github.io/doc/](https://wujie-micro.github.io/doc/)
    

三大主流的微前端框架，网址都列出来了，有兴趣可以扫一眼，但是他们三个实现原理都是不一样的，我先比较简短的介绍一下

*   飞冰，其实我之前用的是飞冰，之所以用飞冰，是因为内部都用飞冰，然后他们团队我也有熟人，有问题就直接问了，他们实现的主要思想是**single-spa**的思想（ps: 这篇文章是介绍Single-spa的 [https://zhuanlan.zhihu.com/p/378346507](https://zhuanlan.zhihu.com/p/378346507)），只是做了更好的工程化的封装，比如在调度资源，加载资源借用的是AppRouter自动完成的， 我们只需要暴露mount , unmount 的生命周期函数就好了，它是一个封装度比较高的库，所以效率也是嘎嘎的拉满
    
*   qiankun, 这个框架是真正的基于single-spa这个库开发出的微前端框架，而不是飞冰只是参考了single-spa的思想进行自研实现的，qiankun更注重的是生命周期管理，他的颗粒度更细一点，这样的好处是相对自由，可以在生命周期函数上干一些很有趣的事，比如: 用Service Worker加载多语言的资源，在local缓存资源等等
    
*   wujie，说实话，我对这个不太熟悉，但是他基本的思想是webConpoment + iframe 的方式去实现的( MDN上对 webcomponent 的介绍： [https://developer.mozilla.org/zh-CN/docs/Web/API/Web\_components](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components) )
    
    自己看看就行
    
    | 特性 | **Wujie** | **Qiankun** | **ICE-Stark** |
    | --- | --- | --- | --- |
    | 所属团队 | 腾讯 | 蚂蚁金服 | 阿里飞冰 |
    | 技术架构 | WebComponent+iframe | single-spa | 自研（基于 single-spa 封装） |
    | JS 沙箱隔离 | ✅ 强 | ✅ 中强 | ✅ 可选 |
    | 样式隔离 | ✅ Shadow DOM | ✅ scoped CSS | ❌ 需手动隔离 |
    | 子应用支持框架 | ✅ Vue3/React18/... | ✅ Vue/React/Angular | ✅ Vue/React/静态 |
    | 加载性能 | 🚀 极速加载 | 中 | 中 |
    | SSR 支持 | ✅ 支持 | ❌ | ❌ |
    | 接入复杂度 | 低 | 中 | 低（需配 ICE） |
    | KeepAlive/状态缓存 | ✅ 内置 | ❌ 手动缓存 | ❌ 不支持 |
    
    ##### 2.2 核心原理讲解
    
    接下来我会以**ice stark**的实现方式去讲解微前端的核心的几个部分的实现原理是什么（因为我只看过它的源码😅，但是需要实现的模块功能都是大差不差的）
    
    在讲之前，先请大家先来看架构图，市面上所有的微前端框架基本是都是按照这几个模块去实现的，只是每个人实现方式不一样而已（这个图是我备忘录里很久的包糨图了，所以有点糊😅）
    
    ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/r4mlQ5bNw1oENlxo/img/6d07902f-07b5-46fe-842e-afdc2df81a96.png)
    
    ###### 2.2.1: 子应用的加载和卸载
    
    我先简单说，我也不把API 拿出来一个一个说了，icestark 本质是在 history 路由模式下改写 history api 并监听 popstate 事件，hash 路由模式下监听 hashChange 事件，依路由变化控制子应用加载与卸载
    
    其实只需要记住这个就行了，下面我再拆开来看看，怎么加载的，怎么卸载的( 下面的内容，强度有点高 )
    
    ###### 2.2.2:子应用加载
    
    microApps 是存储所有子应用完整配置信息的全局变量；子应用有 NOT\_LOADED、LOADING\_ASSETS、LOAD\_ERROR、NOT\_MOUNTED、MOUNTED、UNMOUNTED 这 6 个状态，分别代表子应用不同阶段，你可以理解为这6个是生命周期，就这么简单 ( 为什么大写，因为他源码就这样的，靠 )
    
    他这一步比较核心的几个函数，我稍微的介绍一下( 当初我看的老费劲了 )
    
    createMicroApp：获取子应用配置信息，注册到 microApps ，合并更新配置，缓存挂载目标节点，添加路由 basename，依据子应用状态决定加载、挂载操作。
    
    registerAppBeforeLoad：判断 microApps 中有无目标子应用，有则更新配置，无则注册。
    
    registerMicroApp：向 microApps 插入子应用配置信息，并设其状态为 NOT\_LOADED 
    
    mergeThenUpdateAppConfig：为子应用创建沙箱，决定加载 js 的方式。
    
    loadApp：更改页签标题，设子应用状态为 LOADING\_ASSETS，获取静态资源后改为 NOT\_MOUNTED，最后挂载子应用。
    
    loadAppModule：根据配置获取子应用资源地址，按加载模式获取并插入 css 与 js。
    
    其实看下来，你可以发现 他其实通过 microApps 数组管理子应用配置的，然后再去解析子应用 HTML，处理相对路径，提取 JS/CSS 资源。
    
    怎么加载CSS ，JS 呢？
    
    *   CSS：创建标签插入主应用 head。
        
    *   JS：分 import、fetch、script 三种模式，分别通过 import 函数、fetch+eval、创建 script 标签加载。
        

最后呢，按子应用刚刚说的生命周期去（NOT\_LOADED→LOADING\_ASSETS→NOT\_MOUNTED→MOUNTED）执行对应流程，最终挂载到主应用

Let All 

###### 2.2.3:子应用卸载   

怎么触发卸载，前面说了，他是用的APP Router 去做加载的，那么卸载就是监听路由的变化喽，老规矩理解一下核心函数做了什么就行

reroute : 遍历所有子应用，根据 findActivePath 判断是否激活，将子应用分为 unmountApps（需卸载）和activeApps（需加载）两类,然后 对状态为 MOUNTED 或 LOADING\_ASSETS的子应用调用unmountMicroApp 卸载，同时处理激活应用的加载

unmountMicroApp: 首先获取子应用配置，判断状态（MOUNTED/LOADING\_ASSETS /NOT\_MOUNTED）。其次，调用emptyAssets 移除 document 中的静态资源（js/css）。再者，清理沙箱（若未缓存），执行子应用unmount 生命周期。

emptyAssets: 通过选择器not(\[icestark=static\])区分主应用与子应用资源，移除style/link/script标签

unloadMicroApp: 在unmountMicroApp基础上，删除子应用配置中的静态资源信息

removeMicroApp: 从全局microApps数组中移除子应用配置。

clearMicroApps: 遍历所有应用调用unloadMicroApp，并将microApps置为空数组

 我们再一起串一下整个流程 ：在 reroute函数中，当路由变化，子应用状态为MOUNTED 或 LOADING\_ASSETS时，会执行unmountMicroApp函数进行卸载。unmountMicroApp 函数接收子应用唯一标识，获取子应用配置，若子应用未设置缓存，调用emptyAssets 函数移除其静态资源，并执行卸载生命周期函数。emptyAssets 函数利用主、子应用静态资源标识差异，移除子应用的 js 与 cssunmountMicroApp 函数在卸载子应用后，删除其静态资源配置，并将状态设为NOT\_LOADED。removeMicroApp 函数则在卸载后，从microApps 中删除子应用配置，目前由开发者自行调用。clearMicroApps 函数会删除所有子应用并清空microApps数组。

总体而言，子应用卸载是将其静态资源从主应用document移除，并依调用时机决定是否从microApps移除配置信息

###### 2.2.4: 微应用间的数据通信

说到这里了，其实这里的通信，我个人认为还是希望大家能够吸收他的思想的，因为上面可能有些枯燥乏味，这里的数据通信是真正工作中可以参考的Store通信的思路，那我就继续了

数据共享 - Store 类：Store 类负责实现应用间数据共享。通过 new Store 创建实例，构造函数初始化用于存储 state 的 store 变量与储存 state 变化回调的 storeEmitter 变量。set 方法按不同 key 类型设置 state ，调用 \_setValue 真正设置并触发 \_emit 。\_emit 依据 key 执行回调，回调由 on 方法注册。off 用于移除回调，has 检测是否有回调，get 用于获取 state 。最后，Store 实例挂载到 window 对象实现应用间共享。

( 说到这里，我来给大家看看我这次业务自己实现的store的思路,为什么最后没用单例模式，是因为这里没抽成npm包的方式引入组件会造成所有的页面共用一个实例，如果是npm 包的方式，最好要加个单例，防止数据问题)

```javascript
import { get, set, cloneDeep, isEqual } from 'lodash-es';
class ObservableStore {
  constructor() {
    // //单例模式的应用
    // if (ObservableStore.instance) {
    //   return ObservableStore.instance;
    // }
    // ObservableStore.instance = this;
    this.state = {};
    this.observers = new Map(); // 使用Map存储观察者，key为状态属性
  }

  // 获取当前状态
  getState(key) {
    return key ? this.state[key] : this.state;
  }

  // 设置状态并通知观察者
  setState(newStateObj, replace = false) {
    const prevState = cloneDeep(this.state);

    if (replace) {
      this.state = newStateObj;
    } else {
      // 借助lodash 的能力实现路径的写法
      Object.entries(newStateObj).forEach(([path, value]) => {
        set(this.state, path, value);
      });
    }

    // 遍历所有订阅者，看路径对应值是否变化
    for (const [keyPath, observers] of this.observers.entries()) {
      const oldVal = get(prevState, keyPath);
      const newVal = get(this.state, keyPath);
      if (!isEqual(oldVal, newVal)) {
        this.notifyObservers(keyPath);
      }
    }
  }

  // 订阅状态变化
  subscribe(path, observer) {
    if (!this.observers.has(path)) {
      this.observers.set(path, new Set());
    }
    this.observers.get(path).add(observer);
    return () => this.unsubscribe(path, observer);
  }

  // 取消订阅
  unsubscribe(key, observer) {
    if (this.observers.has(key)) {
      this.observers.get(key).delete(observer);
      if (this.observers.get(key).size === 0) {
        this.observers.delete(key);
      }
    }
  }

  // 通知特定状态的观察者
  notifyObservers(path) {
    if (this.observers.has(path)) {
      const val = get(this.state, path); // 获取嵌套值
      this.observers.get(path).forEach((observer) => {
        observer(val);
      });
    }
  }
}

export default ObservableStore;

```

缓存：定义 namespace 为 ICESTARK ，setCache 函数将数据以 key - value 形式挂载到 window.ICESTARK ，getCache 则通过 key 获取对应缓存。

事件共享 ：用于实现简单发布订阅。构造函数创建 eventEmitter 存储事件。on 方法注册事件回调，off 移除回调，emit 依据事件名执行回调，has 检测事件是否被监听。与 Store 类似，Event 实例也挂载到 window 实现共享。

其实大家分析一下，可以看出来，飞冰（ice stark ）微应用间数据与事件共享本质是借助 window 对象,那我们可以用到哪里？？按我的经验来说，其实我们做表格的数据缓存，和枚举值的缓存，都可以通过window对象去做到，提高页面的秒开效率，可以参考JSBridge实现方式

###### 2.2.5: sandbox的创建

 最后的话，做完这么多事后，是不是需要考虑隔离的问题？JS的隔离（防止全局变量的问题），CSS的隔离对吧，那么现在目前大家都是用什么方式去做？

先给大家介绍一下什么是sandBox:  sandBox(沙箱)是程序独立运行的虚拟环境，外界无法修改其信息。在前端应用中，当出现 css 或 js 相互影响、污染的情况时，需启用沙箱解决，分为 css 沙箱和 js 沙箱。

上面是我百度的答案，我说个人能听懂的，就是浏览器怎么去隔离进程，你可以把每个进程看作是一个微应用，沙箱就是隔离他们的状态用的，那飞冰怎么做的？

沙箱创建时机：在监听路由变化控制子应用加载与卸载的相关函数中，依据 appConfig 的 sandbox 配置，调用 createSandbox 函数实例化 Sandbox 类创建沙箱，fetch 获取子应用 js 后，通过沙箱实例的 execScriptInSandbox 方法执行 js，实现子应用与主应用的隔离。

css 沙箱解决方案：因 icestark 设计同一时间仅一个子应用运行，子应用间不存在样式污染。如果主应用与子应用并存时，可通过使用 CSS Modules、CSS-IN-JS 等第三方库设置 class 前缀，以及主应用统一引入全局重置样式等方式解决（CSS主题）。

js 沙箱实现原理：飞冰的话是采用 Proxy 代理实现 js 沙箱。Sandbox 类定义私有变量，constructor 函数判断浏览器是否支持 Proxy 并初始化 this.sandbox。createProxySandbox 函数创建干净对象并设置属性劫持原始方法，通过 Proxy 代理实现属性访问与设置的逻辑处理。execScriptInSandbox 函数利用 with + new Function 执行沙箱内 js 代码。clear 函数则在子应用卸载时清空沙箱。

原理差不多说完了，认真去看，其实不难，微前端其实最难的是他的生态建设以及基座的维护（因为不可有义务逻辑，我搞这个也挺崩溃的🤔）

#### 3:微前端发布平台

我认为发布平台作为微前端研发流程中最重要的一环吧，因为主子应用都是需要单独发布再集成为一份配置（里面需要做到的东西还是很多的，版本概念，后端需要发布对比（diff），里面还需要考虑多语言的集成，如果客户需求，怎么单独把微应用投放到其他容器页面），下面我细说发布平台主要提供了什么必备的条件：微前端的服务发现、服务注册、子应用版本控制、多个子应用间同灰度、增量升级子应用、下发子应用信息列表，分析子应用依赖信息提取公共基础库降低不同应用的依赖重复加载。 用于解决微前端中子应用的独立部署、版本控制和子应用信息管理，通过 Serverless 平台提供的接口或在渲染服务中下发主应用的 HTML 内容中包含子应用列表信息，列表中包括了子应用的详细信息例如：应用 id、激活路径、依赖信息、入口资源等信息，并通过对于子应用的公共依赖进行分析，下发子应用的公共依赖，在运行时获取到子应用的信息后注册给框架，然后在主应用上控制子应用进行渲染和销毁。（做这个挺难的，你可以认为做一个发布平台，得牵扯到云构建，不过现在云构建可以给阿里云）

#### 4:微前端真的好吗？

写在最后，我简短的说一下我个人的观点，其实所有技术都不是非黑即白的，拿个大家熟悉的例子打个比方，比如渲染的快慢问题，如果只渲染一次，那么原生的Dom 一定要比Virtual Dom 快的,  如果是涉及到多次渲染，那么Virtual Dom 也一定要比原生的dom要快的（想具体了解，我以后可以慢慢写) ，举这个例子的原因是，我想告诉大家，每种技术都有适合他自己的场景，不需要过渡开发，当然更不可以只看重眼前的需求，还得考虑他的扩展性等等... 别为了“微前端”而微前端，而是从业务现状出发，判断是否真的需要 “分而治之”，是否具备团队/技术能力来支撑微前端的治理成本