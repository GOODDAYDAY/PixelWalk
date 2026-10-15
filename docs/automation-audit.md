# Issue 审核与自动投放检查 / Automation audit

检查日期 / Audit date：2026-10-16，Asia/Shanghai。目标 / Target：[JilinJL/PixelWalk](https://github.com/JilinJL/PixelWalk)。基线 / Baseline：`49e35f96c0d46b936537c23e079f2f673715300b`。

## 结论 / Conclusion

原有静态站点的测试和 Pages 部署有真实成功记录，线上主要文件与基线一致；人工审核和非空队列的自动投放尚无真实端到端证据。发现了部署失败后无法自动重试、API 写入错误被吞掉、并发待办可能被覆盖等确定问题，已在本次修复分支处理。修复必须合并到 main 才会用于生产审核和定时任务。

Existing tests and Pages deployment have real successful runs, and the inspected public files match the baseline. Human review and publication of a nonempty queue have not been verified end to end on GitHub. This branch fixes confirmed retry, API-error, and concurrency problems. Production moderation and scheduled publishing use these changes only after merge to main.

## 仓库确认 / Repository identification

原引用会话没有仓库地址。本机 `/Users/Admin/crafts/PixelWalk` 的 origin、GitHub 仓库说明、README 的 Issue 管线和此前部署会话一致，均指向 JilinJL/PixelWalk；GitHub API 确认默认分支 main、当前账号具备管理员权限。修复在独立副本与专用分支中完成，原目录未提交图片没有纳入更改。

The referenced conversation did not name a repository. The local checkout's origin, GitHub description, README pipeline, and earlier deployment conversation all identify JilinJL/PixelWalk. The API confirms main as the default branch and administrator access. Work was isolated in a dedicated clone/branch, leaving the original untracked image untouched.

## 实际检查结果 / Observed state

| 检查 / Check | 证据与范围 / Evidence and scope |
| --- | --- |
| Actions 注册 / Registration | Check、Deploy GitHub Pages、Scenery review、Scenery publish 均 active / all four workflows active |
| 近期记录 / Recent runs | 检查开始时仅有 6 次 push 记录：3 次 Check、3 次 Pages，均成功；未发现 review/schedule 记录 / six push runs, all successful; no review or scheduled runs observed |
| 最近 Check / Latest baseline Check | [38764103456](https://github.com/JilinJL/PixelWalk/actions/runs/38764103456)，success |
| 最近 Pages / Latest baseline Pages | [38764103358](https://github.com/JilinJL/PixelWalk/actions/runs/38764103358)，success；含测试、构建、上传、部署 / tests, build, upload, deployment succeeded |
| 手动投放 / Manual publishing | [38771301273](https://github.com/JilinJL/PixelWalk/actions/runs/38771301273)，success；日志为 queue empty，deploy/announce skipped，未写入投稿或发布内容 / empty queue only, no submission or published content written |
| Issues 与队列 / Issues and queue | 检查时无投稿 Issue，manifest.items 为空 / no submission Issues and an empty manifest |
| Actions 权限 / Permissions | enabled=true、allowed_actions=all；默认 token 为 read，工作流显式申请写权限；无需允许机器人批准 PR / enabled, all actions allowed, read-only default with explicit workflow grants; bot PR approval is unrelated |
| main 保护 / Main protection | protected=false，rulesets 为空；未发现分支规则阻止机器人 push，但没有实际执行非空队列写入验证 / no observed branch rule preventing bot pushes; actual nonempty write path untested |
| Pages 环境 / Environment | build_type=workflow、HTTPS=true、cname=null，github-pages 仅允许 main / workflow builds, HTTPS, no custom domain, main-only environment |
| 标签 / Labels | scenery、pending-review、needs-changes、accepted、published 存在；文档中旧 accepted 与新 approved 语义已澄清 / existing legacy accepted and new approved semantics clarified |
| 公网资源 / Public resources | 首页、engine.js、app.js、content.js 均 HTTP 200，字节与基线 Git 文件一致 / all four inspected files returned HTTP 200 and matched baseline bytes |

## 修复 / Fixes

| 问题 / Problem | 修复行为 / Result |
| --- | --- |
| 批次先标 published，部署失败后队列空，无法补投 / Failed deployment loses retry path | 没有 announcedAt 的候选持续待办，下一轮重新部署；通知成功后持久保存确认 / unacknowledged candidates remain retryable until notification progress is committed |
| 所有 API 404 都视作成功 / All API 404 responses tolerated | 仅缺失标签、缺失协作者允许 404；Issue、标签写入、评论及关闭等错误导致任务失败 / only missing labels/collaborators tolerate 404; other failures fail the job |
| 部署或关闭后重跑可能重复评论 / Notification duplication on retry | 检查机器人唯一评论标记，通知可恢复且避免重复 / bot marker supports deduplication and recovery |
| 共享锁只保留一个等待任务 / Pending review replacement | 使用官方 queue: max，最多 100 个等待项，保留串行写入 / official larger queue retains up to 100 pending runs with serialized writes |
| 事件排队后仍读取旧 Issue / Stale webhook body | 持锁后读取当前 Issue，关闭或失去投稿标签时不批准 / fetch current Issue before approval |
| 来源与授权可通过手写 Issue 绕过 / Missing provenance/consent enforcement | 校验来源与两项确认；保存来源和最终 PNG SHA-256 / enforce provenance and both acknowledgments; record source and PNG digest |
| 下载后才检查重定向目的地 / Redirect destination checked too late | 请求前逐跳检查 HTTPS/域名，限制重定向和超时 / validate every destination before request, with redirect/time limits |
| PNG 结构异常校验不足 / Incomplete PNG structural checks | 拒绝错误头、缺失结束块、多余尾部与解压尺寸不符等文件 / reject invalid headers, missing terminators, trailing data, and incorrect decoded size |
| 主分支旧推送事件可能部署旧文件 / Queued push deployment can use old files | 普通 Pages 作业读取当时最新 main，手动部署与投放限制 main / ordinary Pages jobs read current main; manual jobs restricted to main |
| README 混杂过时实现说明 / Stale, mixed documentation | 重写中英导航，新增八份玩法/审核/投放/规范文档，并更新贡献与托管入口 / bilingual navigation plus eight guides and refreshed contribution/hosting pages |

定时任务从整点/半点改为第 7、37 分钟，仍约每 30 分钟检查，不能保证准时。内容规范是维护者的收录标准，没有新增 AI 内容分类器。管理员自审是已有代码明确允许的例外，已在双语文档写明。

The schedule moves off the hour to minutes 7/37 while retaining an approximately 30-minute cadence; timing is not guaranteed. Content policy is a human curation rule, with no AI classifier added. The existing administrator self-review exception is documented explicitly.

## 验证与限制 / Validation and limits

- 本地 `npm test`：35/35 通过，含模拟 API 审核→入队→批次→通知、真实 CLI 调用、API 写入失败、关闭失败恢复、去重、来源确认、最新 Issue、附件与 PNG 校验。Local tests: 35/35 passed, including the actual CLI against mocked GitHub APIs.
- `npm run build:site` 与 `npm run build` 通过，未把生成包提交进源代码。Both site and standalone builds passed; generated packages are not committed.
- actionlint v1.7.12 暂不认识官方 queue 字段。只排除该字段兼容提示，其余检查通过。该项不是完整原样 lint 通过。The installed linter does not recognize the documented queue field; all other checks passed with only that compatibility diagnostic excluded.
- 未创建测试投稿、未代表维护者批准作品、未向投稿人发送测试评论，未做真实非空队列部署或通知写权限实测。No test submission, approval, or author notification was created; real nonempty publication and notification writes remain untested.
- 尚未观察到自然 schedule 触发，不能把手动成功当作定时调度成功；未定位到 scheduler 无记录的确定原因。Natural scheduled execution was not observed; manual success is not scheduled-trigger verification and does not establish why schedule history was absent.
- 没有重新做浏览器交互、手机布局或持续性能测试；公网 HTTP 文件一致性不是交互验证。No fresh browser interaction, mobile layout, or sustained performance test; HTTP checks are not interaction checks.
- Issue 评论/标签与 Git 提交不是原子事务；满 100 个等待任务仍可能取消；人工 push 与可复用批次部署之间仍有时序边界，操作时应避免同时修改同一批次文件。Issue/Git operations remain non-atomic; queues have a finite limit, and manual main pushes can still interleave with deployment timing.

## 官方依据 / Official references

[并发与 queue / Concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency) · [调度排查 / Scheduling](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows) · [GITHUB_TOKEN 触发行为 / Token-trigger behavior](https://docs.github.com/en/actions/concepts/security/github_token)。
