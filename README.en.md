# PixelWalk

[简体中文](README.md) · **English**

Take a walk. Find a little scenery. A quiet pixel world with changing light, moon phases, hidden surprises—and room for something you create.

[Start walking](https://pixelwalk.fun/) · [Contribute scenery](CONTRIBUTING.en.md) · [Gameplay guide](docs/en/gameplay.md)

![Actual PixelWalk gameplay: a traveler approaches a bakery in the mountains](docs/images/gameplay.png)

## A little world to explore

- **Walk at your own pace.** No scores, combat, or win conditions. Hold a direction key and head out.
- **Watch the light change.** Day and night alternate every five scenery items. Each completed night advances the moon phase.
- **Find a hidden cabin.** Explore left at the beginning to open the author and community credits scroll.
- **Leave something behind.** Convert an image into pixel scenery, preview it in the world, and submit it for community review.

## Quick controls

| Action | Control |
| --- | --- |
| Walk forward | Hold **D / →**; release to stop |
| Go back at the start | Hold **A / ←**; reverse is locked after passing the first scenery |
| Touch controls | Hold the right area to advance, or the left third to go back |
| Start cruising | Select the top **沉浸** control, then press D / → or tap the scene |
| Stop cruising | **Escape** or double-click/tap the scene |
| Music and volume | Toggle **BGM**; select **ⓘ** for credits and volume |

The moon cycles **new → first quarter → full → last quarter → new**. Reloading or selecting restart resets the journey. [Read the full controls and cabin guide](docs/en/gameplay.md).

## Add your scenery to the game

![Actual studio: choose an image, adjust its scale, and preview it in the walking scene](docs/images/studio-preview.png)

**Create and preview → submit an Issue → human review → batch deployment → appear in everyone's journey.**

You do not need to write code. Follow the [illustrated contribution guide](CONTRIBUTING.en.md) to choose an image, download its PNG, complete the submission form, and track its status. The current game UI and submission form use Chinese; the guide explains the visible controls.

Submissions need clear provenance, permission for public display and redistribution, compliance with the [content policy](docs/en/content-policy.md), and a valid image. They enter the live game only after maintainer approval and successful deployment. Previewing, downloading, or submitting an Issue does not publish your work.

## Explore the documentation

| Guide | What it covers |
| --- | --- |
| [Contributing](CONTRIBUTING.en.md) | Screenshot walkthrough, acceptance criteria, status tracking, and common questions |
| [Gameplay](docs/en/gameplay.md) | Controls, day/night, moon phases, the hidden cabin, and music |
| [Content policy](docs/en/content-policy.md) | Prohibited sexual, violent, political, infringing, private, or malicious content |
| [Moderation](docs/en/moderation.md) | Reviewer permissions, commands, image snapshots, and validation |
| [Publishing](docs/en/publishing.md) | Scheduled/manual release, recovery, and removal |
| [Hosting](docs/en/deployment.md) | GitHub Pages, image storage, and custom domains |
| [Audit record](docs/en/automation-audit.md) | Automation evidence and verification limits |

## Run locally

Requires **Node.js 24+** and **Python 3**. No npm dependency installation or external API credentials are needed.

```sh
npm run dev         # Open http://127.0.0.1:5173
npm test
npm run build:site  # Static site in dist/
npm run build       # Standalone outputs/PixelWalk-demo.html
```

The offline HTML is a generated build output, not a checked-in download. `content.js` is generated from `scenery/manifest.json` and maintained by the submission workflow.

## Music and credits

**Childhood** accompanies the day; **Moonlight** accompanies the night. Both are by **Scott Buckley**, licensed under **CC BY 4.0**. See [full sources, attribution, and transcoding notes](assets/audio/LICENSE.md). Published community artwork is attributed to its GitHub account in the cabin credits.
