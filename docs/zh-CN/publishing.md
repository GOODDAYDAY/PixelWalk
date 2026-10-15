# 自动投放、部署与恢复

[English](../en/publishing.md) · [README](../../README.md)

## 投放链路

1. `scenery-review.yml` 由投稿 Issue 的新评论触发。以 main 代码执行权限检查和人工审核命令，把通过的 PNG 快照与 manifest 提交到 main。非命令评论没有业务动作。
2. `scenery-publish.yml` 在 main 上每小时 UTC 第 7、37 分钟检查（北京时间分钟数相同），也可在 Actions → Scenery publish → Run workflow 手动触发，选择 main。
3. `batch` 将所有 `queued` 作品标为 manifest `published`，生成 `content.js`、运行测试、提交并推送。这个 manifest 状态表示“已纳入发布候选”，不能单独证明网站已经部署。
4. `deploy` 调用可复用的 `pages.yml`，检出批次提交 SHA、重新测试、构建 dist、上传 Pages artifact 并部署。机器人推送不会自动触发普通 push 工作流，所以必须显式调用部署。
5. 只有部署任务成功才执行 `announce`：在对应 Issue 上移除 `approved` / 旧 `accepted`，添加 `published`，发送带唯一标记的发布评论、关闭 Issue；写入 `announcedAt` 并提交。Issue 的 `published` 标签是部署成功后的确认。

普通 main 推送会触发 Check 和 Pages；普通 Pages 作业在开始时读取 main 最新版本，避免排队中的旧事件把站点退回旧提交。Pages 与投放手动任务仅允许 main；不要用手动 ref 参数绕过部署分支约束。站点使用相对资源路径，`dist/` 只复制运行代码、assets 和 manifest 中的发布候选图片，不复制 docs/tests/work。离线单文件另由 `npm run build` 生成。

## 权限与并发

| 工作流 | 所需权限 |
| --- | --- |
| Check | contents: read |
| Scenery review | contents: write；issues: write |
| Scenery publish | contents: write；issues: write；pages: write；id-token: write |
| Pages | contents: read；pages: write；id-token: write |

全部使用仓库 `GITHUB_TOKEN`，不需要额外 PAT、AI 密钥或图片服务器。仓库默认 token 只读不妨碍工作流显式申请这些权限。审核与投放共享 `scenery-git` 锁，投放持锁至部署和通知完成；Pages 另有 `pages` 锁。均不取消运行中的任务，并使用 `queue: max` 保留最多 100 个等待项；超限仍可能取消，必须看 Actions，不能认为无限排队。Git 推送脚本最多尝试五次并 rebase，无法解决的冲突会失败，不能自动覆盖人工更改。

## 部署或通知失败

旧实现会在部署失败后失去再次投放的入口。本次改为：只要 manifest 中还有 `published` 且没有 `announcedAt` 的作品，下一次检查就重新测试和部署，再尝试通知。即使没有新增作品也会重试。

通知通过机器人评论的 `pixelwalk-published:编号` 标记去重；只有标签、评论、关闭都完成才记录 `announcedAt`。中途失败可再次运行，已发送评论不重复发送。部分成功时标签和关闭状态可能暂时不一致。通知记录最后提交；若提交失败，下一轮通过评论标记恢复。不要手动伪造确认时间来消除待办。

恢复步骤：打开失败的运行，定位审核/API、Git 推送、构建、Pages 或通知错误；修复权限/冲突/文件后，在 main 手动运行 Scenery publish，核对网站资源、Issue 和 manifest。若“审核通过”评论存在但快照没有成功推送，应重新审核，而不是只运行投放。

GitHub 定时调度不是精确计时器，可能延迟、丢弃或因仓库长期无活动等原因停用；缺少运行记录不代表审核通过。查看[官方排查文档](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)和[并发队列说明](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)。机器人推送行为见 [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)。

## 撤回与下架

- 尚处于 `queued`：维护者在 Issue 评论 `/reject 理由`，确认工作流成功推送，不能仅关闭 Issue。
- 已进入 `published` 候选或已经上线：`/reject` 不支持下架。维护者应等待在途投放结束，移除 manifest 对应记录与 `scenery/images/gh-编号.png`，运行 `node scripts/scenery.cjs content`、测试和站点构建，审查更改后提交到 main，等待 Pages 成功，再移除 Issue 的 `published` 并说明处理结果。不可只删图片而保留引用。
- 紧急下架先暂停投放任务，处理在途部署，防止旧 artifact 再次上线；完成后恢复调度。Git 历史与原 Issue 附件不会因工作区删除自动消失，隐私/侵权问题可能需要平台额外处理。

## 验证边界

自动化测试使用模拟 GitHub API，不证明真实令牌具备全部写权限。必须分别核对：测试成功、快照提交成功、Pages 部署成功、线上图片可访问、Issue 状态更新成功。空队列运行会跳过部署和通知，不是端到端投放验证；实际证据见[检查报告](../automation-audit.md)。
