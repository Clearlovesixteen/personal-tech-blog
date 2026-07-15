# NestJS

# [魔法棒挥动] 1: NestJS 是什么 [魔法棒挥动]

## 1.1  NestJS与Express和Koa的区别

Express 和 Koa 提供轻量 HTTP 能力，但大型项目还需要统一解决代码组织、依赖管理、权限、验证、错误处理、测试与部署。NestJS 在底层 HTTP 框架之上提供模块化架构，并使用 TypeScript、装饰器、IoC 和 AOP 组织应用。

| **维度** | **Express / Koa** | **NestJS** |
| --- | --- | --- |
| 定位 | 轻量 Web 框架或工具箱 | 带架构约束的企业级服务端框架 |
| 项目结构 | 由团队自行约定 | Module、Controller、Provider 等统一模型 |
| 依赖管理 | 通常手动创建或引入第三方容器 | 内置 IoC 容器和依赖注入 |
| 横切逻辑 | 依赖中间件及自行封装 | Guard、Pipe、Interceptor、Filter 等完整机制 |
| 适用场景 | 小型服务、定制程度高的项目 | 中大型业务、多人协作、长期维护 |

简单来说，NestJS 的价值主要体现在“统一工程约定”。在 Express 或 Koa 项目中，路由、依赖注入、参数校验、异常格式和模块边界一般需要团队自行设计；NestJS 把这些能力抽象成统一组件，使不同开发者编写的代码具有相似结构。

NestJS 比较适合中大型 API、后台管理系统、微服务和需要长期维护的业务。对于只有少量路由、生命周期短的小工具，直接使用轻量框架可能更简单。**实际选技术时，最好比较业务复杂度、团队规模、测试要求和维护周期，而不是只比较性能。（这也是所有技术选型的通用逻辑）**

## 1.2 创建和运行项目

```ts
npm i -g @nestjs/cli  
nest new learning-nest  
cd learning-nest  
npm run start:dev
```

直接跑就行

## 1.3 启动流程与目录

```ts
// src/main.ts  
async function bootstrap() {  
  const app = await NestFactory.create(AppModule);  
  app.setGlobalPrefix('api');  
  await app.listen(3000);  
}  
bootstrap();
```

NestFactory 从根模块 AppModule 开始扫描模块图，注册 Provider 和 Controller，创建依赖实例，映射路由，最后监听端口。（ 原理和 webpact hot modules 类似 ）

| **文件/目录** | **职责** |
| --- | --- |
| src/main.ts | 应用入口：创建应用、配置全局能力、监听端口 |
| src/app.module.ts | 根模块：引入所有业务模块 |
| \*.controller.ts | 协议入口：定义路由、读取参数、返回响应 |
| \*.service.ts | 业务逻辑：组织规则、调用数据库或外部服务 |
| test/ | 端到端测试；单元测试通常与源码放在一起 |

启动时，Nest 会从 AppModule 递归扫描 imports，收集模块中的 Controller 与 Provider，并根据依赖关系创建实例。依赖无法解析时，错误信息通常会指出缺失 Provider 所在的构造函数参数位置。

# [魔法棒挥动] 2: Module、Controller、Provider 与依赖注入 [魔法棒挥动]

## 2.1 Controller：协议层入口

```ts
@Controller('users')  
export class UsersController {  
  constructor(private readonly usersService: UsersService) {}  
  
  @Get(':id')  
  findOne(@Param('id', ParseIntPipe) id: number) {  
    return this.usersService.findOne(id);  
  }  
  
  @Post()  
  create(@Body() dto: CreateUserDto) {  
    return this.usersService.create(dto);  
  }  
}
```

Controller **负责 HTTP 层工作**：路由、状态码、请求参数和响应。它不应承担复杂业务逻辑，也不应直接编写数据库查询。这样 Controller 才容易测试，业务逻辑也能被定时任务、消息消费者或 GraphQL Resolver 复用。

Controller 是 HTTP 协议与业务逻辑之间的中间转换层。它负责从 Param、Query、Body、Header 中读取数据，调用 Service，并决定状态码或响应头。Controller 越薄，业务逻辑越容易被其他入口复用。

常用装饰器包括 \`@Get()\`、\`@Post()\`、\`@Patch()\`、\`@Delete()\`、\`@Param()\`、\`@Query()\` 和 \`@Body()\`。Nest 会把方法返回值自动序列化为响应；只有处理流式下载等特殊情况时，才需要直接使用底层 Response。

不要在 Controller 中直接操作 ORM Repository、拼接 SQL 或实现复杂权限判断。这些逻辑会降低可测试性，并让接口这一层与业务规则耦合。

## 2.2 Provider：可注入的能力

```ts
@Injectable()  
export class UsersService {  
  constructor(private readonly repository: UsersRepository) {}  
  
