# 组件设计

#### 个人体会:

回首前端的发展历程，从开始的切图仔逐渐演变为一个效率高且有完整架构的形态，我自己的理解虽然三大框架功不可没，但是现在其实对于前端人员素质是个比较重要的考验，不应该仅仅局限于一个U I的实现，而是可以自己独立完成从点到面的过程，从一个小的组件设计 --> 不同功能领域的设计--> 整体应用的设计（说句题外话，除了架构设计，前端还有很多，比如SSR，工程化等等，最好选个自己感兴趣的深入进去），怎么更好的解藕功能，但是有些地方完全解藕又会带来副作用，比如，过于细致的功能划分虽然有助于提高代码的可复用性和测试性，但同时也可能导致系统变得臃肿、难以维护。因此，在实际开发中寻找一个合理的平衡点至关重要：既要保证组件间的独立性，又要避免因过度抽象而引入不必要的复杂度。今天结合ERP的情况说一下组件怎么去写

#### 实现:

拿到新需求以后，我个人的第一件事，并不是写代码，而是找异同，如果之前有沉淀好的通用性组件能拿来复用是最好的， 如果没有的话，如图所示，这是我拆分的页面模块，这个比较重要，因为涉及到代码的书写，以及抽象出的组件是否通用的问题，我以什么视角去拆？那就是是否具有业务属性？这个模块是否通用？这个模块是否是服务于相同的功能点？下面我详细说下我的书写和整体的设计架构思路

#### ![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/KM7qeobRyRB3dlpj/img/bbd2615e-532c-49f3-a31f-774a76522e47.png)

##### 概述：

结合了React的**Context API和观察者模式**来管理状态，实现数据驱动的UI更新。该组件强调模块化设计：核心**表格**、**内容容器**和**状态管理**被解耦，但通过**Context和Hook紧密协作，避免过度抽象导致的复杂度**。

##### 目标：

在一开始，我们都知道封装的目的肯定是复用，那如何更好的把高灵活+可复用性，在一开始就得想清楚如何处理数据交互问题，每个组件的边界条件是什么？怎么融合在一个Content 里面，用什么样的方式去融合，扩展性方面，怎么实现？

##### 平衡解耦与复杂度：

如图所示，我这边组件分为主组件、子组件和状态层。状态管理独立于UI，但通过Hook无缝注入，避免全局状态污染。同时，不引入过多抽象层（如Redux），而是用轻量观察者模式，其实看我组件目录就能看出来我的组件结构

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/KM7qeobRyRB3dlpj/img/b20a827b-5b6b-447a-acc9-0c79bf53d357.png)

##### 整体架构的实现:

###### 每个模块的思考

为了考虑到复用性和可扩展性，我采用的组件柔和方式是**复合模式**，允许用户灵活组合子组件。入口文件index.js暴露TabTable、TabTable.Content和TabTable.Table，便于树状导入。

*   **TabTable**：作为一个简单的div包裹children，提供基础布局。
    
*   **Content**：使用Context Provider注入ObservableStore实例。每个实例独立（通过useMemo创建），支持多表格隔离状态。
    
    *   支持BeforeContent、AfterContent和children作为插槽，允许注入自定义模块。
        
    *   示例：BeforeContent可用于搜索表单，AfterContent用于总结信息。
        
*   **Table**：基于Ant Design的Table组件，添加自定义逻辑。
    
    *   支持分页、加载状态、多选、数据请求。
        
    *   通过forwardRef暴露方法（如refreshTable、getRowSelection），允许父组件控制。
        
*   **状态管理层**：
    
    *   ObservableStore：核心类，使用Lodash的get、set、cloneDeep、isEqual处理嵌套状态。观察者Map存储订阅者，按路径通知更新。
        
    *   useObservableStore（Hook，位于observableStore.js）：订阅指定key的状态，返回\[state, setState\]，类似useState但支持路径式更新。
        
    *   StoreContext：Context用于注入store实例，确保组件树访问。
        

这种架构解耦了UI（Table/Content）和逻辑（Store），但通过Hook桥接，避免了props drilling的副作用。还有一个点，在封装组件的时候，可以参考DDD（领域驱动模型）的思想去把Store层和组件进行融合，组件单独去封装一层，然后再和Store层再封装一层，这样组件内部足够干净，不需要融合业务逻辑，可维护性提高不少，再者，组件也可单独拿出来使用，不回受制于Store，与Store 的耦合性较低

###### 实现细节

