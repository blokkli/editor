---
date: '2026-04-20'
---

### New Features

#### Edit media fields directly

Media fields (images, videos, etc.) on blocks and on the page itself can now be
edited directly in the editor. New media can be added from the media library,
individual entries can be removed or reordered by drag & drop. Media can also be
dragged out of a media field into the page to create a new block from it.

### Improvements

#### Edit a block directly with the Ctrl key

Holding the Ctrl key (or Cmd on macOS) while double-clicking a block skips the
underlying media or text field, so the block itself can be edited.

#### Revised import dialog

The dialog for importing existing content has been revised. Content can now be
found through an improved search. If there is only one importable field, the
field selection is hidden. On empty pages, the import dialog no longer opens
automatically, but it can still be opened manually. The previous behavior can be
re-enabled in the settings.

#### Further improvements

- The editor now loads significantly faster. Rarely used parts of the editor are
  only loaded when needed.
- When the editor is loading, space is reserved so the content below no longer
  jumps while the editor is loading.

### Fixes

- Detached sidebar panels could end up outside the visible area in certain
  situations and were no longer reachable. Positions are now constrained to the
  visible area.
- The icons in the responsive preview were not displayed correctly.
- The preview of fragment blocks in the selection list is displayed correctly
  again.