  async findOne(id: number) {  
    const user = await this.repository.findOne(id);  
    if (!user) throw new NotFoundException('用户不存在');  
    return user;  
  }  
}
```

Provider 是由 Nest IoC 容器创建和管理的对象。Service、Repository、Factory、策略对象和客户端封装都可以是 Provider。\`@Injectable()\` 告诉 Nest 该类参与依赖注入。

Provider 的说白了就是 IoC 容器中的注册项。除了 Service，数据库仓库、缓存客户端、第三方 API 封装、策略类和工厂对象都可以注册为 Provider。

Provider 默认是**单例作用域**，同一应用中通常共享同一实例。Nest 也支持请求作用域和瞬态作用域，但它们会增加实例创建成本，只有依赖请求上下文或确实需要独立实例时才使用。

Provider 最好围绕**单一职责设计**。比如 UsersService 处理用户业务规则，MailerService 封装邮件发送；避免创建包含大量无关能力的 CommonService。

## 2.3 IoC 和依赖注入到底解决什么

如果业务类主动 \`new\` 出依赖，它就同时承担业务职责和对象创建职责。依赖实现发生变化时，业务类也必须修改；测试时也难以替换数据库、网络等外部依赖。IoC 将对象创建权交给容器，业务类只声明需要什么。

| **方式** | **写法** | **影响** |
| --- | --- | --- |
| 手动创建 | \`new UsersService(new MysqlRepository())\` | 依赖固定、耦合高、测试替换困难 |
| 构造函数注入 | \`constructor(private repo: UsersRepository)\` | 依赖显式、易替换、易测试 |
| 属性注入 | \`@Inject() repo\` | 依赖不够显式，通常不优先使用 |

IoC 的关键点是把“对象由谁创建和组合”的控制权交给容器。业务类只声明依赖，容器根据 Token 查找实现并完成实例化。这种设计使使用它的代码依赖抽象能力，而不是依赖具体创建过程。

依赖注入让测试可以把真实数据库、Redis 或外部 API 替换为 Mock。比如测试 UsersService 时，可以注入一个内存 Repository，只验证业务规则。

构造函数注入是首选方式，因为依赖清晰可见，并能保证对象创建后依赖已经准备好。属性注入会隐藏依赖，通常只在特殊框架场景使用。

## 2.4 Provider 的四种注册方式

```ts
providers: \[  
  UsersService,  
  { provide: 'APP\_NAME', useValue: 'Learning Nest' },  
  { provide: CacheService, useClass: RedisCacheService },  
  {  
    provide: 'DATABASE',  
    inject: \[ConfigService\],  
    useFactory: (config: ConfigService) => createClient(config.get('DB\_URL')),  
  },  
  { provide: 'ALIAS', useExisting: UsersService },  
\]
```

| **方式** | **适用情况** |
| --- | --- |
| useValue | 注入常量、配置、测试 Mock |
| useClass | 按环境替换接口实现 |
| useFactory | 根据其他依赖动态创建对象，支持异步初始化 |
| useExisting | 为同一个实例提供别名 |

\`useValue\` 直接提供现有值，适合常量和测试 Mock；\`useClass\` 让一个 Token 使用指定类实现，适合按环境切换实现；\`useFactory\` 根据其他依赖动态创建对象；\`useExisting\` 为已有 Provider 创建别名并复用同一实例。

自定义 Provider 的 \`provide\` 可以是类、字符串或 Symbol。公共库中可以先用导出的 Symbol，能够降低字符串拼写冲突风险。

异步工厂通常用于数据库和缓存连接。工厂发生错误时最好让应用启动失败并输出明确日志，避免服务已经监听端口但关键依赖不可用。

## 2.5 Module 与可见性

```ts
@Module({  
  imports: \[DatabaseModule\],  
  controllers: \[UsersController\],  
  providers: \[UsersService, UsersRepository\],  
  exports: \[UsersService\],  
})  
export class UsersModule {}
```

\`providers\` 只在当前模块内可见。其他模块要使用某个 Provider，当前模块必须通过 \`exports\` 导出，使用方再通过 \`imports\` 引入模块。这个边界能避免任意模块访问所有服务。

Module 是依赖可使用范围的边界。Provider 注册在某个模块后，只能被该模块使用；只有放入 exports，其他导入该模块的模块才能注入它。

模块导出的是能力，而不是内部实现细节。最好只导出其他模块真正需要的 Provider，避免导出所有 Provider 导致边界失效。

根模块负责组合业务模块。业务模块之间如果频繁互相导入，通常说明边界设计需要调整，可以提取共享模块或重新安排使用它的代码向。

## 2.6 动态模块与异步配置

动态模块允许模块在导入时接收配置。\`register()\` 适合直接配置；\`registerAsync()\` 可以注入 ConfigService，并异步创建数据库、Redis、日志等客户端。

```ts
@Module({})  
export class LoggerModule {  
  static register(options: LoggerOptions): DynamicModule {  
    return {  
      module: LoggerModule,  
      providers: \[{ provide: 'LOGGER\_OPTIONS', useValue: options }, LoggerService\],  
      exports: \[LoggerService\],  
    };  
  }  
}
```

动态模块适合“同一个模块需要根据配置产生不同行为”的场景，比如 LoggerModule、DatabaseModule。静态 \`register()\` 接收立即可用的配置，\`registerAsync()\` 可以注入 ConfigService 并等待异步初始化。

动态模块返回对象至少包含 \`module\`，还可以返回 imports、providers、exports 和 global。返回的 Provider 会与模块装饰器中声明的 Provider 合并。

设计动态模块时，最好提供清晰的配置接口、默认值和验证逻辑。配置错误应在启动阶段被发现，而不是等到第一次请求才暴露。

## 2.7 生命周期与资源释放

| **钩子** | **典型用途** |
| --- | --- |
| OnModuleInit | 模块依赖准备完成后初始化内部资源 |
| OnApplicationBootstrap | 全部模块完成初始化后启动后台工作 |
| OnModuleDestroy | 模块销毁前清理资源 |
| BeforeApplicationShutdown | 关闭前停止接收新任务 |
| OnApplicationShutdown | 关闭连接、刷新缓冲区 |

需要调用 \`app.enableShutdownHooks()\` 才能让进程信号触发关闭生命周期。数据库连接、消息消费者和定时任务都应设计明确的释放行为。

初始化钩子适合建立数据库连接、加载配置或启动消费者；关闭钩子适合停止接收任务、等待在途任务完成并关闭连接。资源有创建就最好也有对应的释放处理。

优雅关闭时，应用应先停止接受新流量，再处理进行中的请求，最后关闭数据库、Redis 和消息队列连接。直接终止进程可能造成请求中断或消息丢失。

生命周期钩子可以是异步方法。Nest 会等待 Promise 完成，所以初始化逻辑最好设置超时，避免应用永久卡在启动阶段。

## 2.8 循环依赖

\`forwardRef()\` 可以解决模块或 Provider 的循环引用，但**循环依赖通常意味着职责划分不清**。优先考虑提取公共服务、引入领域事件、调整调用方向，再把 \`forwardRef\` 作为临时方案。

循环依赖是 A 依赖 B、B 又依赖 A。\`forwardRef()\` 通过延迟解析暂时打破加载顺序问题，但不会消除设计上的双向耦合。

常见重构方法包括：提取双方共同依赖的第三个服务、把直接调用改为领域事件、让上层编排服务协调两个模块，或重新划分模块职责。

大量使用 \`forwardRef()\` 会使初始化顺序、测试和维护变得困难。更适合把它当作迁移或特殊场景工具，而不是常规设计方式。

# [魔法棒挥动] 3: HTTP、AOP 与完整请求生命周期 [魔法棒挥动]

## 3.1 五种常见数据传输方式

| **方式** | **示例** | **适合场景** |
| --- | --- | --- |
| Path 参数 | \`GET /users/42\` | 定位单个资源 |
| Query 参数 | \`GET /users?page=1&keyword=a\` | 筛选、排序、分页 |
| JSON | \`Content-Type: application/json\` | 结构化创建和更新请求 |
| Form URL Encoded | \`application/x-www-form-urlencoded\` | 传统表单、OAuth 等协议 |
| Multipart | \`multipart/form-data\` | 文件与普通字段一起上传 |

Path 参数用于确定资源身份，比如 \`/users/42\`；Query 参数用于筛选、排序和分页；JSON 用于传递结构化请求体；Form URL Encoded 常见于传统表单和部分认证协议；Multipart 用于上传文件及相关字段。

GET 请求通常不应依赖 Body，因为代理、缓存和不同客户端可能处理不一致。查询条件应放在 Query 中；创建或修改资源时使用 POST、PUT、PATCH，并把数据放在 Body。

无论数据来自哪里，都必须进行类型转换、范围检查和业务验证。TypeScript 类型只存在于开发阶段，不能证明网络输入安全。

## 3.2 AOP：把通用逻辑放在业务之外

日志、认证、权限、参数验证、缓存和异常响应会出现在很多接口中。如果每个 Controller 都重复编写，业务代码会被通用逻辑淹没。AOP 通过执行链集中处理横切关注点。

```ts
Request  
  → Middleware  
  → Guard  
  → Interceptor（前）  
  → Pipe  
  → Controller → Service  
  → Interceptor（后）  
  → Response  
  
