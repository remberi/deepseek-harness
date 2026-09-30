---
description: "Whale-girl 2D companion for the dsh web client: a draggable character in the shell overlay plus a Settings page that shows or hides her, selects how she reacts to the pointer, and uploads custom artwork."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-companion

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-companion` adds the **Whale girl**, a virtual 2D character who floats over the Web GUI and can be dragged anywhere on the page. The **Virtual character** Settings page carries the switch that shows or hides her, a selector for how she reacts to the pointer (click to talk, wave on hover, follow the pointer, or quiet company), an upload that replaces her artwork with a local image, and a button that returns her to the corner. The switch and selector live in the `ui-companion` settings namespace, which the local provider persists in `$DSH_HOME/cordis.patch.yml` by default; the artwork and dragged position stay in the browser's localStorage. She stays hidden until a user turns her on. The built-in character is a PNG inlined as a data URL with CSS motion; there is no third-party runtime.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Open Settings and select **Virtual character**. Mount `@deepseek-ai/dsh-client-ui-companion` in a Web composition that already provides the settings shell and the `shell.overlay` seat of the app frame; the page registers its own navigation entry and needs no configuration.

### Showing the character

The **Show the whale girl** switch writes `enabled`. While it is on, the character renders over the app frame, starting above the bottom-right corner, outside every panel; the overlay layer stays click-through everywhere except the character herself, so she never blocks the composer or a sidebar. Turning the switch off removes her immediately, and the same value is read on the next page load.

### Choosing how she reacts

The **Interaction** selector writes `interaction` and is locked while she is hidden. `click` renders her as a button: each click shows the next line in a speech bubble for three seconds, including asides about agent development. `hover` waves and greets while the pointer rests on her, then settles when it leaves. `follow` leans her toward the pointer anywhere on the page. `none` keeps her idle. The page previews the current pose under the rows so a choice is visible before she is shown. Every line and label follows the Web GUI language.

### Moving her

Press the character and drag: once the pointer travels more than 4 px she follows it, stays fully inside the viewport, and a release that ends a drag is not counted as a click. The release point is saved in this browser and restored on the next load; **Back to the bottom-right corner** on the Settings page forgets it. The button is disabled while she is already in the default corner.

### Custom artwork

**Upload image** accepts a PNG, JPEG, WebP, GIF, or SVG file up to 1 MB and shows it in place of the built-in picture at the same width, both on the page and in the Settings preview; the page reports an unsupported format, an oversized file, or a read failure under the row. A custom picture keeps the idle bob, hover wiggle, and follow lean. **Restore default artwork** returns to the built-in picture. The image is stored as a data URL in this browser's localStorage and is not shared across browsers or devices.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The Host half publishes the `ui-companion` entry through its `Config` schema and keeps that fiber off generated settings pages. The browser half reads the same entry through `ctx.configForms`, wraps it in `CompanionPolicy`, and contributes two slot entries that share the policy's two snapshot stores through their `hooks` compartments: the `settings.section` page with id `companion` (order 22) and the `shell.overlay` entry with id `companion`.

### Preference flow

`CompanionPolicy` seeds `{ enabled: false, interaction: 'click' }`, adopts each accepted Host section without writing it back, and on a user choice publishes the store first and then calls `host.set()` for that one field, so the overlay reacts in the same tick while the write settles. A rejected write is recovered by the form, whose reload arrives as a new section the policy adopts. Non-loopback pages keep both values process-local through the form's memory mode.

### Browser-local state

`companion-local.ts` keeps the artwork data URL and the dragged position under the localStorage key `dsh.ui-companion.local.v1`. The stored envelope is validated with schemastery on read (string artwork at most 1 MiB, numeric `right`/`bottom` offsets, or null); an invalid or unparsable entry is removed and the defaults apply. `CompanionPolicy.local` seeds from that read and `setArtwork`/`setPosition` write the whole state back once per change. A missing or throwing storage disables persistence without failing the store.

### Character, reactions, and dragging

`CompanionArtwork` always renders an `<img>`: the built-in PNG data URL, or the user's upload at the same width; a wrapper transform leans it in follow mode, and CSS classes wiggle it on hover and bounce it while talking. `CompanionOverlay` owns the pose. It returns null while `enabled` is false, resets its pose whenever the mode changes, installs a window `pointermove` listener only in `follow` mode, and converts the pointer position into a clamped lean with `eyeOffsetToward` and `poseTransform`. The dock's `right`/`bottom` offsets come from the drag in progress, else the saved position, else `DEFAULT_POSITION`. Pointer handlers on the character track one pointer id from `pointerdown`; movement past `DRAG_THRESHOLD_PX` captures the pointer, clears the bubble, and clamps the dock with `clampPosition` against the character's box and the viewport; `pointerup` persists the clamped offsets and sets a flag that swallows the click the browser fires after the release. Motion lives in CSS keyframes and honors `prefers-reduced-motion`.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Host plugin: registers the `ui-companion` settings namespace |
| [`src/companion-settings.ts`](src/companion-settings.ts) | Namespace, fields, reaction modes, defaults, and the shared schema |
| [`src/client/index.ts`](src/client/index.ts) | Browser plugin: dictionaries, the policy, the page and overlay registrations |
| [`src/client/companion-policy.ts`](src/client/companion-policy.ts) | Host-backed settings store plus the browser-local artwork and position store |
| [`src/client/companion-local.ts`](src/client/companion-local.ts) | localStorage envelope, validation, and viewport clamping |
| [`src/client/CompanionSection.tsx`](src/client/CompanionSection.tsx) | Settings page: switch, reaction selector, artwork upload, position reset, still preview |
| [`src/client/CompanionOverlay.tsx`](src/client/CompanionOverlay.tsx) | Floating draggable character with speech bubble and reaction handlers |
| [`src/client/CompanionArtwork.tsx`](src/client/CompanionArtwork.tsx) | Built-in or uploaded image at one width |
| [`src/client/default-artwork.ts`](src/client/default-artwork.ts) | Built-in PNG inlined as a data URL |
| [`src/client/eye-offset.ts`](src/client/eye-offset.ts) | Pointer-to-pose geometry |
| [`src/client/locales.ts`](src/client/locales.ts) | Chinese and English dictionaries, including her lines |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These pages cover the settings surface that hosts the page, the overlay seat the character occupies, and the persistence behind both values.

- [ui-settings](../ui-settings/README.md) — the domain base declaring `settings.section` and the namespace scope service.
- [ui-settings-general](../ui-settings-general/README.md) — the Settings shell that renders the navigation and mounts the section.
- [ui-layout](../ui-layout/README.md) — the app frame that declares the click-through `shell.overlay` seat.
- [Settings](../../settings/settings/README.md) — the Host settings service and provider that persist the namespace.
- [Cookbook: adding a settings card](../../../docs/cookbook/adding-a-settings-card.md) — the two-half packaging this plugin follows.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-side UI plugin layer that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define what the character can do today; they are current package constraints.

- **Position and artwork are per browser** — both live in localStorage, so another browser or device starts in the default corner with the built-in picture; a position saved for a large window is clamped back into view on a smaller one only after the next drag.
- **No resizing** — she renders at a fixed 152 px width in the overlay (128 px in the Settings preview); a setting for her size is not provided, and a custom image is scaled to that width.
- **Fixed lines** — her speech is a static per-language list cycled in order, including agent-development asides; she reads nothing from the Session, so her lines never reflect what the agent is doing.
- **Still artwork** — motion is an idle bob, a hover wiggle, a talk bounce, and a follow lean; there is no Live2D or sprite animation.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The Settings shell maps the section id `companion` to its person glyph in `ui-settings-general`'s `navIcon`; renaming the id falls back to the gear.

</details>

**Runtime invariant:** No companion is published. The plugin's only cross-plugin relation is the settings namespace it registers and binds, which the settings service already validates; its two slot entries read stores it owns.
