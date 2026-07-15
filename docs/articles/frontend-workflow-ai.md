# 浅谈前端领域 WorkFlow与AI 的结合

#### 前言

想了很多的内容，比如: React Fiber原理，webpack编译原理等，为什么我会想起来说这个？主要原因是现在我认为已经是进入了类似于“AI元年”这种时候（虽然有点中二的感觉），这仅仅是我的判断，那么我们前端怎么去利用AI，结合AI呢？

第一种就是，基于LLM的一些内容生成模式，但是这里面其实能发现前端还是只是停留在画页面的程度，虽然后端也没做啥，整体流程就是前端把内容给后端，后端调用API ，API再把结果返回给后端，后端再给前端，其实你可以从这种模式来看，前后端其实工作量还是在CRUD（排除一些自己用python训练的小模型，但是实际上难度也仅仅是掉包+训练模型），本质上并不难

第二种就是，workFlow+AI 的模式，可以把他称为AI agent, 这种模式就比较难，因为和上一个比较明显的区别就是，第一种是直接给到结果，只需要理解用户的上下文，再根据上下文去生成结果就好了，难点是在提示词的训练，而第二种就是真正展示AI 的能力的点，也是展示训练的模型够不够牛逼的了，因为AI agent的本质并不是帮用户去做决策，而是给用户多种解决方案，决策端还是在用户自己的手里，那么要达成的话，有几点必不可少：

1:模型的质量问题，这个需要大量的并且合规的数据的喂养以及提示词的训练，在数据量足够大的时候，会有一些其他问题需要解决，比如: 相应速度的问题（因为token比较多的时候，模型在现有的数据中还需要推理和找到合适的解决方案）以及数据质量的问题等等

2:workFlow的建设，可编排的模式，这个才是前端的技术难点，下面我主要会说这个的实现方式

#### 实现思路

这篇文档，我就把第二种的实现思路给大家粗浅的说一下,大家可以先去看一下dify 和coze空间的workFlow展现形式是怎么样的

github Dify:[https://github.com/langgenius/dify](https://github.com/langgenius/dify)

整体架构：我偷的QQ机器人开放平台的架构图，其实现在大部分市面上的的agent都可以拿这种图去实现，可以自己理解一下，再往下看

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/meonarb9keRRrqXx/img/81b1ec94-8804-4556-84e5-00980b339ea7.png)

前端实现

     React flow + React + Json Schema描述 + Electron( electron为非必须，一般前端我是不建议用electron,会有内存泄露的问题，这里我说一嘴：目前是无解的，之前我特地分析过他的进程，原因是他有个垃圾回收的进程，随着程序的运行，这个进程是不可杀死的，他会回收electron的运行的所释放的空间，写electron代码这里要对代码的什么时候需要手动释放变量需要充分理解，还得分清楚哪些是运行在浏览器环境的代码，哪些是运行在node.js环境的代码，当然了如无需跨端，就直接用轻量点的PC页面 ) 

其中React flow需要点学习成本，因为是纯英文的，不过也不难，有兴趣可以去看一下（奇怪的知识+1）

大概的效果我就借用coze的了，之前做的东西在内网，访问不了，哈哈哈，大概效果，如图所示：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/meonarb9keRRrqXx/img/2cc68bed-7018-493b-8ddc-d4e931b64a3c.png)

之前搞的，大概的展现形式是这样的，

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/a/RlDrnyPkLt3n5bwj/2454f07831074d8e8e74c6866b5be45c1485.png)

里面最重要的是什么？

Json Schema 协议，这个协议为什么重要，因为它是贯穿渲染和执行的整个流程的，workFlow渲染是要依据这份描述文件去渲染内容的，而执行的时候，也得获取这一份协议再进行处理（至于怎么处理，后续会说），然后得到用户想要的结果