未捕获异常 → Exception Filter
```

AOP 处理的是会横跨多个业务模块的逻辑，比如认证、日志、参数校验、缓存和错误处理。将这些逻辑放入统一执行链，可以减少重复代码，并保证规则一致。

AOP 组件最好保持通用，不应包含具体业务流程。比如权限 Guard 可以判断角色，但“订单是否允许退款”仍属于订单业务规则，应由 Service 判断。

使用 AOP 时要关注执行顺序和作用范围。全局组件影响所有接口，控制器级组件影响整个 Controller，方法级组件只影响单个 Handler。

## 3.3 如何选择正确组件

| **问题** | **优先组件** | **原因** |
| --- | --- | --- |
| 给每个请求添加 requestId | Middleware | 属于路由执行前的通用预处理 |
| 判断用户是否登录或拥有权限 | Guard | 能获取当前 Handler 和 Metadata |
| 校验并转换 DTO | Pipe | 专门处理进入方法的参数 |
| 统一响应结构、记录耗时 | Interceptor | 能够包裹 Controller 执行前后 |
| 统一错误格式 | Exception Filter | 集中捕获和转换异常 |

选择组件时的思考方式：逻辑是发生在请求进入前、参数进入方法前、方法执行前后，还是异常发生后。根据发生位置和所需上下文选择 Middleware、Guard、Pipe、Interceptor 或 Filter。

同一需求可能涉及多个组件。比如认证通常由 Middleware 或 Passport 策略解析令牌，再由 Guard 决定是否允许访问，最后由业务 Service 检查资源归属。

不要把所有通用逻辑都塞进 Middleware。Middleware 无法方便获取 Handler Metadata，而 Guard 和 Interceptor 更适合与装饰器结合。

## 3.4 Middleware

```ts
@Injectable()  
export class RequestIdMiddleware implements NestMiddleware {  
  use(req: Request, res: Response, next: NextFunction) {  
    req\['requestId'\] = randomUUID();  
    next();  
  }  
}
```

Middleware 可以修改请求对象，也能接入 Express 生态中间件。它不知道最终 Handler 的 Metadata，因此不适合细粒度权限判断。

Middleware 在路由处理之前运行，可以读取和修改 Request、Response，并决定是否调用 \`next()\`。适合 requestId、访问日志、Cookie 解析和接入 Express 中间件。

通过实现 \`NestModule.configure()\` 和 MiddlewareConsumer，可以按路由、Controller 或方法进行应用和排除。全局中间件也可以在 main.ts 中注册。

Middleware 中尽量不要执行耗时业务和复杂数据库查询，否则每个请求都会承担额外延迟。权限等需要 Handler 信息的逻辑应交给 Guard。

## 3.5 Guard 与 Metadata

```ts
export const Roles = (...roles: string\[\]) => SetMetadata('roles', roles);  
  
@Injectable()  
export class RolesGuard implements CanActivate {  
  constructor(private readonly reflector: Reflector) {}  
  
