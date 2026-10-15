# Submission and moderation

[中文](../zh-CN/moderation.md) · [README](../../README.md)

## Human and automated responsibilities

Humans review content. There is no AI image moderation, OCR, political-content detector, or automatic approval based on keyword checks. Community feedback is welcome, but votes do not approve work. Commands require write / maintain / admin permission. Read, triage, ordinary users, and submission authors cannot review; administrators have an explicit self-review exception in the code. Prefer a second reviewer in practice.

## Form and file requirements

Use the 风景投稿 template and preserve its Chinese headings:

| Field | Meaning / allowed values |
| --- | --- |
| 作品名称 | Artwork title; controls and angle brackets removed, whitespace collapsed, truncated to 40 characters |
| 像素 PNG | One GitHub attachment image URL |
| 展示时段 | 日景 = day, 夜景 = night |
| 体积 | 小 = small, 中 = medium, 大 = large, 巨大 = giant |
| 摆放方式 | 地面 = ground, 空中 = air |
| 素材来源 | Required source and license information |
| 确认 | Check both redistribution consent and content-policy acknowledgment |

Final files must be at most 1 MiB (1,048,576 bytes), 160×160, nonanimated, noninterlaced 8-bit RGBA or indexed PNG. They must contain visible pixels and at least 1% transparent pixels. Automation validates structure, CRC, decompressed size, and transparency, then reencodes without metadata. Alpha below 128 becomes transparent; other alpha becomes opaque. HTTPS and GitHub domains are checked before each download/redirect, with time, size, and redirect limits. Technical validation does not establish content compliance.

## Reviewer commands

Inspect the image, title, source, license, and links against the [content policy](content-policy.md) before approval. Return uncertain submissions for clarification.

- `/approve`: checks permission, fetches the current open Issue with its `scenery` label, validates the current form/image, stores `scenery/images/gh-N.png`, and records `queued`, reviewer, timestamp, source, and PNG SHA-256 in the manifest. Adds `approved` and removes pending/change-request labels. The snapshot is durable only after its Git commit is pushed.
- `/reject reason`: requests changes for an unpromoted submission, removes any queued snapshot and `approved` / legacy `accepted` labels, and adds `needs-changes`. It does not close the Issue or remove its original attachment.
- Ordinary comments are ignored. Commands are case-insensitive and allow surrounding whitespace. PR comments do not enter this pipeline. Submission authors must be individual `User` accounts.

Editing an approved Issue does not change its snapshot; a reviewer must approve again. Failed reapproval does not revoke an earlier queued snapshot: reject first if the old version must not publish. Closing an Issue or changing labels alone does not cancel its queue entry. `/reject` cannot remove a candidate/published manifest entry; see [publishing and removal](publishing.md).

## Labels and failures

`scenery` identifies a submission; `pending-review` awaits review; `needs-changes` requests revision; `approved` identifies a queued candidate; the Issue's `published` label is added after successful deployment. Legacy `accepted` does not drive the queue. The manifest, rather than votes or labels, drives publishing.

Git commits and Issue labels/comments are not one atomic transaction. A comment may succeed before a push fails. Inspect the Actions run and manifest before treating a review comment as durable approval, then retry review after fixing the error. API write failures, including 403/404, fail the job. Missing labels and missing collaborators are the only intentionally tolerated 404 cases.
