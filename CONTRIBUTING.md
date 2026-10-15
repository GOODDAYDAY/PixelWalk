# 参与 PixelWalk

## 投稿

1. 打开游戏的「参与设计」页，放入一张透明 PNG / WebP，选择时段、体积和摆放，在试玩画面里走一遍。
2. 点「投稿」：PNG 会下载，同时打开预填好的 GitHub Issue 表单。登录 GitHub，把 PNG 拖进「像素 PNG」，提交。
3. 署名就是你的 GitHub 账号，作品投放后会出现在木屋鸣谢里并链接到你的主页。

Issue 附件公开可见，请勿附私人内容。需要修改时直接编辑 Issue、替换图片，再等待审核。

## 审核（仓库协作者）

在投稿 Issue 下评论：

- `/approve`：校验 PNG（160×160、透明背景、≤1 MB、非动图）后入队，Issue 标为 `approved`。校验失败会在评论中说明原因。
- `/reject 理由`：退回，标为 `needs-changes`，已入队的作品会被撤下。

只有 write / maintain / admin 权限的协作者的指令生效；作者不能审核自己的投稿（仓库管理员除外）。审核通过时存的是 PNG 快照，之后修改 Issue 不会影响已入队的版本，需要更新时重新 `/approve`。

## 投放

`scenery-publish` 每 30 分钟运行一次，把所有已通过的作品一次放出，提交并部署 GitHub Pages。部署成功后 Issue 标为 `published` 并关闭。队列为空时不做任何事。GitHub 的定时任务可能延迟几分钟；也可以在 Actions 里手动运行。

标签：`scenery` 投稿 · `pending-review` 待审 · `needs-changes` 待修改 · `approved` 已入队 · `published` 已投放。

## 开发

需要 Node.js 24+ 和 Python 3，无需安装依赖。

```sh
npm run dev         # http://127.0.0.1:5173
npm test
npm run build:site  # dist/
npm run build       # outputs/PixelWalk-demo.html
```

`content.js`、`scenery/` 由工作流维护，请不要手改。音乐许可见 `assets/audio/LICENSE.md`。