  canActivate(context: ExecutionContext) {  
    const roles = this.reflector.getAllAndOverride<string\[\]>('roles', \[  
      context.getHandler(),  
      context.getClass(),  
    \]);  
    const request = context.switchToHttp().getRequest();  
    return !roles || roles.some(role => request.user?.roles.includes(role));  
  }  
}
```

自定义装饰器将角色要求写入 Metadata；Guard 使用 Reflector 读取当前方法或类上的 Metadata。这样接口只需声明规则，不需要编写重复判断。

Guard 的 \`canActivate()\` 返回布尔值、Promise 或 Observable。返回 false 时 Nest 通常抛出 ForbiddenException；如果需要更具体的错误，可以主动抛出对应异常。

Metadata 让权限规则以声明方式靠近接口。比如 \`@Public()\` 表示无需认证，\`@Roles('admin')\` 表示角色要求。Reflector 可以按方法和类的优先级读取配置。

认证与授权应分离：认证确认“你是谁”，授权判断“你能做什么”。即使通过角色校验，Service 中仍可能需要检查资源是否属于当前用户。

## 3.6 Pipe 与参数验证

```ts
app.useGlobalPipes(new ValidationPipe({  
  whitelist: true,  
  forbidNonWhitelisted: true,  
  transform: true,  
}));
```

\`whitelist\` 删除 DTO 未声明字段；\`forbidNonWhitelisted\` 对额外字段报错；\`transform\` 根据类型元数据转换输入。全局开启前要评估旧接口兼容性。

Pipe 在参数传给 Controller 方法之前执行。转换 Pipe 负责把字符串变成数字、布尔值或 UUID；验证 Pipe 负责拒绝不符合规则的数据。

ValidationPipe 依赖 class-transformer 和 class-validator。DTO 字段要声明验证装饰器；嵌套对象需要 \`@ValidateNested()\` 和 \`@Type()\` 才能正确转换与验证。

验证不仅包括格式，还包括业务规则。比如邮箱格式由 DTO 验证，邮箱是否已经注册则应由 Service 查询数据库后判断。

## 3.7 Interceptor 与 RxJS

```ts
@Injectable()  
export class ResponseInterceptor implements NestInterceptor {  
  intercept(context: ExecutionContext, next: CallHandler) {  
    const start = Date.now();  
    return next.handle().pipe(  
      map(data => ({ code: 0, data, elapsed: Date.now() - start })),  
    );  
  }  
}
```

Interceptor 的返回值是 Observable。\`map\` 转换结果，\`tap\` 观察副作用，\`catchError\` 处理错误。不要为了统一响应而破坏文件流、SSE 等特殊响应。

Interceptor 可以在 \`next.handle()\` 前执行前置逻辑，并通过 RxJS 操作符处理返回结果。适合记录耗时、统一响应、缓存和超时控制。

\`map\` 用于转换成功结果，\`tap\` 用于记录不改变结果的副作用，\`catchError\` 用于观察或转换异常，\`timeout\` 可以限制处理时间。必须理解 Observable 在订阅时才执行。

文件下载、SSE 和流式响应不一定适合统一响应包装。设计全局 Interceptor 时，应允许特殊接口跳过或识别流类型。

## 3.8 Exception Filter

优先抛出 Nest 内置 HTTP 异常，例如 BadRequestException、UnauthorizedException、ForbiddenException 和 NotFoundException。Filter 负责统一记录与转换，业务代码不要到处重复 \`try/catch\`。

Exception Filter 负责把未处理异常转换为统一 HTTP 响应，并记录必要上下文。Nest 内置 HttpException 已包含状态码和响应内容，Filter 需要正确保留这些信息。

未知异常通常返回 500，并在服务端记录堆栈；客户端不应看到数据库错误、内部路径和堆栈。生产与开发环境的错误详情应区别处理。

Filter 不能代替业务错误设计。对于可预期业务失败，最好使用明确异常或业务结果，并保证错误码、HTTP 状态码和文档一致。

# [魔法棒挥动] 4: DTO、验证、序列化与接口文档 [魔法棒挥动]

## 4.1 DTO 为什么使用 class

TypeScript interface 编译后会消失，而 class 在运行时仍存在。Nest 和 class-validator 需要运行时元数据进行转换、验证和文档生成，因此 DTO 通常使用 class。

```ts
export class CreateUserDto {  
  @IsString()  
  @MinLength(2)  
  name: string;  
  
  @IsEmail()  
  email: string;  
  
  @IsStrongPassword()  
  password: string;  
}
```

class 编译后仍有构造函数和运行时元数据，Nest 才能通过反射知道参数类型，并让 class-transformer 创建实例。interface 只用于编译期检查，运行时无法验证。

DTO 是接口契约，不应包含数据库操作和业务逻辑。字段名、可选性、默认值和验证规则应反映客户端可提交的数据。

DTO 变化可能影响客户端兼容性。删除字段、改变含义或加强校验前，需要评估版本和迁移策略。

## 4.2 创建、更新与查询 DTO

创建 DTO 通常要求关键字段必填；更新 DTO 可以通过 \`PartialType(CreateUserDto)\` 将字段变为可选；查询 DTO 负责分页、排序和筛选。不要直接把 Entity 当成 DTO。

| **对象** | **职责** | **注意事项** |
| --- | --- | --- |
| DTO | 描述接口输入及验证规则 | 面向外部协议，可随接口版本变化 |
| Entity / Model | 描述持久化结构 | 面向数据库，不应直接暴露敏感字段 |
| 响应对象 | 控制接口输出 | 可通过序列化或专门 View Model 构造 |

创建 DTO、更新 DTO 和查询 DTO 的业务含义不同。创建时字段可能必填；更新时字段通常可选；查询时需要处理字符串到数字、布尔值和枚举的转换。

\`PartialType\`、\`PickType\`、\`OmitType\` 和 \`IntersectionType\` 可以复用字段定义，但过度组合会让 DTO 难以理解。关键接口应先保证清晰。

分页 DTO 应限制 page、pageSize 的最小值和最大值，避免客户端一次查询过多数据。排序字段最好使用白名单，不能直接信任并拼接用户输入。

## 4.3 序列化与敏感字段

密码哈希、刷新令牌、内部状态等字段绝不能返回给客户端。可以使用 \`ClassSerializerInterceptor\` 与 \`@Exclude()\`，也可以通过专门的响应映射函数构造公开模型。

序列化决定内部对象如何变成对外响应。最好明确排除密码哈希、刷新令牌、删除标记、内部备注等字段，避免 Entity 新增字段后意外暴露。

ClassSerializerInterceptor 适合基于装饰器控制输出；复杂接口可以使用专门的响应模型或映射函数，明确构造客户端所需结构。

序列化还可用于日期格式、枚举显示和嵌套关系处理，但不要在序列化阶段执行数据库查询或复杂业务逻辑。

## 4.4 Swagger

```ts
const config = new DocumentBuilder()  
  .setTitle('Learning Nest API')  
  .setVersion('1.0')  
  .addBearerAuth()  
  .build();  
