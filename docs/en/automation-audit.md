# Issue moderation and publishing audit

[简体中文](../zh-CN/automation-audit.md) · **English** · [Home](../../README.en.md)

Audit date: 2026-10-16, Asia/Shanghai. Repository: [JilinJL/PixelWalk](https://github.com/JilinJL/PixelWalk). Initial baseline: `49e35f9`. The first fixes were merged in [PR #2](https://github.com/JilinJL/PixelWalk/pull/2), merge commit `ba6c071`.

## Findings and verification boundary

Tests, builds, and Pages deployment have successful runs. The first automation fixes are merged. The user's subsequent submission from another account, [Issue #3](https://github.com/JilinJL/PixelWalk/issues/3), exposed a legitimate GitHub attachment storage redirect being blocked; this update fixes that compatibility problem.

**A real submission has not yet been verified all the way through approval, snapshot push, nonempty batch deployment, and bot notification.** A successful review workflow can mean a normal validation rejection; it does not prove queuing or publication.

## Repository and configuration

The checkout's origin, project description, README, and existing deployment context identify this repository. The API confirms main as the default branch and administrator access for the active account. The user's untracked local image was excluded from the changes.

| Check | Evidence and scope |
| --- | --- |
| Workflows | Check, Deploy GitHub Pages, Scenery review, and Scenery publish are registered and active |
| Permissions | Actions enabled; read-only default token, with explicit workflow write grants |
| Branch restrictions | Initial inspection found main unprotected and no rulesets; no observed rule blocking bot pushes, but real nonempty writes still need verification |
| Pages | Workflow build, HTTPS, no custom domain, main-only github-pages environment |
| Merged checks | [Check 38773538292](https://github.com/JilinJL/PixelWalk/actions/runs/38773538292) succeeded |
| Merged deployment | [Pages 38773538295](https://github.com/JilinJL/PixelWalk/actions/runs/38773538295) succeeded |
| User review | [Review 38774673672](https://github.com/JilinJL/PixelWalk/actions/runs/38774673672) succeeded as a job, but rejected Issue #3's attachment domain and did not queue it |
| User manual publish | [Publish 38774763334](https://github.com/JilinJL/PixelWalk/actions/runs/38774763334) succeeded with an empty queue; no nonempty deployment proven |
| Attachment redirect | Read-only inspection of the real attachment confirmed a redirect to `github-production-user-asset-6210df.s3.amazonaws.com` returning 200 |

## Fixes

| Problem | Result |
| --- | --- |
| Deployment failure lost the retry path after candidate promotion | Candidates without `announcedAt` remain pending for redeployment and notification |
| API write 404 errors were swallowed | Only missing labels/collaborators tolerate 404; other API failures fail the job |
| Notification retries could duplicate comments | Unique bot markers support deduplication and recovery |
| Pending concurrent reviews could be replaced | `queue: max` retains up to 100 waiting entries with serialized writes |
| Queued events used stale form data | Fetch current Issue under the lock and check state/scenery label |
| Handwritten Issues bypassed provenance/consent | Enforce source and both acknowledgments; store final PNG SHA-256 |
| Unsafe redirects or malformed PNGs | Check each destination before requesting, bound time/size, validate and reencode PNGs |
| Legitimate GitHub S3 redirect rejected | Allow the exact verified storage host only after a trusted attachment redirect; reject arbitrary buckets and deceptive suffixes |
| Old push events could deploy old files | Ordinary Pages jobs read current main; manual jobs restricted to main |
| Mixed-language prose and missing visual submission instructions | Separate language files with switches, real screenshots, and clear acceptance criteria |

Publishing still checks approximately every 30 minutes, at minutes 7 and 37; timing is not guaranteed. Humans review content, without a new AI classifier. Administrator self-review remains an explicit code exception.

## Validation and limits

- All 36 local tests passed, including the actual CLI with mocked GitHub APIs for review, batches, notifications, recovery, provenance, PNG checks, and attachment storage allow/block regression tests.
- Both static-site and standalone builds passed for this update. The first merged Check and Pages runs are linked above; consult the corresponding commit's Actions for post-push results.
- The real CLI ran in an isolated directory with Issue #3's actual attachment, downloading, validating, and creating a local queued snapshot. Every GitHub write endpoint was intercepted by a local mock; actual remote writes were zero.
- This update opened the actual game, studio, and GitHub form in a browser and captured the built-in cat example. No demonstration submission was created, submitted, or approved. Mobile and sustained performance were not tested.
- The user's real submission and failed review were inspected. No new `/approve` was posted on the maintainer's behalf; real nonempty publishing and notification writes remain untested.
- No natural scheduled trigger has been observed. Manual success does not verify scheduled execution.
- Installed actionlint v1.7.12 does not recognize `queue`. The first audit excluded only that compatibility diagnostic; other checks passed. GitHub accepted the configuration, but no queue load test was performed.
- Issue updates and Git commits are not atomic. Waiting queues are limited to 100. Manual commits and deployment still have timing boundaries; avoid simultaneous changes to the same batch files.

See [moderation](moderation.md) and [publishing/recovery](publishing.md). Official references: [concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency), [workflow troubleshooting](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows), and [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token).
