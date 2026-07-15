# 技术札记

个人技术博客，基于 VitePress 构建，内容来自本地 Markdown 文档。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 发布到 GitHub Pages

1. 在 GitHub 创建一个名为 `personal-tech-blog` 的公开仓库。
2. 将本仓库推送到 GitHub。
3. 进入仓库 `Settings -> Pages`，选择 `GitHub Actions` 作为发布源。
4. 推送到 `main` 或 `master` 后，GitHub Actions 会自动构建并发布。

如果仓库名不是 `personal-tech-blog`，站点会在 GitHub Actions 中自动使用当前仓库名作为访问路径。
