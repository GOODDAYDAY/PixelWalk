# 托管与部署现状

**简体中文** · [English](../en/deployment.md) · [返回首页](../../README.md)

PixelWalk 当前部署在 [GitHub Pages](https://jilinjl.github.io/PixelWalk/)，源代码位于 [JilinJL/PixelWalk](https://github.com/JilinJL/PixelWalk)。2026-10-16 检查时，Pages 使用工作流构建、已启用 HTTPS、没有自定义域名，发布环境只接受 main。

## 图片与数据放在哪里

原图在浏览器里处理，投稿 PNG 手动上传为 GitHub Issue 附件。审核通过后，工作流将重新编码的 PNG 快照保存到 `scenery/images/`，并将审核和投放状态写入 `scenery/manifest.json`。发布批次据此生成 `content.js`，再部署静态网站。

这套流程不需要常驻服务、数据库、额外 API 密钥或自己的图片服务器。创作预览只存在页面内存中，刷新会丢失；音量可以保存在本地。公开仓库及 Git 历史会随收录增长，需要持续控制图片体积。

## 如何更新网站

- 普通 main 推送触发 Check 与 Pages。
- 投稿批次由投放工作流显式调用 Pages；不能依赖机器人推送再次触发普通 push 工作流。
- 手动运行 Pages 或投放任务时选择 main。
- 本地 `npm run build:site` 生成的 `dist/` 也可交给普通静态服务器托管。

详细步骤与权限见[投放逻辑](publishing.md)，真实验证证据见[检查记录](automation-audit.md)。本次没有修改独立服务器、DNS、域名或存储账号。若以后使用自定义域名，可参考 [GitHub 官方说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)。
