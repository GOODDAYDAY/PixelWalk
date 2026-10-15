# Gameplay guide

[中文](../zh-CN/gameplay.md) · [README](../../README.en.md)

PixelWalk is a single-player pixel walking game without scores, combat, or leaderboards. Walking reveals scenery and advances the day/night cycle. Reviewed community submissions become part of the public scenery; a local preview is not a submission or publication.

## Controls

| Action | Control |
| --- | --- |
| Walk | Hold D / →; release to stop. Canvas focus is not required. Typing in text fields does not move the character. |
| Go back at the start | Hold A / ←. Passing the first scenery locks forward progress and prevents returning to the cabin. |
| Touch controls | Hold the right area to advance, or the left third to move back; release to stop. |
| Cruise | Select 沉浸模式 (immersive mode), then press D / → or tap the scene. |
| Exit cruise | Escape or double-click/tap the scene; movement stops immediately. |
| Pause | Losing focus, backgrounding the tab, changing routes, or opening a dialog stops movement. Restart when returning. |
| Reset | Reload or select 重新出发 (restart) to reset the journey, reverse restriction, and moon phase. |
| Audio | BGM toggles music; ⓘ shows credits and volume. Browser playback requires user interaction. |

## Day, night, and moon phases

Day and night alternate every five scenery items. A distance-driven transition starts after the old scenery leaves the screen; stopping movement pauses the transition. The first night has a new moon. After a full night and the end of dawn, the phase advances: new → first quarter (right half lit) → full → last quarter (left half lit) → new. Reloading or restarting resets the phase; it is not based on real dates.

## Hidden cabin

Before passing the first scenery, keep walking left. Reach the left edge of the starting screen and cross it to enter the separate cabin page. At the door, press W or select the prompt to open the scroll. Closing it leaves you at the door; walk right to return. The scroll credits Lin and lists published scenery contributors by GitHub account, with deduplication, search, and profile links.

## Create and submit

Open 参与设计 (design). Choose transparent PNG / WebP up to 8 MB and 16 million pixels; animations are rejected. Select 日景/夜景 (day/night), 小/中/大/巨大 (small/medium/large/giant), and 地面/空中 (ground/air). The image is converted to a 160×160 pixel PNG and placed in an independent walking preview.

投稿 (submit) downloads the PNG and opens a GitHub Issue form. Log in to GitHub, attach the downloaded PNG, describe its source/license, check both confirmations, and submit the Issue. Previewing, downloading, or opening the form alone does not upload your image. There is currently no separate preview-confirmation button. See [moderation](moderation.md) and the [content policy](content-policy.md).

The current studio preview is held in memory and lost on reload; volume can be saved locally. Music: Childhood (day) and Moonlight (night) by Scott Buckley, with a 10% default volume, a 0–30% adjustment range, and crossfades. See [full license and credits](../../assets/audio/LICENSE.md).