const document = SwaggerModule.createDocument(app, config);  
SwaggerModule.setup('docs', app, document);
```

Swagger 是接口契约和协作工具，不应被当作替代测试的工具。DTO、状态码、认证方式和错误响应都需要准确描述。

Swagger/OpenAPI 描述路由、参数、请求体、响应、认证和错误格式。它既服务于前后端协作，也可用于生成客户端 SDK 和契约测试。

仅生成成功响应是不够的，还应描述 400、401、403、404 等常见错误。需要认证的接口应配置 BearerAuth，并在 DTO 中提供字段说明和示例。

Swagger 文档应随代码更新，但它不能证明接口行为正确。仍需要单元测试、集成测试和 E2E 测试。

## 4.5 API 版本管理

| **方式** | **示例** | **特点** |
| --- | --- | --- |
| URI | \`/v1/users\` | 直观、易调试，URL 会包含版本 |
| Header | \`X-API-Version: 1\` | URL 简洁，但客户端和调试工具需设置 Header |
| Media Type | \`Accept: application/vnd.app.v1+json\` | 表达规范，但实现与沟通成本较高 |

版本管理只能控制兼容，并不能替代演进策略。应明确旧版本停止维护时间，并尽量避免为小变化创建新版本。

URI 版本直观且容易缓存；Header 或 Media Type 版本让 URL 更稳定，但客户端调试和网关配置更复杂。应结合现有基础设施和客户端能力选择。

新版本应只用于不兼容变化。新增可选字段、增加新接口等兼容变化通常无需升级版本。每个版本都需要维护成本和下线计划。

版本演进时，应监控旧版本调用量，提前通知客户端，并为迁移期保留兼容适配，而不是突然删除旧接口。

## 4.6 文件上传、对象存储与流式下载

Nest 使用 Multer 拦截器处理 Multipart 上传。小文件可以经应用服务器处理；大文件通常使用签名 URL 让前端直传 OSS 或 MinIO，减少应用服务器带宽和内存压力。下载大文件应使用 Stream，避免一次性加载到内存。

应用服务器处理上传时，最好使用 Multer 限制大小、数量和类型，并重新生成文件名。不能把用户文件名直接拼接成本地路径，否则可能导致路径穿越或覆盖文件。

大文件更适合由客户端使用临时签名 URL 直传 OSS 或 MinIO。应用只负责授权和记录文件元数据，可降低应用服务器带宽、内存和超时压力。

下载大文件时使用 Stream，并正确设置 Content-Type、Content-Length 和 Content-Disposition。需要权限控制的文件不能直接暴露永久公共 URL。

# [魔法棒挥动] 5: MySQL、SQL、TypeORM 与数据建模 [魔法棒挥动]

## 5.1 先建模，再写 CRUD

数据库表是业务规则的长期载体。设计前要识别实体、字段、唯一约束、关系、状态变化和查询模式。只根据页面表单建表，通常会遗漏约束与后续扩展需求。

| **关系** | **数据库表达** | **例子** |
| --- | --- | --- |
| 一对一 | 外键 + 唯一约束 | 用户与用户资料 |
| 一对多 | 多的一方保存外键 | 用户与订单 |
| 多对多 | 中间表保存双方外键 | 用户与角色 |

数据建模从业务语言开始：识别实体、属性、关系、唯一性、状态流转和生命周期。表结构应表达关键约束，不能只依赖应用代码保证正确性。

设计索引前要了解主要查询路径。高频筛选、排序和关联字段可能需要索引，但索引会增加写入成本和存储占用，不能越多越好。

状态字段要定义允许的值和变化路径。比如预订只能从待确认变为已确认或已取消，不能任意跳转。复杂状态变化应由业务 Service 统一控制。

## 5.2 TypeORM 基础

```ts
@Entity()  
export class User {  
  @PrimaryGeneratedColumn()  
  id: number;  
  
  @Column({ unique: true })  
  email: string;  
  