页面相关的画图和整体的设计思路，我就不说， 我着重说一下Json Schema和怎么处理，用什么样的数据结构去处理，有空可以先做个leetcode的easy题目，理解会深点[https://leetcode.cn/problems/binary-tree-preorder-traversal/description/](https://leetcode.cn/problems/binary-tree-preorder-traversal/description/) 

在设计Json Schema 协议的时候，得从这几点考虑出发

1: 足够抽象，意思就是所有的组件都拥有这一个共同的属性

2: 唯一性，单个描述内的字段肯定是具有唯一性和易于理解的，别在不同描述对象中相同的字段混用就行

3:私有属性需要内敛，说人话，就是内部有个类似于props的东西去存私有属性，不要造成属性污染

4:可扩展性，因为一开始肯定不可能思考的很全面的，所以得保留可扩展的空间

如下所示，下面就是formily 表单的 JsonSchema 描述协议,，可以参考一下它的设计思路

```javascript
{
  type: 'object',
  properties: {
    username: {
      type: 'string',
      title: '用户名',
      required: true,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    name: {
      type: 'void',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-decorator-props': {
        asterisk: true,
        feedbackLayout: 'none',
      },
      'x-component': 'FormGrid',
      properties: {
        firstName: {
          type: 'string',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            placeholder: '姓',
          },
        },
        lastName: {
          type: 'string',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            placeholder: '名',
          },
        },
      },
    },
    email: {
      type: 'string',
      title: '邮箱',
      required: true,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-validator': 'email',
    },
    gender: {
      type: 'string',
      title: '性别',
      enum: [
        {
          label: '男',
          value: 1,
        },
        {
          label: '女',
          value: 2,
        },
        {
          label: '第三性别',
          value: 3,
        },
      ],
      'x-decorator': 'FormItem',
      'x-component': 'Select',
    },
    birthday: {
      type: 'string',
      required: true,
      title: '生日',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
    },
    address: {
      type: 'string',
      required: true,
      title: '地址',
      'x-decorator': 'FormItem',
      'x-component': 'Cascader',
      'x-reactions': '&#123;&#123;fetchAddress}}',
    },
    idCard: {
      type: 'string',
      required: true,
      title: '身份证复印件',
      'x-decorator': 'FormItem',
      'x-component': 'IDUpload',
    },
    contacts: {
      type: 'array',
      required: true,
      title: '联系人信息',
      'x-decorator': 'FormItem',
      'x-component': 'ArrayItems',
      items: {
        type: 'object',
        'x-component': 'ArrayItems.Item',
        properties: {
          sort: {
            type: 'void',
            'x-decorator': 'FormItem',
            'x-component': 'ArrayItems.SortHandle',
          },
          popover: {
            type: 'void',
            title: '完善联系人信息',
            'x-decorator': 'Editable.Popover',
            'x-component': 'FormLayout',
            'x-component-props': {
              layout: 'vertical',
            },
            'x-reactions': [
              {
                fulfill: {
                  schema: {
                    title: '&#123;&#123;$self.query(".name").value() }}',
                  },
                },
              },
            ],
            properties: {
              name: {
                type: 'string',
                title: '姓名',
                required: true,
                'x-decorator': 'FormItem',
                'x-component': 'Input',
                'x-component-props': {
                  style: {
                    width: 300,
                  },
                },
              },
              email: {
                type: 'string',
                title: '邮箱',
                'x-decorator': 'FormItem',
                'x-component': 'Input',
                'x-validator': [{ required: true }, 'email'],
                'x-component-props': {
                  style: {
                    width: 300,
                  },
                },
              },
              phone: {
                type: 'string',
                title: '手机号',
                'x-decorator': 'FormItem',
                'x-component': 'Input',
                'x-validator': [{ required: true }, 'phone'],
                'x-component-props': {
                  style: {
                    width: 300,
                  },
                },
              },
            },
          },
          remove: {
            type: 'void',
            'x-decorator': 'FormItem',
            'x-component': 'ArrayItems.Remove',
          },
        },
      },
      properties: {
        addition: {
          type: 'void',
          title: '新增联系人',
          'x-component': 'ArrayItems.Addition',
        },
      },
    },
  },
}
```

这就是协议的理解，那么这个协议怎么运行？怎么可以跟大模型交互，给到用户使用，其实这涉及到应用的分层架构

第一层: 编排的协议，这个普通用户肯定不理解的，这个得内部开发或者懂运行逻辑的人去配置的

第二层:把编排的协议抽象成一个一个的节点组件，用户只需要配置对应的入参，出参就行

第三层:把一个有共性的并且完整的运行场景抽成一个一个解决方案，这是方便用户复用，降低用户使用心智的

接下来，我一步一步细说

协议的解析：首先得思考怎么流程是怎么样运行的才能知道用什么样的数据结构去承载，我们一起思考一下我们在agent的表现上看，肯定是step by step的，那么我们就用链表去做，因为一般情况下链表的时间和空间复杂度是O(n)的，同时链表也是step by step，我们只需要考虑环形链表怎么解以及多分支链表怎么解就行了（去LeetCode刷几题就懂怎么做了), 当时我其实就考虑了这种情况，后面我在实现的过程中发现还有一个情况需要处理，那就是如果多分支的情况，自己走过的其中一个分支不满足我们的情况或者说是错误的解决方案，那怎么办？我们是不是要实现回溯的算法？

回溯算法：[https://www.hello-algo.com/chapter\_backtracking/backtracking\_algorithm/](https://www.hello-algo.com/chapter_backtracking/backtracking_algorithm/)

好，说到这，我相信大家都会去了解一下这些都是什么东西，哈哈哈，那么我继续往下

把协议解析完生成一个链表了，那就是step by step的运行就好了，解决以上的那些技术上的问题，其他的就相对比较简单了，把大模型抽成一个组件，把需要做的事告诉他，大模型这里你可以基于MCP协议去实现工具链的调用（这个是MCP协议的详解：[https://zhuanlan.zhihu.com/p/27327515233](https://zhuanlan.zhihu.com/p/27327515233)），它做的事，你可以理解为，先人为给AI提供一个工具库，比如: Excel解析库，PDF解析库，等等，大模型可以通过MCP协议实现通信并且自主去调用对应的工具库去做事，就这么简单

运行的流程，我这里就偷了一张图：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/meonarb9keRRrqXx/img/d295a5f8-8737-41c9-8843-002edc4ea6e2.png)

说到这里，其实技术上的事已经解决一大部分了，后面就得从产品的角度去思考，怎么给用户用呢？不可能就直接给他配置协议吧或者workFlow吧？那就是抽成解决方案,如图所示：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/meonarb9keRRrqXx/img/651d4efd-42c9-4743-9224-3a44113ab0dd.png)

这个是coze的平台，这里面每一个应用其实后面对应的都是一个workFlow工作流，只是这些应用的作者已经帮你配置好了，其实如果真走到这步，技术能力还是可以得到提升的，那从产品角度的话也能初步具有形态了，从专业性角度来看，后面前端只需要多看下前沿的agent，结合行业前沿的思路去迭代实现就行，至于产品好与坏和技术其实没多大关系，在保证性能和交互的情况下，产品的好与坏其实跟产品经理对于产品的定位的理解有很大关系，这里就不写那么多了，我自己也是半桶水

写在最后的彩蛋，这里让柳哥测试一下这个agent应用好不好用，柳哥能看到的话，去试一哎，测评一下

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/meonarb9keRRrqXx/img/22b6d602-ecd2-492e-aea7-9f3b52f17b66.png)