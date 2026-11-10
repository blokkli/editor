# Proxy mode as a pager: follow-ups

A field in proxy mode renders as a pager while editing: a dark band of pages
above the field, and below it the shown block as a real block. With
`proxy-mode="slot"`, the project's slot renders the shown block in its own
layout instead. Both are built (`54af9ea5d`, `8902353e7`, `f4ff66205`); the
commit messages and `docs/define-blokkli/proxy-mode.md` describe them. This file
keeps what was left open.

## Where it stands

- **Components:** `PagerList` (the wrapper: band, then the shown block or the
  slot), `FieldPager` (the band, without state), `PagerList/BlockPage` (a page
  that is its block's element), `PagerList/ShownPage` (the shown block's page, a
  stand-in), `PagerList/SlotItem` (the editor's part of a `<BlokkliItem>` in an
  opted-in slot).
- **Which block a field shows:** the `pager` provider
  (`src/runtime/editor/providers/pager.ts`). It follows the selection, except
  while dragging, and isn't stored across reloads.
- **Where a block is:** the DOM provider answers by question (`getPointerAreas`,
  `getRectInField`, `getDragImageElement`, `getBlockOrder`), so the features
  don't know about pagers. Only the add buttons (`field.isPager`) and the
  `pager` provider do.
- **A page** shows the index, the type's icon and its name
  (`FieldPagerItem = { uuid, bundle, isMuted }`). Pages are 120 × 80 and shrink
  to 72 × 48 (`PAGE_MIN_WIDTH`). The band renders as many as fit at 72px; the
  others are cut off, not rendered.
- **Fixtures:** the sandbox's gallery (slider display) and story (split, images
  and tabs layouts). E2E: `test/e2e-drupal/features/pager/`.

## Follow-ups

### Dots instead of cut-off pages

Pages that don't fit at 72 × 48 are cut off, with no marker (the user,
2026-11-08: a "+12" adds complexity the dots should remove). The band never
scrolls sideways: with 30 blocks, scrolling through thumbnails is no better.

- **What cut off costs today:** a block whose page is cut off has no element
  unless it's shown. No outline, hover, drag, drop slot, comment marker or
  analysis; Tab skips it and the CSV export puts it last. Navigation still
  reaches it (the scroll shows it and waits). If it's the shown block, no page
  is marked; the count says which one it is. The end bar adds past it.
- **Hit targets:** if dots stand in for blocks as pages do, each one is a hit
  target, and every block's rectangle is at least 24 × 24 (`MIN_RECT_SIZE`,
  `helpers/geometry`). 30 dots need about 720px plus the label, which a narrow
  column doesn't have.
- **Two directions:**
  - a window of dots around the shown one, smaller toward the edges (as
    Instagram does);
  - dots as an indicator only, with previous and next buttons.
- **Open:** whether dots are registered stand-ins at all, or the blocks have no
  element in dots mode. To try in the styleguide (`example-proxy-mode`, "Many
  slides").

### The block's real component as its page (`isThumbnail`)

A page shows the type's icon and name. The next step is the real component with
its props, options and nested blocks. No `thumbnail.vue`: a separate file would
be a dead end once pages render the real component.

- **What exists:**
  - The library, template and fragment dialogs render real blocks small:
    `BlockPreviewItem` renders `<BlokkliItem>` in `ScaleToFit`, outside the edit
    state, at the block's `editor.previewWidth`. A block opts out with
    `editor.noPreview`.
  - The prototype's `Thumbnail/` (a 1200 × 800 canvas scaled to its page with
    `onElementResize`) is in `6a0d2f510`.
- **New:** `isThumbnail`, returned by `defineBlokkli`, so a component can skip
  side effects or expensive data fetching. Nothing tells a component today that
  it renders as a preview, not even in those dialogs, so it would cover them
  too.
