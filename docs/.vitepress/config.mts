import { defineConfig } from 'vitepress'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserPage = repoName?.endsWith('.github.io')
const base = process.env.BASE_PATH ?? (repoName && !isUserPage ? `/${repoName}/` : '/')

export default defineConfig({
  title: '技术札记',
  description: '前端工程、AI Workflow、RAG、Agent 与系统设计实践',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f36f45' }]
  ],
  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true
    }
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '技术札记',
    outline: {
      level: [2, 3],
      label: '本文目录'
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: {
      text: '最后更新'
    },
    search: {
      provider: 'local'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/articles/' },
      { text: 'AI 工程', link: '/articles/frontend-workflow-ai-deep' },
      { text: '前端架构', link: '/articles/micro-frontend' }
    ],
    sidebar: {
      '/articles/': [
        {
          text: 'AI 与知识工程',
          collapsed: false,
          items: [
            { text: '前端领域 Workflow 与 AI 结合的深度技术分享', link: '/articles/frontend-workflow-ai-deep' },
            { text: '浅谈前端领域 WorkFlow 与 AI 的结合', link: '/articles/frontend-workflow-ai' },
            { text: '知识库系统', link: '/articles/knowledge-base-system' },
            { text: 'Agentic RAG', link: '/articles/agentic-rag' },
            { text: 'RAG', link: '/articles/rag' },
            { text: 'Agent 记忆检索', link: '/articles/agent-memory-retrieval' },
            { text: 'memory 研究', link: '/articles/memory-research' },
            { text: 'LangChain 学习总结', link: '/articles/langchain-summary' }
          ]
        },
        {
          text: '前端工程与架构',
          collapsed: false,
          items: [
            { text: '微前端架构', link: '/articles/micro-frontend' },
            { text: '组件设计', link: '/articles/component-design' },
            { text: 'Formily 原理及场景应用', link: '/articles/formily' },
            { text: 'WMS UI --> UX 文档', link: '/articles/wms-ui-ux' }
          ]
        },
        {
          text: '后端与服务端',
          collapsed: false,
          items: [
            { text: 'NestJS', link: '/articles/nestjs' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ],
    footer: {
      message: 'Built with VitePress and GitHub Pages.',
      copyright: 'Copyright © 2026'
    }
  }
})