  @Column({ select: false })  
  passwordHash: string;  
}
```

```ts
@Module({  
  imports: \[  
    TypeOrmModule.forFeature(\[User\]),  
  \],  
  providers: \[UsersService\],  
})  
export class UsersModule {}
```

Repository 适合常规实体操作；QueryBuilder 适合复杂关联、聚合和动态条件。即使使用 ORM，也需要理解最终 SQL 和索引。

Entity 描述数据库映射，Repository 提供实体级 CRUD，QueryBuilder 用于动态查询和复杂 SQL。使用 ORM 不代表可以忽略数据库知识，仍应检查生成 SQL、索引和查询次数。

关系映射需要明确拥有方和外键位置。谨慎使用 eager 关系和级联保存，因为它们可能产生隐蔽查询或意外修改大量关联数据。

防止 N+1 查询：列表加载关联数据时，可以根据需求使用 JOIN、批量查询或专用查询，而不是循环中逐条访问数据库。

## 5.4 事务边界

事务应该围绕一个需要原子完成的业务动作，例如创建订单并扣减库存。事务过大容易持锁过久，事务过小又无法保证一致性。网络调用通常不应放入数据库事务中。

事务保证一组数据库操作要么全部成功，要么全部回滚。可以围绕完整业务动作划定边界，并让同一事务中的操作使用同一个 EntityManager 或 QueryRunner。

事务持有锁的时间越长，并发能力越低。所以不要在事务内等待邮件、HTTP API 或消息队列等不可靠外部操作。

跨服务业务不能使用单个数据库事务直接解决，需要考虑事件、补偿、Outbox 或 Saga 等最终一致性方案。

## 5.5 Migration

开发环境的自动同步不能代替生产 Migration。Migration 将表结构变化变成可审查、可重复、可回滚的版本。部署时应先备份、评估锁表影响，并为破坏性变更设计分阶段迁移。

Migration 是数据库结构的版本历史。每次结构变化都应生成或编写迁移脚本，在测试环境验证后再进入生产，并记录执行结果。

大表增加非空字段、修改类型或创建索引可能锁表。生产迁移需要评估耗时，必要时采用先新增兼容字段、分批回填、再切换代码的渐进方案。

回滚脚本也需要测试，但某些数据变更不可逆。执行高风险迁移前必须备份，并准备应用回滚与数据库处理方案。

## 5.6 配置管理

数据库地址、密钥和端口应通过 ConfigModule 集中管理，并在启动时验证。不同环境使用不同配置和权限；生产环境密钥不能提交到代码仓库。

配置可以按环境分离并集中读取，启动时验证必需字段、类型和范围。错误配置最好让应用快速失败，而不是以不完整状态运行。

密钥、数据库密码和 Token 签名密钥不能提交到代码仓库。线上环境可以通过密钥管理服务、容器 Secret 或受控环境变量注入。

配置值应尽量保持不可变。运行时动态配置需要明确刷新机制、权限和审计，否则会造成不同实例行为不一致。

# [魔法棒挥动] 第 6 章｜Redis、登录认证与权限控制 [魔法棒挥动]

## 6.1 Redis 不只是缓存

| **数据结构/能力** | **典型用途** |
| --- | --- |
| String | 验证码、缓存、计数器、分布式锁值 |
| Hash | 对象字段、用户会话 |
| List / Stream | 简单队列、事件流 |
| Set | 去重集合、关注关系 |
| Sorted Set | 排行榜、按分值排序 |
| Geo | 附近门店或设备 |
| TTL | 验证码、临时令牌、缓存自动过期 |

缓存设计必须考虑 **Key 命名、TTL、更新策略和穿透/击穿/雪崩问题**。Redis 数据不能默认当作永久事实来源，关键数据仍应持久化。

Redis 提供 String、Hash、List、Set、Sorted Set、Stream 和 Geo 等结构。可以根据业务操作选择结构，而不是把所有内容都序列化成字符串。

缓存需要设计 Key 规范、TTL、更新和失效策略。缓存穿透可用空值缓存或布隆过滤器缓解；热点 Key 击穿可用互斥或逻辑过期；雪崩可通过随机 TTL 和限流缓解。

Redis 一般是加速层或临时状态存储。关键业务数据仍应有可靠持久化来源，并考虑 Redis 故障时的降级行为。

## 6.2 Session 与 JWT

| **维度** | **Session** | **JWT** |
| --- | --- | --- |
| 状态位置 | 服务端保存，客户端持有 Session ID | 令牌携带声明，服务端验证签名 |
| 主动失效 | 容易 | 需要黑名单、版本号或短有效期 |
| 分布式部署 | 需要 Redis 等共享会话存储 | 验证较容易横向扩展 |
| 适合场景 | 传统 Web、强会话控制 | API、移动端、跨服务身份传递 |

Session 在服务端保存状态，易于主动注销和修改权限；分布式部署时需要 Redis 等共享存储。JWT 便于无状态验证，但签发后在过期前难以直接撤销。

JWT 只进行 Base64URL 编码和签名，负载内容并不保密，所以不能放密码、身份证号等敏感信息。服务端必须验证签名、过期时间、签发者和受众。

选择方案时考虑客户端类型、主动失效要求、跨服务身份传递和安全风险。很多系统使用短期 JWT 加服务端刷新令牌记录。

## 6.3 安全的登录流程

*   注册时验证唯一性，并使用 bcrypt 或 Argon2 哈希密码。
    
*   登录时返回短生命周期 access token 和更长生命周期 refresh token。
    
*   refresh token 应支持撤销、轮换，并尽量只保存哈希。
    
*   认证 Guard 只负责确认身份；权限 Guard 再判断是否允许操作。
    
*   敏感操作要求重新认证，并记录审计日志
    
    密码最好使用 bcrypt 或 Argon2 等专用慢哈希算法，并为登录失败设置限流、延迟或验证码，防止暴力破解。错误响应尽量不要泄露账号是否存在。
    
    Access Token 生命周期应较短；Refresh Token 用于换取新令牌，并最好支持轮换和撤销。数据库中尽量保存 Refresh Token 哈希，而不是明文。
    
    令牌的存储位置影响风险。浏览器中使用 HttpOnly、Secure、SameSite Cookie 可降低 XSS 窃取风险，但需要同时考虑 CSRF 防护。
    
    ## 6.4 RBAC 与 ACL
    
    ACL 直接描述主体对资源的权限，粒度细但管理复杂。RBAC 把权限分配给角色，再把角色分配给用户，更适合后台系统。很多系统使用 RBAC 管理通用权限，再用资源归属规则补充细粒度判断。
    
    :::
    @Roles('admin')  
    @UseGuards(JwtAuthGuard, RolesGuard)  
    @Delete(':id')  
    remove(@Param('id') id: string) {  
      return this.usersService.remove(id);  
    }
    :::
    
    RBAC 通过用户—角色—权限关系管理通用权限，维护成本相对低。ACL 可以表达用户对某个具体资源的权限，粒度更细但数据量和判断逻辑更复杂。
    
    真实项目里经常会组合使用：先通过 RBAC 判断是否有某类操作权限，再通过资源归属、组织范围或 ACL 判断能否操作当前对象。
    
    权限判断必须在服务端完成。前端隐藏按钮只能改善体验，不能作为安全控制。重要权限变更最好记录审计日志。
    
    ## 6.5 Passport 与三方登录
    
    Passport 将认证策略标准化，可以实现本地账号、JWT、GitHub、Google 等认证。三方登录的关键不是拿到第三方用户信息，而是安全地将第三方身份绑定到本系统账户，并正确处理账号冲突和解绑。
    
    Passport Strategy 负责从请求提取凭证、验证身份并返回用户信息。Guard 将 Strategy 接入 Nest 请求链。不同认证方式可以使用不同 Strategy。
    
    三方登录需要使用 OAuth 授权码流程，并验证回调 state，防止 CSRF。系统应保存第三方平台和外部用户 ID 的绑定关系，而不是只依赖邮箱。
    
    绑定、解绑和账号合并是三方登录最容易被忽略的部分。执行这些操作前应要求当前账号重新认证，并处理邮箱冲突。
    
    # [魔法棒挥动] 7: 常见后端能力与工程化 [魔法棒挥动]
    
    ## 7.1 日志与可观测性
    
    日志应服务于问题定位，而不是越多越好。使用结构化日志，包含时间、级别、服务名、环境、requestId、用户或业务标识、耗时和错误信息。生产环境应集中收集，并设置保留策略。
    
    | **日志类型** | **关注内容** |
    | --- | --- |
    | 访问日志 | 方法、路径、状态码、耗时、requestId |
    | 业务日志 | 关键状态变化与业务标识 |
    | 错误日志 | 错误类型、上下文、堆栈；隐藏敏感数据 |
    | 审计日志 | 谁在何时修改了哪些重要数据 |
    
    结构化日志最好使用 JSON 或统一字段，至少包含时间、级别、服务、环境、requestId、路径、状态码和耗时。requestId 可以把网关、应用和下游调用串联起来。
    
    日志、指标和链路追踪解决不同问题：日志记录事件细节，指标展示趋势并触发告警，链路追踪分析跨服务调用。完整可观测性一般需要三者结合。
    
    日志不得记录密码、令牌、Cookie、完整身份证号等敏感数据。错误日志要包含足够上下文，但必须脱敏并设置访问权限和保留期限。
    
    ## 7.2 定时任务与事件
    
    定时任务适合周期性统计、清理和同步，但需要考虑重复执行、分布式部署和失败补偿。事件机制可以降低模块间直接依赖，但事件处理要设计幂等、重试和监控。
    
    定时任务在多实例部署时可能被每个实例重复执行。可使用分布式锁、专用 Worker 或外部调度平台保证执行策略，并为任务记录开始、结束和失败状态。
    
    事件可以降低模块耦合，但异步事件可能失败或重复。消费者应幂等，重要事件需要持久化、重试和死信处理。
    
    任务和事件处理都最好设置超时、监控执行耗时，并提供人工补偿或重放能力。
    
    ## 7.3 邮件、外部 API 与重试
    
    发送邮件和调用第三方 API 都属于不可靠网络操作。应设置超时、有限重试、熔断或降级，并把耗时任务异步化。不要在数据库事务中等待外部 API。
    
    外部依赖随时可能超时或失败。调用时必须设置连接和响应超时，并仅对适合重试的错误执行有限、带退避的重试。
    
    发送邮件等耗时操作适合放入队列，接口先完成核心业务并返回。消费者异步发送，失败后重试或进入死信队列。
    
    重试写操作前必须考虑幂等性，否则可能重复扣款、重复创建订单。可以使用幂等键或由下游提供唯一请求标识。
    
    ## 7.4 SSE、短链、二维码与爬虫
    
    | **能力** | **关键点** |
    | --- | --- |
    | SSE | 服务端向浏览器单向推送，适合通知和进度 |
    | 短链 | 短码生成、唯一性、跳转统计、防滥用 |
    | 二维码登录 | 短生命周期状态、扫码确认、防重放 |
    | Puppeteer 爬虫 | 页面渲染、并发限制、重试、合规性 |
    | Excel/PPT 生成 | 模板、数据量、内存、下载体验 |
    | 系统监控 | CPU、内存、磁盘、事件循环和依赖健康 |
    
    SSE 基于 HTTP 长连接，由服务端单向推送文本事件，适合通知和任务进度；WebSocket 支持双向通信，适合聊天和协作。可以根据通信方向和复杂度选择。
    
    短链系统需要生成唯一短码、快速跳转、统计访问并防止恶意链接；二维码登录需要短生命周期状态、扫码确认和防重放机制。
    
    爬虫要控制并发、重试和资源释放，并遵守网站条款、robots 和法律要求。Puppeteer 成本较高，能使用普通 HTTP 请求获取数据时不应可以先用浏览器渲染。
    
    # [魔法棒挥动] 8: Docker、PM2、Nginx 与部署 [魔法棒挥动]
    
    ## 8.1 Dockerfile
    
    :::
    FROM node:22-alpine AS build  
    WORKDIR /app  
    COPY package\*.json ./  
    RUN npm ci  
    COPY . .  
    RUN npm run build  
      
    FROM node:22-alpine AS runtime  
    WORKDIR /app  
    ENV NODE\_ENV=production  
    COPY package\*.json ./  
    RUN npm ci --omit=dev  
    COPY --from=build /app/dist ./dist  
    CMD \["node", "dist/main.js"\]
    :::
    
    多阶段构建把编译工具与生产运行环境分离。利用依赖层缓存、固定依赖版本、非 root 用户和健康检查，可以提高构建速度与运行安全性。
    
    Dockerfile 的层会被缓存。先复制 package 文件并安装依赖，再复制源码，可以在源码变化但依赖不变时复用缓存。多阶段构建能避免把 TypeScript 编译工具带入生产镜像。
    
    生产镜像最好使用固定或受控的基础镜像版本、非 root 用户，并只包含运行所需文件。使用 \`.dockerignore\` 排除 node\_modules、测试文件和本地配置。
    
    容器镜像最好保持不可变，同一个镜像通过环境配置运行于不同环境。不要在容器启动时临时修改源码或安装依赖。
    
    ## 8.2 Docker Compose 与网络
    
    Compose 适合本地或简单环境组合应用、MySQL、Redis 等服务。容器通过服务名通信，不应把容器内的 \`localhost\` 误认为宿主机或其他容器。数据服务需要持久化卷。
    
    Compose 用服务描述多个容器及网络、端口、环境变量和卷。容器之间通过服务名访问，比如应用连接 \`mysql:3306\`，而不是连接自身的 localhost。
    
    数据库和对象存储需要持久化卷。删除容器不应导致数据丢失；同时仍需独立备份，因为卷不是备份方案。
    
    Compose 的 depends\_on 只控制启动顺序，不能证明依赖已经可用。应用仍应实现连接重试和健康检查。
    
    ## 8.3 PM2 与 Nginx
    
    | **组件** | **主要职责** |
    | --- | --- |
    | PM2 | Node 进程守护、重启、日志、多进程 |
    | Docker | 运行环境隔离、镜像交付、资源限制 |
    | Nginx | 反向代理、TLS、静态资源、负载均衡、灰度流量 |
    
    PM2 管理 Node 进程，提供守护、重启、日志和 cluster；Nginx 位于应用前方，负责 TLS、反向代理、静态资源、限流和流量分配；Docker 负责封装运行环境。
    
    在容器中通常一个容器运行一个主要进程，由编排平台负责重启和扩缩容。是否同时使用 PM2 可以根据部署平台和多进程需求决定。
    
    Nginx 灰度发布可以按权重、Cookie、Header 或用户标识分流。灰度期间应监控错误率和性能，并能快速回切。
    
    ## 8.4 生产部署清单
    
*   配置健康检查、优雅关闭和启动就绪检查。
    
*   数据库变更使用 Migration，并准备备份与回滚方案。
    
*   密钥放在安全配置系统中，不写进镜像和仓库。
    
*   设置日志、指标、告警和错误追踪。
    
*   通过滚动、蓝绿或灰度方式降低发布风险。
    
*   限制容器资源与网络访问，及时更新依赖和基础镜像。
    

上线前不仅要确认应用能启动，还要验证配置、数据库 Migration、依赖服务、健康检查、日志、指标和告警。发布过程应可重复并尽量自动化。

优雅关闭能避免发布时中断请求。应用收到终止信号后应停止接收新流量，等待在途请求和任务完成，再关闭连接。

必须准备回滚方案。应用代码回滚、数据库回滚和配置回滚可能是不同操作，尤其要谨慎处理不可逆数据迁移。

# [魔法棒挥动] 9: 微服务、消息队列、WebSocket 与 GraphQL [魔法棒挥动]

## 9.1 单体优先，按业务边界拆分

微服务不是大型项目的默认答案。单体应用部署简单、事务容易、调试直接；当团队规模、独立发布、负载差异或业务边界明确时，再考虑拆分。拆分后必须承担网络失败、分布式追踪、数据一致性和运维成本。

| **能力** | **解决的问题** | **主要成本** |
| --- | --- | --- |
| 服务注册中心 | 动态发现服务实例 | 高可用和一致性维护 |
| 配置中心 | 集中管理服务配置 | 权限、变更审计与故障影响 |
| gRPC | 高效、跨语言 RPC | 协议管理、浏览器支持有限 |
| RabbitMQ | 异步解耦、削峰填谷 | 幂等、重试、积压与死信处理 |

单体架构的模块可以拥有清晰边界，同时保持一次部署和本地事务。先构建模块化单体，通常比过早拆微服务更容易验证业务边界。

适合拆分的信号包括团队需要独立发布、不同模块负载差异大、技术栈需求不同或业务边界稳定。仅因为代码量大并不足以说明需要微服务。

微服务会引入网络失败、数据一致性、服务发现、监控和部署成本。拆分前应确认团队具备相应运维和排障能力。

## 9.2 消息队列的可靠性

生产者确认、消息持久化、消费者确认、重试、死信队列和幂等消费共同决定可靠性。消息队列通常提供至少一次投递，因此消费者必须能够安全处理重复消息。

可靠消息需要生产者确认、持久化、消费者确认、重试和死信队列。即使配置完善，也一般只能保证至少一次投递，所以消费者必须幂等。

幂等方案包括使用业务唯一键、幂等记录表、状态机或去重缓存。消费者处理成功后再确认消息，处理失败时根据错误类型决定重试或死信。

需要监控队列长度、消费速率、失败率和最老消息年龄。消息持续积压往往说明消费者能力不足或下游故障。

## 9.3 TypeORM、Prisma、MongoDB 如何选

| **技术** | **优势** | **适用倾向** |
| --- | --- | --- |
| TypeORM | 装饰器实体、与 Nest 集成成熟 | 传统关系模型和 Nest 项目 |
| Prisma | Schema 驱动、类型安全客户端、开发体验好 | 重视类型安全与明确 Schema 的项目 |
| MongoDB/Mongoose | 文档模型灵活、嵌套自然 | 结构变化快或天然文档型数据 |

TypeORM 使用装饰器定义实体，与 Nest 风格一致；Prisma 使用 Schema 生成类型安全客户端；MongoDB 使用文档模型，适合天然嵌套或结构变化快的数据。

选型应考虑数据关系、事务、一致性、查询模式、团队经验和运维能力。不能仅根据 ORM API 是否好用决定数据库类型。

关系复杂、强一致性要求高的业务通常优先关系数据库；MongoDB 并不是无需建模，也需要设计 Schema、索引和数据生命周期。

## 9.4 GraphQL

GraphQL 使用 Schema 定义类型和操作，客户端可以声明所需字段。它能减少过度获取和接口数量，但会引入 N+1 查询、复杂度控制、缓存和鉴权挑战。不要仅因为前端查询灵活就默认采用 GraphQL。

GraphQL 通过 Schema 定义类型、Query、Mutation 和 Subscription。客户端可以选择字段，适合多个客户端对数据组合需求差异较大的场景。

Resolver 如果为每个父对象单独查询关联数据，会产生 N+1 问题。可以使用 DataLoader 批量加载，并限制查询深度、复杂度和分页大小。

GraphQL 的单一 Endpoint 不代表权限更简单。每个 Resolver 和字段仍需验证身份、权限和输入，并考虑缓存与错误格式。

# [魔法棒挥动] 结语 [魔法棒挥动]

**学习 NestJS 的终点不是记住所有装饰器，而是能够判断一段逻辑应该放在哪里、依赖如何管理、数据如何保证一致、接口如何保护、系统如何部署和恢复。选择一个真实项目持续迭代，让每个知识点都在业务上下文中得到验证。**