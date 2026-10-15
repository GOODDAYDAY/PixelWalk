# PixelWalk

[在线游玩 / Play](https://jilinjl.github.io/PixelWalk/) · [风景投稿 / Submit scenery](https://github.com/JilinJL/PixelWalk/issues/new?template=scenery.yml) · [Actions](https://github.com/JilinJL/PixelWalk/actions)

一个安静的像素漫游游戏：向右行走，欣赏日夜风景和四晚月相循环，也可以创作像素风景并投稿。没有分数、战斗或通关压力。

A quiet pixel walking game with day/night scenery and a four-night moon cycle. Walk, explore, and contribute your own scenery. There are no scores, battles, or win conditions. The current game UI and Issue form are in Chinese; English instructions are below.

## 文档 / Documentation

| 内容 / Topic | 中文 | English |
| --- | --- | --- |
| 游戏玩法、操作、彩蛋与音乐 / Gameplay | [玩法指南](docs/zh-CN/gameplay.md) | [Gameplay guide](docs/en/gameplay.md) |
| 投稿格式、权限、人工审核 / Submission and moderation | [审核逻辑](docs/zh-CN/moderation.md) | [Moderation](docs/en/moderation.md) |
| 定时投放、部署、失败恢复 / Publishing and recovery | [投放逻辑](docs/zh-CN/publishing.md) | [Publishing](docs/en/publishing.md) |
| 色情、暴力、政治敏感等禁止内容 / Prohibited content | [内容规范](docs/zh-CN/content-policy.md) | [Content policy](docs/en/content-policy.md) |
| 实际运行记录、已验证与未验证范围 / Audit evidence and limits | [双语检查报告](docs/automation-audit.md) | [Bilingual audit report](docs/automation-audit.md) |

贡献入口见 [CONTRIBUTING.md](CONTRIBUTING.md)。托管现状见 [部署与社区审核](docs/部署与社区审核.md)。[旧开发设计](docs/EndlessWalk-开发文档.md) 是历史设计基线，可能包含未实现的功能；当前行为以代码和上表文档为准。

See [CONTRIBUTING.md](CONTRIBUTING.md) for a short contribution checklist. The older design document contains historical proposals, including unimplemented features.

## 快速操作 / Quick controls

- 按住 D / → 前进，松开停止；普通模式可用 A / ← 后退，但通过首景后不能倒退。移动端按住画面右侧前进、左侧三分之一后退。
- Hold D / → to walk; release to stop. A / ← moves backward only before passing the first scenery. On touch screens, hold the right area to advance or the left third to go back.
- 点击「沉浸模式」后按 D / →（手机点击画面）开始自动行走；Esc 或双击画面退出并停止。
- Select 沉浸模式 (immersive mode), then press D / → or tap the scene to cruise. Escape or double-click/tap exits and stops.
- 「参与设计」选择 PNG / WebP，自动像素化并试玩；「投稿」下载 PNG 并打开 GitHub Issue，仍需手动附图、填写来源并确认规范。
- Open 参与设计 (design), choose PNG / WebP and preview the pixel art. 投稿 (submit) downloads the PNG and opens an Issue form; attach the downloaded file, describe its source, and confirm the policy.

## 社区流程 / Community pipeline

投稿 Issue → 协作者人工检查 → `/approve` → 保存 PNG 快照入队 → 约每 30 分钟批量构建与 Pages 部署 → 成功后标记 `published` 并关闭 Issue。

Issue submission → human review by a collaborator → `/approve` → queued PNG snapshot → batch build and Pages deployment about every 30 minutes → `published` label and closed Issue after successful deployment.

**没有 AI 内容审核或自动识别黄暴政治内容的功能。** 程序只检查权限、表单与 PNG 格式；维护者必须检查图片、作品名、来源和链接。[内容规范](docs/zh-CN/content-policy.md) 适用于全部投稿，AI 辅助作品也不例外。

**There is no AI content moderation.** Automation checks permissions, form fields, and PNG structure. Maintainers must inspect the image, title, source, and links against the [content policy](docs/en/content-policy.md), including AI-assisted work.

## 本地开发 / Local development

Node.js 24+，Python 3；无需安装 npm 依赖或配置外部 API。Node.js 24+ and Python 3 are required; no npm dependencies or external API credentials are needed for local builds.

```sh
npm run dev         # http://127.0.0.1:5173
npm test
npm run build:site  # dist/ for static hosting
npm run build       # outputs/PixelWalk-demo.html, generated locally
```

独立 HTML 需要先构建，不是仓库自带下载。`content.js` 由 `scenery/manifest.json` 生成；管线正常运行时请勿手改。Only generated published scenery ships in the site build. The standalone HTML is a local build output, not a checked-in download.

`engine.js`：世界与渲染 / world and rendering；`app.js`：交互与投稿预览 / input and submission preview；`pixelate.js`：像素化 / pixel conversion；`music.js`：音乐 / music；`scripts/scenery*.cjs`：审核与投放 / moderation and publishing。

音乐：Scott Buckley 的 Childhood 与 Moonlight，CC BY 4.0。完整署名、来源和转码说明见 [音乐许可 / Music license](assets/audio/LICENSE.md)。
