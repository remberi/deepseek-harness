# Screenshot

Browser plugin for DeepSeek Harness that captures a selected area of the current Web page, annotates it, and saves it as a PNG image.

## Behavior

A camera button appears in the conversation composer tool row, beside the model selector. Clicking it asks the browser to share the current tab and captures one frame.

**Select the area.** A frame-wide overlay shows the captured frame:

- drag anywhere on the frame to outline the area to keep; drag again to replace it;
- **Whole image** clears the drag and keeps the entire frame;
- **Save image** (or Enter) crops the region and opens the annotation editor;
- **Cancel** (or Escape) discards the capture without saving.

Without a drag the whole frame is kept. Drags smaller than 3 CSS pixels are ignored so a stray click keeps the whole image.

**Annotate the crop.** The editor shows the cropped image and three tools:

- **Red pen** draws freehand red strokes;
- **Mosaic** paints pixelated blocks sampled from the original image, so it hides content rather than drawing over it;
- **Eraser** erases annotations (both pen and mosaic) back to the original pixels; it does not remove the screenshot content;
- **Reset edits** appears once something is drawn and clears all annotations.

**Save image** (or Enter) composites the annotations onto the crop, downloads it as `dsh-screenshot-<local timestamp>.png`, and copies the PNG to the clipboard when the browser permits clipboard image writes. **Cancel** (or Escape) discards everything.

The camera button shows a spinner while the sharing picker is open, a selection icon while the overlay is open, a check after saving, and an alert when the browser cannot capture the page. Dismissing the sharing picker leaves no message.

## Requirements

- The Web profile only (`dsh.client.platform` is `web`). Capture uses `navigator.mediaDevices.getDisplayMedia`, so the page must run in a secure context (`http://localhost`, `http://127.0.0.1`, or HTTPS) in a Chromium-based browser.
- The browser asks the user to choose the sharing target on every capture; the current tab is preselected through `preferCurrentTab`.

## Limits

- The capture covers the shared tab's viewport, not the full scroll height, and the selection crops from that frame.
- Annotations are rasterized into the PNG; the plugin keeps no editable project or undo history. The eraser and Reset edits only operate inside the open editor.
- Browsers that lack tab capture fall back to video-track grabbing; older browsers without `ImageCapture` use a hidden video-element path.

## Install and remove

The package is a bundle: `cordis.patch.yml` inserts the `dsh-screenshot` Loader row, and `dsh.client` in `package.json` serves `client.js` to the page.

- Install from this directory with the `plugin_manager` tool (`install_bundle`, absolute path).
- Remove with `plugin_manager` (`remove_bundle`, `@local/dsh-screenshot`).
- Replace the plugin by removing it first and then installing again; a browser module generation is loaded once per installation, so a replaced `client.js` otherwise needs a page reload or Host restart.