*   状态管理与观察者模式     ERP中，表格往往涉及搜索参数、分页等共享状态。传统useState会导致组件间同步复杂，因此采用观察者模式：
    
    *   ObservableStore维护state对象和observers Map。
        
        *   setState(newStateObj, replace)：支持路径更新（如{ 'searchObj.pageNum': 1 }），克隆prevState比较变化，仅通知受影响的观察者。
            
        *   subscribe(path, observer)：返回unsubscribe函数，支持组件卸载清理。
            
    *   在useObservableStore(key)中：
        
        *   useState初始化当前值。
            
        *   useEffect订阅key的变化，更新local state。
            
*   优势：高效（只更新相关部分），轻量（无外部库依赖，除了Lodash）。在多表格页面，避免全局store臃肿。
    
*   完整Store代码如下：
    
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
    ```javascript
    import { useState, useEffect } from 'react';
    
    import { useStoreInstance } from './storeContext';
    
    const useObservableStore = (key) => {
      const store = useStoreInstance();
      const [state, setState] = useState(store.getState(key));
    
      useEffect(() => {
        // 订阅状态变化
        const unsubscribe = store.subscribe(key, (newValue) => {
          setState(newValue);
        });
    
        // 组件卸载时取消订阅
        return unsubscribe;
      }, [key]);
    
      // 返回状态和更新函数
      return [state, (value, replace = false) => store.setState({ [key]: value }, replace)];
    };
    
    export default useObservableStore;
    
    ```
    ```javascript
    import { createContext, useContext } from 'react';
    
    export const StoreContext = createContext(null);
    
    export const useStoreInstance = () => {
      const store = useContext(StoreContext);
      if (!store) {
        throw new Error('未检测到 StoreContext.Provider，请确保组件被包裹');
      }
      return store;
    };
    
    ```
    
*   表格功能实现（ Table组件处理核心交互：）   
    
    *   数据加载：通过request prop（异步函数）获取数据。useEffect监听searchObj变化，调用setData加载。
        
    *   处理分页：tableChange更新searchObj.pageNum/pageSize。
        
    *   刷新：refreshTable方法重置pageNum并翻转refreshFlag触发重载。
        
    *   多选：rowSelection prop启用，onSelectChange更新selectedRowKeys/Items。暴露getRowSelection获取选中数据。
        
    *   自定义注入：
        
        *   columns支持函数形式：columns(useObservableStore)，允许动态列基于状态
            
        *   OperatingLeftModule/RightModule：操作栏插槽，支持注入按钮等。
            
    *   加载与分页：Ant Table的pagination集成，y-scroll固定高度，适合ERP长列表。
        
    *   边界处理：isEqual比较searchObj避免无限循环；默认值确保初始加载。
        

代码如下：

```javascript
import { useEffect, useImperativeHandle, useState, forwardRef } from 'react';

import { Table } from 'antd';

import './index.less';

export default forwardRef((props, ref) => {
  const {
    data = [],
    observeTableKey = 'searchObj',
    columns = [],
    OperatingLeftModule,
    OperatingRightModule,
    showRowSelection,
    request,
    //需要实现的功能
    api,
    useObservableStore,
    ...otherPorps
  } = props;

  // 多选list
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  // 多选list
  const [selectedRowItems, setSelectedRowItems] = useState([]);

  // 比较两个对象是否相等
  const isEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  const [searchObj = {}, setSearchObj] = useObservableStore(`${observeTableKey}`) || {};

  const [tableData, setTableData] = useState(data);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);

  const tableChange = (value) => {
    setSearchObj({
      ...searchObj,
      pageSize: value.pageSize,
      pageNum: value.current,
    });
  };
  const setData = async (params) => {
    setLoading(true);
    const data = (request && (await request(params))) || [];
    const { list = [], total = 0, pages = 10, pageNum = 1 } = data;
    setSearchObj({
      ...searchObj,
      pageSize: searchObj?.pageSize || 10,
      pageNum: pageNum || 1,
    });
    setTotal(total);
    setLoading(false);
    setTableData(list);
  };

  const refreshTable = () => {
    setData({
      ...searchObj,
      pageNum: 1,
      refreshFlag: !searchObj?.refreshFlag,
    });
  };

  //表格多选监听
  const onSelectChange = (key, item) => {
    setSelectedRowKeys(key);
    setSelectedRowItems(item);
  };

  const getRowSelection = () => {
    return {
      selectedRowKeys,
      selectedRowItems,
    };
  };

  // 将函数挂载到ref上
  useImperativeHandle(ref, () => ({
    refreshTable,
    getRowSelection,
  }));

  useEffect(() => {
    if (!isEqual(searchObj, {})) {
      setData(searchObj);
    } else {
      setData({
        pageSize: 10,
        pageNum: 1,
        total: 1,
      });
    }
  }, [JSON.stringify(searchObj)]);

  return (
    <div className="customerTable">
      <div className="customerTable-operatingModule">
        <div>
          {OperatingLeftModule && <OperatingLeftModule useObservableStore={useObservableStore} />}
        </div>
        <div>
          {OperatingRightModule && <OperatingRightModule useObservableStore={useObservableStore} />}
        </div>
      </div>
      <div className="customerTable-table">
        <Table
          columns={typeof columns === 'function' ? columns(useObservableStore) : columns}
          dataSource={tableData}
          onChange={tableChange}
          loading={loading}
          rowSelection={
            showRowSelection
              ? {
                  selectedRowKeys,
                  onChange: onSelectChange,
                }
              : ''
          }
          scroll=&#123;&#123;
            y: 450,
          }}
          showSizeChanger={false}
          pagination=&#123;&#123;
            current: searchObj?.pageNum || 1,
            pageSize: searchObj?.pageSize || 10,
            total: total ?? 100,
          }}
          {...otherPorps}
        />
      </div>
    </div>
  );
});

```

