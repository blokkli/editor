# Iframes Overview

The iframes module adds support for embedding **responsive iframes** with height
management per viewport. Editors can set a different iframe height for each
viewport you define, and the embed adjusts its height using container queries.

This solves a common problem with embedded content (maps, videos, third-party
widgets): a fixed height that looks right on desktop is often wrong on mobile.

## Key Capabilities

- **Per-viewport heights** — define viewport presets (e.g. mobile, tablet,
  desktop) and set an iframe height for each.
- **Container-query based** — the embed reacts to the width of its container,
  not just the window, so it works inside any layout.
- **In-editor height editor** — editors set heights through a dedicated UI,
  registered as the `iframe_heights` complex option.
- **`BlokkliIframe` component** — a wrapper around your embed that applies the
  responsive height.

## How It Works

The module registers an `iframe_heights` complex option backed by the
`IframeHeightMap` type. A block opts in by declaring a `json` option with
`dataType: 'iframe_heights'`, which gives editors the height editor. The
`BlokkliIframe` runtime component wraps your `<iframe>` and generates
`@container` query CSS from the height map, applying the right height for the
current container width.

## Next Steps

- [Setup](/modules/iframes/setup) — enable the module, define viewports, and use
  iframes in your blocks
