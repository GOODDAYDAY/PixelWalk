# 参与 PixelWalk

你可以投稿风景，也可以在 [风景 Issue 列表](https://github.com/JilinJL/PixelWalk/issues?q=is%3Aissue%20is%3Aopen%20label%3Ascenery) 中参与审核。

## 投稿

1. 在游戏「参与设计」页选择透明 PNG / 静态 WebP，填写名称、日夜、体积和地面 / 空中分类。
2. 生成像素预览并试玩，勾选确认，再点击「下载投稿 PNG」。
3. 点击「前往 GitHub 投稿」，登录 GitHub，将下载的 160×160 PNG 拖入表单图片区，等待上传完成，再填写来源、分类与署名并提交。
4. 按社区反馈修改时重新生成、试玩和上传，说明哪个版本替代旧版本。

原图和草稿先留在你的浏览器；只有你在 GitHub 附上 PNG 并提交 Issue，才会公开投稿。公开仓库的 Issue 附件无需登录即可访问，请勿附私人资料。

## 参与审核

任何有 GitHub 账号的用户都可以评论：主体是否清晰、透明背景和像素风是否合适、尺寸 / 日夜 / 空中分类是否合理、署名和来源是否完整。可以用 👍 表示支持，说明问题比单纯投票更有帮助。

`scenery` 表示风景投稿，`pending-review` 表示待审，`needs-changes` 表示待修改，`accepted` 表示维护者接受，`published` 表示已经随版本发布。标签由维护者管理；票数、关闭 Issue 或添加 `accepted` 都不会自动把图片加入游戏。

当前是人工收录：维护者检查实际 PNG、来源与最终版本，创建内容 PR，将图片接入正式景点目录并补齐 `content.js` 鸣谢；合并后发布，并把发布版本链接回原 Issue。游戏中的「管理」页仍是浏览器本地管理，无法修改公开作品。自动校验、内容 PR 生成和 Issue 状态同步尚未实现。

## 开发

无需安装依赖。使用 Node.js 24+ 和 Python 3。

```sh
npm run dev
npm test
npm run build:site
npm run build
```

`dist/` 是静态站发布目录；`outputs/PixelWalk-demo.html` 是内嵌音频的离线单文件。不要提交本地草稿、原始上传、密钥或工作目录。音乐许可见 `assets/audio/LICENSE.md`。
