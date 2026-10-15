# Issue 审核与自动投放检查记录

**简体中文** · [English](../en/automation-audit.md) · [返回首页](../../README.md)

检查日期：2026-10-16（Asia/Shanghai）。仓库：[JilinJL/PixelWalk](https://github.com/JilinJL/PixelWalk)。初次检查基线：`49e35f9`；首批修复已通过 [PR #2](https://github.com/JilinJL/PixelWalk/pull/2) 合并，合并提交 `ba6c071`。

## 结论与实际边界

静态站点的测试、构建和 Pages 部署有成功记录。首批自动化缺陷已修复并合并；随后用户用另一个账号提交的 [Issue #3](https://github.com/JilinJL/PixelWalk/issues/3) 暴露了 GitHub 附件存储跳转被误拦截的问题，本次补充修复。

**尚未完成真实投稿从批准、提交快照、非空批次部署到机器人通知的整条验证。** 审核工作流显示成功也可能只是正常返回“无法通过”，不能据此宣称作品已入队或上线。

## 仓库与配置确认

本机仓库 origin、项目说明、README 和既有部署上下文均指向本仓库，API 确认默认分支 main、当前账号拥有管理员权限。用户本地未提交的图片没有纳入修复。

| 检查项 | 实际证据与范围 |
| --- | --- |
| 工作流 | Check、Deploy GitHub Pages、Scenery review、Scenery publish 均已注册启用 |
| 权限 | Actions 已启用，默认 token 为只读；工作流显式申请所需写权限 |
| 分支限制 | 初次检查时 main 未保护、rulesets 为空；未发现阻止机器人 push 的分支规则，真实非空写入仍需验证 |
| Pages | 工作流构建、HTTPS、无自定义域名，github-pages 环境只允许 main |
| 首批合并检查 | [Check 38773538292](https://github.com/JilinJL/PixelWalk/actions/runs/38773538292) 成功 |
| 首批合并部署 | [Pages 38773538295](https://github.com/JilinJL/PixelWalk/actions/runs/38773538295) 成功 |
| 用户实际审核 | [Review 38774673672](https://github.com/JilinJL/PixelWalk/actions/runs/38774673672) 作业成功，但 Issue #3 的图片被域名检查拒绝，未入队 |
| 用户手动投放 | [Publish 38774763334](https://github.com/JilinJL/PixelWalk/actions/runs/38774763334) 成功；队列为空，不能证明非空投放成功 |
| 附件跳转 | 对用户实际 GitHub 附件做只读检查，确认跳转到 `github-production-user-asset-6210df.s3.amazonaws.com` 并返回 200 |

## 已修复的问题

| 问题 | 现在的行为 |
| --- | --- |
| 先标候选、部署失败后失去重试入口 | 缺少 `announcedAt` 的候选持续待办，下轮重新部署和通知 |
| API 写接口 404 被吞掉 | 仅缺失标签、缺失协作者允许 404；其他 API 失败使任务失败 |
| 通知重试产生重复评论 | 用机器人唯一评论标记恢复进度并去重 |
| 并发等待任务被替换 | 使用 `queue: max`，最多保留 100 个等待项，串行写入 |
| 事件排队后读取旧表单 | 持锁后重新读取当前 Issue，检查状态和投稿标签 |
| 手写 Issue 绕过来源与确认 | 校验来源和两项确认，记录最终 PNG 的 SHA-256 |
| 不安全的跳转或异常 PNG | 请求前逐跳校验、限制时间/大小，校验 PNG 结构后重新编码 |
| 合法附件的 S3 跳转被拒绝 | 仅在可信附件跳转后额外允许已核实的完整存储域名；其他 S3 桶与伪造后缀仍拒绝 |
| 旧推送事件部署过期文件 | 普通 Pages 作业读取运行时最新 main；手动任务限制 main |
| 双语正文混排、投稿指引缺图 | 中英文独立文件、互链切换；首页与贡献指南加入真实截图和收录条件 |

投放仍约每 30 分钟检查一次（每小时第 7、37 分钟），时间不保证。内容由人审核，没有新增 AI 内容分类器。管理员自审仍是代码明确允许的例外。

## 验证范围与限制

- 本地 36 项测试通过，包括真实 CLI 配合模拟 GitHub API 的审核、批次、通知、失败恢复、来源确认、PNG 校验，以及附件存储域名的允许/拦截回归测试。
- 本次静态站点与单文件构建均通过。首批合并后的 Check、Pages 有上述成功记录，本次推送后的结果以对应提交的 Actions 为准。
- 将真实 CLI 放在隔离目录，使用 Issue #3 的真实附件下载、校验并生成了本地排队快照；所有 GitHub 写接口均被本地模拟拦截，实际远程写入为零。
- 本次在浏览器打开实际游戏、创作页和 GitHub 表单，使用内置小猫示例采集截图；未创建、提交或批准演示投稿，未做手机或持续性能测试。
- 已读到用户实际投稿和审核失败；尚未代维护者重发 `/approve`，未做真实非空队列部署或通知写入测试。
- 尚未观察到自然 schedule 触发；手动任务成功不能当作定时触发成功。
- 安装的 actionlint v1.7.12 不认识 `queue` 字段；首批检查只排除该兼容性提示，其余检查通过。GitHub 已接受此配置，但未做排队压力测试。
- Issue 标签、评论与 Git 提交不是原子事务；队列有 100 项上限；人工提交和部署仍有时序边界，应避免同时改动同一批次文件。

相关操作见[审核逻辑](moderation.md)与[投放及恢复](publishing.md)。官方依据：[工作流并发](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)、[工作流排障](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)、[GITHUB_TOKEN 行为](https://docs.github.com/en/actions/concepts/security/github_token)。
