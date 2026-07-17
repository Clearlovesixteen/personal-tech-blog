# 技术札记

一个持续整理前端工程、AI Workflow、RAG、Agent、知识库与服务端实践的个人技术博客。站点基于 VitePress 构建，文章使用 Markdown 维护，并通过 GitHub Actions 自动发布到 GitHub Pages。

> **在线访问：[技术札记 · 个人技术博客](https://clearlovesixteen.github.io/personal-tech-blog/)**

[![VitePress](https://img.shields.io/badge/VitePress-1.6-5C73E7?logo=vitepress&logoColor=white)](https://vitepress.dev/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-在线访问-222222?logo=github)](https://clearlovesixteen.github.io/personal-tech-blog/)
[![Deploy](https://github.com/Clearlovesixteen/personal-tech-blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/Clearlovesixteen/personal-tech-blog/actions/workflows/deploy.yml)

## 关于本站

技术札记用于沉淀工作与学习过程中形成的技术文档，并把分散的 Markdown 笔记整理成便于阅读、搜索和持续维护的个人知识站点。

本站主要关注以下方向：

- AI 工程：Workflow、Agent、RAG、记忆检索与知识库系统
- 前端工程：微前端、组件设计、复杂表单与工程化实践
- 产品体验：WMS 等业务系统从 UI 规范走向 UX 效率优化
- 服务端技术：NestJS 的模块设计、依赖注入与工程组织

## 文档库

### AI 与知识工程

| 文档 | 内容简介 |
| --- | --- |
| [前端领域 Workflow 与 AI 结合的深度技术分享](https://clearlovesixteen.github.io/personal-tech-blog/articles/frontend-workflow-ai-deep) | 系统说明前端如何参与并主导 Workflow 与 AI 系统建设 |
| [浅谈前端领域 WorkFlow 与 AI 的结合](https://clearlovesixteen.github.io/personal-tech-blog/articles/frontend-workflow-ai) | 从可编排流程、协议解析和运行链路理解 AI Agent 产品形态 |
| [知识库系统](https://clearlovesixteen.github.io/personal-tech-blog/articles/knowledge-base-system) | 文档管理、AI 问答、知识图谱与权限检索的产品设计 |
| [Agentic RAG](https://clearlovesixteen.github.io/personal-tech-blog/articles/agentic-rag) | 为传统 RAG 引入模型判断、联网和工具调用能力 |
| [RAG](https://clearlovesixteen.github.io/personal-tech-blog/articles/rag) | 检索增强生成、向量与知识库检索的基础原理 |
| [Agent 记忆检索](https://clearlovesixteen.github.io/personal-tech-blog/articles/agent-memory-retrieval) | Agent 历史上下文召回与记忆检索策略 |
| [Memory 研究](https://clearlovesixteen.github.io/personal-tech-blog/articles/memory-research) | Agent Memory 的管理、截断、总结和检索实践 |
| [LangChain 学习总结](https://clearlovesixteen.github.io/personal-tech-blog/articles/langchain-summary) | 将大模型 API 调用组织为可组合、可观测的工程系统 |

### 前端工程与架构

| 文档 | 内容简介 |
| --- | --- |
| [微前端架构](https://clearlovesixteen.github.io/personal-tech-blog/articles/micro-frontend) | 应用拆分、独立部署与运行时集成的架构实践 |
| [组件设计](https://clearlovesixteen.github.io/personal-tech-blog/articles/component-design) | 结合 ERP 场景讨论组件边界、状态管理与复用策略 |
| [Formily 原理及场景应用](https://clearlovesixteen.github.io/personal-tech-blog/articles/formily) | 从复杂表单联动场景理解 Formily 的响应式表单模型 |
| [WMS UI → UX 文档](https://clearlovesixteen.github.io/personal-tech-blog/articles/wms-ui-ux) | 从 UI 统一走向效率、路径和错误率优化的 UX 建设 |

### 后端与服务端

| 文档 | 内容简介 |
| --- | --- |
| [NestJS](https://clearlovesixteen.github.io/personal-tech-blog/articles/nestjs) | NestJS 模块、依赖注入、控制器、Provider 与工程组织 |

也可以进入[文章索引](https://clearlovesixteen.github.io/personal-tech-blog/articles/)浏览完整文档库。

## 站点特性

- Markdown 驱动，文章内容与站点代码一同进行版本管理
- 支持中文全文搜索、文章目录、上一篇/下一篇导航和更新时间
- 代码块支持语法高亮、行号与横向滚动
- 文档图片保存在仓库内，避免外部图片链接失效
- 适配桌面端和移动端阅读
- 推送到 `main` 分支后由 GitHub Actions 自动构建并发布

## 项目结构

```text
personal-tech-blog/
├── .github/workflows/deploy.yml  # GitHub Pages 自动发布流程
├── docs/
│   ├── .vitepress/               # VitePress 配置与自定义主题
│   ├── articles/                 # Markdown 技术文档库
│   ├── public/images/            # 文档图片等静态资源
│   └── index.md                  # 站点首页
├── package.json                  # 开发与构建命令
└── README.md                     # 项目说明
```

## 本地开发

项目需要 Node.js 18 或更高版本。

```bash
npm install
npm run dev
```

启动后访问终端显示的本地地址，默认通常为 `http://localhost:5173/`。

构建并预览生产版本：

```bash
npm run build
npm run preview
```

## 新增或更新文档

1. 在 `docs/articles/` 中新增或修改 Markdown 文件。
2. 将文档加入 `docs/.vitepress/config.mts` 的侧边栏配置。
3. 在 `docs/articles/index.md` 中补充文章入口和简介。
4. 图片放入 `docs/public/images/`，在 Markdown 中使用 `/images/文件名` 引用。
5. 本地运行 `npm run build`，确认链接、图片和代码块可以正常渲染。

推荐为代码块标注语言，以获得正确的语法高亮：

````markdown
```ts
const message = 'Hello, 技术札记'
```
````

## 自动发布

仓库使用 `.github/workflows/deploy.yml` 发布 GitHub Pages。提交并推送到 `main` 分支后，GitHub Actions 会自动完成依赖安装、站点构建和部署。

如需检查发布状态，可前往仓库的 [Actions 页面](https://github.com/Clearlovesixteen/personal-tech-blog/actions)。部署成功后即可通过下方地址访问：

**https://clearlovesixteen.github.io/personal-tech-blog/**

## 技术栈

- [VitePress](https://vitepress.dev/)：静态站点生成与文档主题
- [Markdown](https://www.markdownguide.org/)：文章内容维护
- [GitHub Actions](https://github.com/features/actions)：自动构建与部署
- [GitHub Pages](https://pages.github.com/)：静态站点托管

## License

站点代码可用于学习和交流；文章内容版权归作者所有，转载或引用请注明出处。