*   扩展与优化
    

*   **解耦平衡**：组件独立（Table可单独用），但Context绑定确保协作。避免过度：不拆分更多子组件（如Pagination独立），保持ERP开发简单。
    
*   **性能**：useMemo确保store单例；深比较（isEqual）减少无谓渲染。
    
*   **测试性**：Store可mock；UI部分用React Testing Library测试插槽。
    
*   **ERP特定**：支持api prop（未实现，但可扩展为内置request）；多实例隔离适合多Tab ERP界面。
    
*   **潜在改进**：添加debounce搜索；集成更多Ant事件；如果规模增大，可迁移到MobX/Recoil，但当前轻量合适。
    

*   这里面有几点，我还没有完善
    
    *   因为当时时间紧，没有用TS书写
        
    *   Table应该独立出来的与Store再封装一层，而不是耦合
        

#### 总结

这里的话，我进行总结一下：这次通过结合ERP系统，可以初步看到一个高效的组件化设计是如何被构建起来的。首先，在接到新需求时，不是急于编码，而是先进行模块拆分和复用评估。这种做法有助于确保代码的可维护性和扩展性。接着，利用React的Context API和观察者模式来管理状态，既保证了组件间的独立性，又避免了过度抽象带来的复杂度问题。

组件的书写的话，具体来说，采用复合模式允许用户灵活组合子组件，使得TabTable、Content和Table等核心部分能够独立工作的同时，又能通过上下文紧密协作。此外，引入基于Lodash的状态管理层，如ObservableStore，不仅简化了状态更新逻辑，还提高了性能表现。通过useObservableStore这样的自定义Hook，进一步降低了组件间通信的成本，使得数据驱动的UI更新变得更加直观易懂。

最后的话，其实在架构中我还使用了领域驱动设计（DDD）的思想，将业务逻辑与展示层分离，从而提升了组件的复用性和可测试性。尽管目前还有些细节需要完善，比如尚未使用TypeScript编写以及Table组件与Store之间的进一步解耦等，但整体上我认为初具端倪了

未来的工作方向目前我的考虑是以下几个方面：

*   **类型安全**：逐步迁移至TypeScript以增强代码的健壮性和可读性。
    
*   **持续解耦**：探索更多方式减少Table与状态管理之间的直接依赖，例如引入中间件或更高阶的抽象层。
    
*   **性能优化**：针对特定场景下的性能瓶颈进行针对性优化，如搜索请求的防抖处理。
    
*   **社区最佳实践**：随着项目规模的增长，适时考虑引入更成熟的解决方案，如MobX或Recoil，以适应更大范围的应用需求。
    

总之，通过对前端架构的不断探索和完善，既可以丰富自己的精力，也能增强自己的代码能力，说句题外话，写到这里，我想起我刚开始干前端的时候，是真的菜，而且认为画出的页面好看已经很牛逼了，越往后，越觉得，我还是菜的离谱，不过，我一直告诉我自己，慢点来，只要在一点一点进步就好了，往自己认为对的道路上走下去，总会有所收获的