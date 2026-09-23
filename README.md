# Pixel Flow

Browser-based generator of pixelated light streams, built with WebGL and plain JavaScript. No dependencies or build step.

## Run locally

```sh
python3 -m http.server 4318 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4318 in a browser with WebGL support.

## Controls

- Drag the canvas to move the convergence point.
- Drag the rotation handle to rotate the stream. When the handle is focused, use the arrow keys; hold Shift for larger steps.
- Adjust the palette, background, pixel size, stream width, grain, and glow.
- Play a color wave inside the stationary stream, with adjustable speed, wavelength, and color intensity.
- Choose square, portrait, landscape, or Instagram and Telegram presets.
- Export the current frame as a PNG at the selected dimensions. Video export is not implemented.
- Reuse the variant number and settings to reproduce the initial image. Settings currently reset when the page reloads.

## Files

- `dist/index.html` — interface (Russian labels)
- `dist/style.css` — responsive layout
- `dist/app.js` — WebGL shader, controls, animation, and PNG export

The `dist` directory contains the editable source and can be served by a static web host.

## Dots Grid mode

Use the mode switch above the canvas to open Dots Grid. This mode adapts the original animated dot-grid component from the local `focus-design-system` project (commit `5716bb9`) to WebGL. Square dots retain independent phases and rates of twinkling. Controls adjust dot size, spacing, color, opacity, twinkle intensity, and playback speed. Dot size and spacing use a 900-unit canvas height, keeping the composition consistent between preview and PNG export. Both modes share output formats; mode-specific controls retain their values while switching.
