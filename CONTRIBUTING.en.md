# Put your scenery in PixelWalk

[简体中文](CONTRIBUTING.md) · **English** · [Home](README.en.md)

A tree, a cat, a tiny cabin, or something you would like a traveler to discover. Start with an image—you do not need to edit code.

[Open the studio](https://jilinjl.github.io/PixelWalk/#/contribute) · [Browse submissions](https://github.com/JilinJL/PixelWalk/issues?q=is%3Aissue+label%3Ascenery) · [Content policy](docs/en/content-policy.md)

![Actual studio preview with the built-in cat example and the traveler](docs/images/studio-preview.png)

**Your work joins the public game only after content approval, image validation, and successful website deployment.** The pictured cat demonstrates the controls; it is not evidence of a newly accepted submission. The current studio and Issue form use Chinese, so this guide names the controls you will see.

## 1. Choose an image

Open **参与设计** (design). Select the **＋ 透明 PNG** tile on the left, or drag an image onto it. Try **用示例小猫** to explore the controls with the built-in cat.

![Actual image-selection screen: the tile is on the left and the independent walking preview is on the right](docs/images/studio-start.png)

| Your source image | The file you submit |
| --- | --- |
| Transparent PNG or WebP | Transparent PNG downloaded from the studio |
| Up to 8 MB and 16 million pixels; no animation | 160×160; up to 1 MiB; no animation |
| A complete, clear subject with transparent background | Visible pixels and at least 1% transparent area |

Submit only material you may publicly display, modify, and redistribute. Describe the source of original, AI-assisted, and licensed work. AI generation does not exempt content or rights review. Do not upload identity documents, private photos, or contact details.

## 2. Adjust it and walk past it

The studio converts the image to pixel art. Give it a name, select its phase, scale, and placement, and inspect the result on the right.

![Actual pixel preview: appearance controls on the left, walking preview on the right, export and submit at the lower right](docs/images/studio-preview.png)

| Visible control | Purpose |
| --- | --- |
| 名字 | A short, clear artwork title |
| ☀ / ☾ | Day / night |
| S / M / L / XL | The artwork's in-game scale |
| 地面 / 空中 | Ground / air placement |
| ◀ / ▶ / ↺ | Back, forward, and reset; A / D or arrow keys also work |
| PNG ↓ | Download the final PNG separately |
| 投稿 ↗ | Download the PNG and open a prefilled GitHub Issue form |

Check that the subject is complete, the background is cleanly transparent, and the scale and placement look natural as the traveler walks past. Previewing does not submit your work. Reloading loses the current studio image, so download a copy.

## 3. Attach the downloaded PNG to an Issue

Select **投稿 ↗** and sign in to GitHub. The title and display options are normally prefilled. **The image is not uploaded automatically:** drag the downloaded PNG into the **像素 PNG** editor and wait for the upload to finish.

![Actual GitHub form showing the artwork-name field and PNG attachment editor](docs/images/issue-image.png)

Attach **one final PNG**, rather than the large original, a WebP, or a screenshot of the game. Use **Preview** to check that the uploaded image is visible. A local file path is not an attachment.

If you open the [submission form directly](https://github.com/JilinJL/PixelWalk/issues/new?template=scenery.yml), also complete the artwork name, phase, scale, and placement yourself.

## 4. Explain the source and submit

Scroll down to **素材来源** (source), read both confirmations, and check them only if you agree and meet their requirements. Select GitHub's **Create** button to submit. The Issue and attachments are public; attribution uses your GitHub account.

![Actual lower form: display options, source editor, both confirmations, and the Create button](docs/images/issue-confirm.png)

Provide enough provenance for a maintainer to assess your permission to submit. Examples:

- **Original:** “Drawn by me. I permit PixelWalk to display and redistribute it with attribution to my GitHub account.”
- **AI-assisted:** Name the tool, describe your edits, and confirm that you checked the applicable usage terms and content before granting attributed display and redistribution.
- **Third-party:** Provide the creator, original URL, license name, and the basis for modification and redistribution rights.

“Found online,” an object's name, or “AI picture” alone is usually insufficient for provenance review. The two confirmations cover public display/redistribution permission and acknowledgment of the content policy. You may write your source explanation in English; preserve the template's field headings.

## 5. When will my creation enter the game?

| Requirement | What a maintainer checks |
| --- | --- |
| Suitable content | Fits quiet pixel exploration and complies with the [content policy](docs/en/content-policy.md), including restrictions on sexual, graphic violent, politically sensitive propaganda, hateful, illegal, private, or malicious material |
| Clear provenance and rights | Identifies the creator, creation method, or license and establishes permission to display and redistribute |
| Suitable appearance | A clear subject, clean transparency, and sensible phase, scale, and placement |
| Valid file and form | One compliant PNG, complete required fields, and both confirmations |
| Maintainer approval | A write / maintain / admin collaborator inspects it and runs `/approve`; ordinary comments or votes do not approve work |
| Successful deployment | A release succeeds, followed by the Issue's `published` label, bot publication comment, and closure |

A valid file does not guarantee acceptance. Maintainers also assess visual fit, provenance, and content risk, and may request changes or clarification.

## 6. Track your submission

**Submitted → awaiting review → approved and queued → deployment → published**

| Issue status | What it means | Your next step |
| --- | --- | --- |
| `pending-review` | Received and awaiting a human reviewer | Wait for feedback |
| `needs-changes` | Revision or clarification required | Edit the original Issue and reply to request another review |
| `approved` | Accepted into the queue | Wait for deployment; it is not yet a publication confirmation |
| `published`, a bot success comment, and a closed Issue | Successful deployment has been acknowledged | Reload the page, then encounter it in the matching day/night pool |

The release workflow checks about every **30 minutes**. GitHub scheduling and deployment may take longer; approval does not mean instant publication. Your artwork participates in scenery selection and is not guaranteed to appear on the first screen. An already open game does not automatically fetch the new catalogue; the restart button alone uses the catalogue already loaded, so reload the page to discover newly published work. Your GitHub account also joins the cabin credits after publication.

Closing an Issue alone neither proves publication nor cancels a queued snapshot; inspect the labels and bot comments together.

## Common questions

**Does editing my Issue update the queued image?** No. Approval stores a snapshot. A queued replacement needs another maintainer approval. If the old version must not publish, ask for rejection first; replacing an attachment or closing the Issue does not revoke it.

**What if the bot says validation failed?** Read the specific reason, check the exported PNG and required form/source details, then ask a maintainer to run `/approve` again on the original Issue. Avoid duplicate submissions.

**Can I appeal or withdraw?** Add provenance or revisions and request another maintainer's review. A maintainer can reject a queued entry; candidate/published work requires the [removal procedure](docs/en/publishing.md).

**Can I approve my own work?** Ordinary submitters cannot. The code has an administrator self-review exception, but another collaborator should review administrator submissions when possible.

## Maintainers and developers

Commands are `/approve` and `/reject reason`. Read [moderation](docs/en/moderation.md) and [publishing](docs/en/publishing.md) for permissions, snapshots, labels, and recovery. Local development commands are on the [home page](README.en.md#run-locally).

Screenshots were captured from the actual game and GitHub form using a built-in example. No demonstration submission was created or approved to illustrate this guide.
