# PixelWalk 线上管理

第一版是本机管理台，直接管理 JilinJL/PixelWalk 的 main 和线上 GitHub Pages。零 npm 依赖、无数据库、无需 OAuth 应用。管理页面不是公开管理 API；GitHub 凭据保存在本机 gh 中，浏览器拿不到 GitHub token。

## 使用

在项目目录运行 `npm run admin`，打开 http://127.0.0.1:4317/admin/ 。已安装 Node.js 24+ 和 GitHub CLI，且 `gh api user` 必须为主账号 JilinJL（数值 ID 62745529），并拥有目标仓库管理员权限。切换账号使用 `gh auth switch --user JilinJL`。

线上游戏的“管理”链接、`/PixelWalk/admin/` 和 `#/admin` 提供本机后台入口。关闭后台进程后不能继续操作；游戏照常运行。重新启动仍会从 GitHub 读取最新数据。端口可通过 PIXELWALK_ADMIN_PORT 设置，默认 4317。

## 能力

- 作品库：搜索、预览、手动上传透明 PNG/WebP、修改名称/日夜/体积/摆放与来源、替换图片、下架、恢复。上传不需要创建 Issue；可填写实际作者署名。
- 内置风景：可单独下架、恢复，不必删除渲染代码。
- 投稿审核：查看最近 100 条 scenery Issue，跳转核对源图、来源和评论；批准后冻结快照，发起现有 Scenery publish 管线。不会在未查看内容时自动审核。
- 世界设置：移动速度、景点间距、日夜过渡距离、每组景点数量、空中高度、默认音量和四档像素化色数。参数有服务端范围校验；色数只影响后续生成的图片，默认音量不覆盖已有玩家设置。
- 发布：显示最近 Actions、重发投放、重发 Pages、检查线上 content.js、世界参数和每张图的 SHA-256；不会仅凭任务绿色宣布上线。
- 记录：最近 500 次管理动作随内容保存，Git 保留完整提交历史。此版本不提供一键全站回滚；可通过 Git 恢复历史文件再部署。

## 保存与生效

每次操作读取准确 main SHA，生成多个文件的单次 Git 提交，再以 fast-forward 更新 main；并发变化会拒绝保存，刷新后重试。已有审核/投放任务运行时暂不写入，避免与在途批次交叉。主账号提交会触发现有 Pages。Issue 快照仍走现有批量投放；投放失败可以在后台重试。

“收录”表示已进入仓库发布清单，尚不能单独证明网站上线。保存后切换“发布与记录”，待 Deploy GitHub Pages / Scenery publish 的部署步骤成功，再点击“核验线上版本”。已打开的游戏需要刷新后读取新内容。GitHub 调度可能延迟。

下架采用 `archived`，保留记录和图片以便恢复；公开站点的下一部署不再包含该图片。Git 历史、旧部署、缓存及原 Issue 附件不会被抹除。Issue 下架不会被 `/approve` 重新激活，应在后台恢复。元数据修改不自动改写原 Issue 的文字。

## 文件与权限

- `scenery/manifest.json`：社区和手工作品、状态、署名、图片哈希、内置作品停用清单。
- `scenery/config.json`：世界参数唯一数据源；构建时生成 `world-settings.js`。
- `scenery/admin-audit.json`：管理记录。
- `content.js`：从 manifest 生成，禁止单独手改。

仅监听 127.0.0.1，校验 Host / Origin / CSRF，每个管理 API 均验证 GitHub 主账号。任何能控制这台 Mac 或其 gh 凭据的人仍属于本机信任范围；不能把此服务通过反向代理或端口转发直接暴露公网。其他设备远程管理应另行增加服务端登录。