- **Costs:**
  - Real components (images, data fetching) render in the band, up to about 8 at
    once.
  - Some blocks look wrong at 3:2: a short title is a strip, a tall block is cut
    off.
  - The shown block renders twice.
  - The page's text is what search and the agent find for a block that isn't
    shown (today the type's name), so it gets better, but it's the thumbnail's
    text. The band carries `bk-skip-analyze` and `aria-hidden`; keep both.

### The band's own +

No + in the band (decided 2026-11-08). Adding uses the shown block's tabs, left
and right, and the field's end bar, which shows while the block holding the
field, or a page, is selected and the pointer is over the band. An empty field
gets the dashed area with its knob.

- **How it would work:** a CSS-styled element in the band, with a band renderer
  that draws nothing and claims its clicks (`Renderer` has `onClick` and
  `cursor`, `providers/animation.ts`), sets the cursor and a hover class.
- **What moves:** the checks and the adding (`getFieldTargets`, `activate` in
  `features/selection/AddButtons/index.vue`) move out of the add buttons'
  component, so both use them. The add buttons then skip a pager field's end bar
  and empty area.

### The responsive preview shows the shown block

The preview renders the slot, as the site does, and looks blocks up by
`data-bk-uuid` (`PreviewProvider.vue`), which the slot's children only have in
an opted-in slot while editing. Showing the shown block there would need the
shown index on the site: `shownIndex` is `null` outside the editor.

### A `<BlokkliItem>` in each place

An opted-in slot wraps the shown block's markup in one `<BlokkliItem>` around
all its places. In svv's tabs layout, and the sandbox's (`Story/Tabs.vue`), the
list of titles holds every section's title, so only the content column is the
block; pressing a title selects the story.

- **The idea:** a `<BlokkliItem>` in each place. The first is the block's
  element, the others count as the block, as the shown page does
  (`dom.registerStandIn`).
- **Places would better be named** than taken in document order, as dnd-kit
  names a draggable's activator.
- A second `<BlokkliItem>` for the shown block would then be a second place,
  instead of a warning in development (`SlotItem`).

### A sandbox slider with nested slides

Once the playground goes: a real slider whose slides take a title, a text and an
image.

- Nesting is checked by hand in the playground's slider today (slides take
  `two_columns`, `grid`, `card` and `image`) and unit-tested (`pager.spec.ts`,
  `blockOrder/index.spec.ts`). The story's accordion covers a field nested in
  the shown block, not a pager inside a slide.
- It would test nesting end to end, let visitors try it, and give the dots real
  content.

## Accepted limits

Not planned; listed so they aren't rediscovered.

- **Blocks that aren't shown** aren't analyzed, their anchors aren't listed, and
  search and the agent find only their type's name.
- **Swapping the shown block** re-runs analyze and recomputes the add buttons.
- **In an opted-in slot:**
  - places outside the shown block's `<BlokkliItem>` are decoration: pressing
    them selects the block holding the field;
  - the slot's first node must be an element or a component with one root; a
    warning says so otherwise. Nothing teleported out of it counts as the block;
  - a slider that renders every slide shows them all, but only the shown one is
    a block;
  - children that aren't shown render their nested fields from their props, as
    on the site. While editing, svv's props have no nested children;
  - `editTitle` and analysis read the scene's markup, not the type's component.

## Outside this repository

- **svv's story** (`frontend/app/components/Paragraph/Story/`, on
  2.0.0-alpha.64), where the feedback came from, can opt in with
  `proxy-mode="slot"` and drop its own pager: the selection watcher
  (`useBlokkli(true)`), `EditOverview`, `EditEmpty` and the `story-add` feature.
  An accordion section renders `<BlokkliField name="field_content">` in its
  `<BlokkliItem>` while editing. "Rendering the Shown Block Yourself" in the
  proxy mode docs has the pattern.

## Found on the way

- `ui:update-rects` is declared (`events/index.ts`) and only the directive
  provider listens to it (`providers/directive.ts`); nothing emits it.
  `PagerList` calls `dom.updateVisibleRects()` instead when the shown block
  resizes.
