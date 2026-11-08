# Step 1: the editor renders the shown block

The first step of the [meta plan](./README.md). While editing, a field in proxy
mode renders the band and the shown block, as a real block, instead of the
project's slot and the proxy strip. The site and the responsive preview keep
rendering the slot. Planned on 2026-11-08; its decisions are at the end.

## What changes

- **For editors:** a proxy-mode field shows a dark band of pages above one
  block, which they edit like any other block: inline, its options, its nested
  fields, the add buttons. Clicking a page shows its block and selects it.
- **For projects:** nothing to change. The slot only renders on the site and in
  the preview, so a `<BlokkliItem>` in it is fine now. `class` goes on the
  wrapper (the field's place in its parent); `tag`, `list-class`, `edit-class`
  and `non-empty-class` go on the list that holds the shown block. `proxy.vue`
  only renders in the Structure view. The `relative` wrapper isn't needed.
- **Only two uses today:** the sandbox's gallery (display "slider",
  `sandbox/frontend/app/components/Paragraph/Gallery/index.vue:11-21`) and the
  playground's slider. No test covers proxy mode.

## Rendering

- **`BlokkliField`** (`src/runtime/components/BlokkliField.vue`):
  - A setup constant says whether the editor renders the field as a pager:
    `proxyMode` and the condition of the editor's list (`DraggableList` is
    injected, editing, editable, not outside the state; :5). Like the existing
    provides, it's read once.
  - The default slot (:2) doesn't render then. The `after` slot (:53) still
    does.
  - The proxy provides (:294-298) only apply when the slot renders.
    `INJECT_FIELD_PROXY_MODE` goes (below).
  - It passes `class` (the fallthrough attribute) separately from the list's
    classes (`list-class`, `edit-class`, `non-empty-class`), so that the pager
    can put them on different elements. Normal fields keep getting all of them
    merged, as today (:14-19).
- **`DraggableList`** (`src/runtime/editor/components/DraggableList.vue`) has
  three branches:
  - The Structure view (`globalProxyMode`): today's proxy branch, unchanged
    except its CSS, which only needs the static form (:245-252) now.
  - `proxyMode`: renders `PagerList` and passes its props on, with `isMuted`
    (:142-157) as a function prop.
  - Otherwise: the normal list, unchanged.
  - The per-field strip goes: `proxyVisible` (:129-136), `bk-is-visible`, the
    absolute positioning and the opacity (:237-256).
  - It no longer provides `INJECT_FIELD_PROXY_MODE` (:126). Its own field
    registration (:174-191) only runs for its own root; `PagerList` registers
    its page list.
- **`PagerList`** (new, `src/runtime/editor/components/PagerList/index.vue`):
  the wrapper. It's a plain `div` without the `bk` class: it holds the project's
  markup, which the editor's preflight under `.bk` would restyle.
  - It gets `class`.
  - First comes the band (`FieldPager`), then the list of the shown block:
    `<Component :is="tag">` with the list's classes and one `BlokkliItem` (the
    shown block). Its attributes are the same as in `DraggableList`'s normal
    branch (:47-60): `bk-field-list-item`, `data-bk-uuid`, `is-editing`, its
    index in the field, `parent-type`, `data-bk-is-muted`.
  - `DraggableList` above it provides `INJECT_IS_EDITING`. `BlokkliField` no
    longer provides `INJECT_FIELD_USES_PROXY` for a pager, so the shown block
    registers (`defineBlokkli.ts:192-197`).
  - With an empty field, it renders only the band.
- **`FieldPager`** (`src/runtime/editor/components/FieldPager/`) becomes the
  band without state. It takes the label, the items, the shown index and the
  selected index; the parent owns everything else.
  - Each page goes through a scoped slot, `#page`, whose default is a plain
    `Page`. That way the styleguide renders the band without the editor.
  - It exposes its page list element (`defineExpose`) for the field
    registration, as a block exposes `blokkliDraggable` for its own
    (`useBlockRegistration.ts:76-106`).
  - **Gone from the prototype:**
    - the + button (the meta plan's decision 7);
    - the scrolling and `revealShown`;
    - `defineModel` and the `select` emit: clicks reach the canvas, never the
      page;
    - `role`, `tabindex` and the key handlers;
    - `hover:`, `cursor-pointer`: the page gets no pointer events;
    - `Thumbnail/`, `thumbnail` and `thumbnailProps`, which the follow-up can
      bring back from `6a0d2f510`.
  - **New:**
    - the band carries `bk-skip-analyze` and `aria-hidden="true"`;
    - every page carries `data-bk-uuid`, `bk-field-list-item` and
      `data-bk-is-muted`.
  - **`FieldPagerItem`** becomes `{ uuid, bundle, isMuted }`. `bundle` is the
    type the page shows: for a library item, its block's type, as `BlockProxy`
    does (`BlockProxy/index.vue:54-75`).
- **`BlockPage`** (new, `PagerList/BlockPage/index.vue`): a `Page` that
  registers itself as its block's element with `useBlockRegistration`, as
  `BlockProxy` does (:118). `PagerList` puts `BlockPage` in the slot for the
  blocks that aren't shown, and a plain `Page` for the shown one. A page
  switches component when its block is shown or hidden, so the registration
  follows mount and unmount.
- **The band's layout:** one row. Pages are 120 × 80 and shrink to 72 × 48.
  Pages that still don't fit are cut off, with no marker, until the dots
  (decision 2).
  - **Cut off means not rendered.** A page that is cut off but still registered
    would keep its rectangle outside the band, over the content next to it,
    where the canvas would still hover and select it.
  - **How:** the band measures the room next to its label (`onElementResize`)
    and renders as many pages as fit at 72px, from the first. The page list hugs
    them, so the field's rectangle, and its end bar, end after the last page.
  - The count still counts every block.
  - The band never scrolls, so the pages' rectangles stay right.
- **Empty field:** the band shows the label without a count. The page list fills
  the rest of the band, as high as a page, so that the add buttons' dashed area
  and the drop slot are a real target.
- **`INJECT_FIELD_PROXY_MODE` goes** (`src/runtime/helpers/injections.ts:132`).
  Only `BlokkliItem` read it (:75), to render `BlockProxy`; that now depends on
  the Structure view alone (:4, :97-103). `INJECT_FIELD_USES_PROXY` stays, for a
  slot that renders while editing: a field the editor can't edit.

## What the editor registers

- **The field:** the band's page list, with `isPager: true` in the field's data
  (`RegisterFieldData` and `BlokkliFieldElement`,
  `src/runtime/editor/types/field.ts`). `dropAlignment` is `null`: the pages are
  always a row (the gallery sets `horizontal`, which agrees).
- **A block that isn't shown:** its page (`BlockPage`).
- **The shown block:** its real element, through `defineBlokkli`. Its page stays
  in the list, unregistered, for the order and the drop slots.
- **A block whose page is cut off:** nothing, until it's shown. Navigation shows
  it (decision 1).
- **Two fixes in the DOM provider** (`src/runtime/editor/providers/dom.ts`):
  - **`registerBlock` for a uuid that is already registered** calls
    `unregisterBlock` (859-865), which clears `blockUuidCurrentKey` (925). The
    key guard (899-901) then no longer works: if the old owner unregisters after
    the new one registered, it removes the new registration. Fix: set the key
    after that call. Vue unmounts the old owner first (hooks run during the
    patch, mounts after it), but a block whose component loads asynchronously
    registers later.
  - **`registerField` for a key that already has an element** keeps observing
    the old one. When the Structure view is turned off, the structure list's
    element is gone but still observed, and its callbacks would overwrite the
    pager field's rectangle and visibility (428-447). Fix: unobserve it first,
    as `updateFieldElement` does (537-556).

## Which block a field shows

- **A new provider, `pager`** (`src/runtime/editor/providers/pager.ts`, created
  in `EditProvider.vue`, added to `BlokkliApp`). A pager field component would
  lose its state when it re-renders, and navigation (decision 1) has to reach
  any field. It holds, for each field key, the uuid and index it showed last:
  - **`getShown(fieldKey, childUuids)`**:
    - the stored uuid while it's in the field;
    - otherwise the block now at its index (the next one after a delete, clamped
      to the last);
    - otherwise the first.

    An undo brings a deleted block back, and it's shown again.

  - **`show(uuid)`** walks up from the block through the state
    (`blocks.getBlock(uuid).host`, then the host block's host) and stores, for
    every field on the way, the child on the path, whether that field is a pager
    or not. A nested pager inside a slide that isn't shown isn't rendered, so
    nothing can tell that it is one. A normal field just ignores its entry.
  - **Following the selection:** a computed holds the path of the selected
    block, when exactly one is selected. A watcher calls `show()` for it, so
    moving the selected block to another pager field shows it there too. Several
    selected blocks don't change what a field shows.
  - **`getSelectedChild(fieldKey)`** gives the child that is selected or
    contains the selection, computed from all selected blocks, for the white
    outline of the shown page.
  - Nothing is stored across reloads: after a reload, every pager shows its
    first block.

- **Timing:** the watcher runs before the render, so a page click (the canvas
  selects the block, `AnimationCanvas/index.vue:527-534`) swaps page and real
  block in the same render. After adding, the new block is selected and the
  editor waits a render cycle (`dragging-overlay/index.vue:268-272`), by which
  time its editable is mounted. That confirms the meta plan's default.
- **Dragging** an unselected page doesn't select it
  (`AnimationCanvas/index.vue: 292-311`), so reordering doesn't change the shown
  block.

## Places that read blocks from the DOM

The shown block's uuid is on two elements: its page (first in DOM order, inside
the field element) and the real block below the band.

- **Drop slots** (`dragging-overlay/Renderer/index.vue`, `buildChildren`): the
  slots come from the field element's children (the pages), but their positions
  come from `dom.getBlockRect(uuid)` (458, 470, 488): for the shown page, that's
  the real block. Fix: a child's position comes from its block's rectangle only
  when the child is its block's registered element
  (`dom.registeredBlocks.value[uuid] === el`); otherwise it's measured
  (`ui.getAbsoluteElementRect`, as the fallback already does).
- **Tab and the CSV export** collect every `.bk-field-list-item` in DOM order
  (`features/selection/index.vue:71-78`,
  `translations/CsvDialog/Export/index.vue:271-283`). With the shown block
  twice, Tab loops between the band and the block, and never reaches the blocks
  after the field.
  - Fix: a pure helper orders them (`src/runtime/editor/helpers/blockOrder/`,
    unit-tested without a DOM). A uuid that appears again is a block with a
    stand-in earlier in the document (its page): the block and everything inside
    it take the stand-in's place. This repeats for a pager inside the shown
    block.
  - Tab and the export use it through `dom.getBlockOrder()`. Tab's cache
    (`useStateBasedCache`, reset on `state:reloaded`) also resets when
    `dom.settleKey` changes: after a swap, the new block's content is in the
    DOM.
  - Result: A, B, B's blocks, C, the blocks after the field. Tab onto C shows C.
- **The approval highlight**
  (`components/DiffApproval/useApprovalOverrides.ts: 119-121`) takes the first
  `[data-bk-uuid]`: the page. Fix: the registered element first.
- **Analyze:**
  - Page content would be analyzed and attributed to its block through
    `closest('[data-bk-uuid]')` (`analyzers/helpers/Context.ts:131-134`). The
    band's `bk-skip-analyze` prevents that (`helpers/skip.ts:5`).
  - Blocks that aren't shown aren't analyzed; that's accepted (meta plan).
- **The agent's `get_page_text`** clones the whole provider
  (`src/modules/agent/runtime/app/tools/get_page_text/index.ts:69`) and removes
  `[aria-hidden="true"]` (:31-37): with that attribute, the band's labels and
  numbers stay out of the text.
- **Accepted:**
  - For blocks that aren't shown, search and the agent's `search_text` and
    `find_paragraphs` find the page's text: the type's name.
  - The anchors overlay doesn't list their ids.
- **Rectangles after a swap:** nothing updates the position of blocks that move
  without crossing the intersection observer's margin. The ResizeObserver only
  sets sizes (`dom.ts:382-426`), and `ui:update-rects` is never emitted.
  - Swapping the shown block moves everything below the field, and so does its
    component loading late, or an edit.
  - Fix: `PagerList` observes the shown block's list (`onElementResize`) and
    calls `dom.updateVisibleRects()` (726-751) at most once per frame.

## The add buttons

- **Before and after the shown block** (the meta plan's decision 7, part 1):
  when its field `isPager`, the renderer gives no neighbours (`prev` and `next`
  are `null` in `getFrame`). The sides then come from the field's flow: the page
  list is a row, so before is left and after is right (`getFlowSides`,
  `geometry.ts: 344-358`).
- **The field's end bar:** for a pager field, `last` and `secondLast` are
  `null`. The side comes from the flow (right), and the bar's hit band is its
  full 10px (`geometry.ts:531`). The field's rectangle is the page list, so the
  bar and the field's outline and name appear over the band.
- **An empty pager field** gets the dashed area and its knob over the empty page
  list.
- **No other change:** a selected page shows its block (it's selected alone),
  and with several selected there are no buttons.

## Where a block is (decided: B, the user, 2026-11-08)

The block that a field in proxy mode shows is in two places: its page in the
band, and the real block below. Every feature that uses block positions has to
pick one. Found while testing (the user): pressing the shown page selected and
dragged the gallery, Shift+Click selected every page, a selection rectangle
ignored the shown page.

- **The DOM provider answers by question**, and the features ask it instead of
  knowing about pagers:
  - **`getPointerAreas()`**: where the pointer finds blocks. Every visible
    block's element, plus the shown page standing in for its block
    (`dom.registerStandIn`, `PagerList/ShownPage`). Used by the canvas's hit
    test (clicks, Ctrl/Shift+Click, drags, the context menu), the hover outline
    and the selection rectangle.
  - **`getRectInField(uuid)`**: where a block is among its siblings. The page
    for the shown block, else its own rectangle. Used by the drop slots,
    Shift+Click's range and the actions bar (which keeps clear of the block and
    its place in the field).
  - **`getDragImageElement()`**: what a dragged block shows. Its page, also when
    it's grabbed below the band: its drop slots are in the band.
  - **`getBlockOrder()`**: the order for Tab and the CSV export.
- **Audit:** all 24 places that use a block's position or element were checked.
  The ones above compare blocks with each other; the rest ask about one block's
  own element (outline, highlights, analyze, search, option popups, the agent's
  text), where the real block is right. No keyboard navigation picks blocks by
  position.
- **Still knows about pagers:** the add buttons (the pages above the shown block
  aren't its neighbours, a property of the field's layout), and the `pager`
  provider.
- **No swap mid-drag:** starting a drag selects the dragged blocks, and the
  pager would show the dragged block below the band while dragging. The `pager`
  provider doesn't follow the selection while dragging; once the drag ends, the
  selected block is shown.
- **Rejected alternatives:**
  - keeping the per-feature fixes, with only tests;
  - the page as every block's element (the editing side would get the special
    cases);
  - the band as a canvas renderer (it would re-implement selection, dragging and
    drop slots).

## The actions bar

Found while testing (the user, 2026-11-08): the selected block's actions bar
sits above the block, which for the shown block is where the band is, so it
covered the pages. The toolbar's anchor (`useStickyToolbar`) is now the shown
block together with its band (the field's rectangle), so the bar goes above the
band.

## Navigation (decision 1)

- **Facts:** every place that navigates selects first and then emits
  `scrollIntoView` in the same tick:
  - the structure sidebar, search, history, the breadcrumbs, Tab, publish
    violations, duplicate, delete, "select parent", comments, and the agent's
    tools;
  - the agent's tools use `scrollSelectionIntoView`;
  - some only scroll: diff approval, the agent's text rewrite and links.

  A block without a rectangle doesn't scroll (`artboard/Renderer.vue:405-411`,
  470-521).

- **Direct children of a pager** already work: their page is registered, so the
  view scrolls to the band, and following the selection shows the block.
- **Blocks inside a slide that isn't shown** have no element: nothing scrolls to
  them, and nothing shows the slide except following the selection.
- **Decided: A** (the user, 2026-11-08). A scroll to a block without a rectangle
  calls `pager.show(uuid)`, waits until it's registered (a watch on
  `dom.registeredBlocks`, at most a second), measures it and scrolls. It goes
  into both handlers in `artboard/Renderer.vue` and covers every place,
  including the ones that only scroll.

## What goes

- `DraggableList`'s per-field strip and its CSS.
- `INJECT_FIELD_PROXY_MODE`.
- The prototype's +, scrolling, thumbnails and click handling (above).
- In the sandbox's slider, the code for editing that no longer runs:
  `is-editing` and the buttons' `pointer-events-none` (`Gallery/Slider.vue:25`).
  The slider only renders on the site now.

## Migration

- **Sandbox:**
  - The gallery drops its `relative` wrapper. It does no harm, but the sandbox
    shows how it's done.
  - The lakeside pool's alt-less `jetty-view` becomes the gallery's first image
    (`sandbox/drupal/content/nodes/lakeside-pool.yml:40-60`, and its comment at
    1-3). The welcome task "Find the mistakes" relies on Analyze finding it
    (`sandbox/frontend/app/utils/welcomeTexts.ts:51`), and as the third slide it
    would be a page that isn't analyzed.
- **Playground:** nothing to change. Its slider renders `<BlokkliItem>` in the
  slot, which is fine now. It's the manual test for nesting: its slides take
  `two_columns`, `grid`, `card` and `image`.
- **Styleguide**
  (`sandbox/frontend/blokkli/features/styleguide/examples/ ProxyMode/`):
  - Drop the thumbnail variants.
  - "Many slides" is cut off now.
  - The empty variant has no +.
  - The text at `index.ts:73` still promises `thumbnail.vue`.
- **Docs:**
  - `docs/define-blokkli/proxy-mode.md` is rewritten: the band, the shown block,
    what the slot is for now, `class` on the wrapper, `proxy.vue` in the
    Structure view only. Its two screenshots (:10, :91) are out of date.
  - `docs/components/BlokkliField.md:131-145` and the prop's JSDoc
    (`BlokkliField.vue:159-168`) lose the `relative` wrapper.
  - `docs/components/BlokkliItem.md` and `docs/define-blokkli/editor.md:378-396`
    get checked for "proxy".
- **Skills:**
  - Section 8 of `skills/blokkli-add-paragraph-type/SKILL.md` (:420-440): the
    band instead of the list; no `relative` wrapper; `proxy.vue` for the
    Structure view; `<BlokkliItem>` in the slot is allowed. It keeps the rules
    on `v-if`/`v-else` (the prop is read once) and on paragraph fields only.
  - A note in phase 3 of `skills/blokkli-v2-migration`
    (`phases/3-components.md`): `proxy.vue` renders only in the Structure view,
    the wrapper isn't needed, and a scene loses its composition while editing
    until step 2.
- **Changelog:** a new feature in the unreleased version (`2.0.0-alpha.74`,
  still untagged; the changelog skill), EN and DE, for editors: the band, not
  the API.

## Tests

- **Unit:**
  - `providers/pager.spec.ts`:
    - the fallbacks of `getShown`;
    - the walk up, nested and across fields;
    - several selected blocks change nothing;
    - a move of the selected block;
    - `getSelectedChild`.
  - `helpers/blockOrder/index.spec.ts`:
    - no stand-ins;
    - a stand-in, with and without content;
    - a pager inside the shown block;
    - stand-ins at the start and the end.
- **E2E fixture:** a new node, `test/e2e-drupal/content/nodes/pager.yml`, with a
  title, two galleries (slider) and a text after them. Images have keys and
  reuse the media `lake` and `hills`.
  - The first gallery has three images.
  - The second has 20, so that some are cut off at the test's viewport.
- **E2E spec:** `test/e2e-drupal/features/pager/pager.test.ts`, on one page:
  1. While editing, the first band has three pages and the first one is shown.
     The first image is registered with its real element; the others with their
     pages.
  2. A real click on the second page selects it and shows it, and the first page
     is registered again.
  3. Tab goes from the first image to the second (shown), on to the third, and
     from the third to the next block.
  4. Dragging the third page before the first with the pointer moves it to the
     start. This tests the drop slots' positions. The band is centred first:
     dragging near an edge scrolls the page.
  5. A copy of the shown image ("Duplicate") is shown, as a block is once it's
     selected after adding. An image needs a media, so the add button opens
     Drupal's form, and adding one without a media is refused.
  6. Deleting the shown image shows the one that took its place.
  7. Selecting a hidden image of the first gallery from the structure sidebar
     shows it.
  8. The second band renders fewer pages than it has images, and Tab skips the
     ones that are cut off.
  9. Selecting an image that is cut off from the structure sidebar shows it and
     scrolls to it. This is navigation's reveal and wait (decision 1).
  10. The Structure view shows the galleries' proxies and no band.

  Changes are discarded with `revertAllChanges` in `afterEach`.

- **Nesting** (decision 3): no E2E test. It's checked by hand in the
  playground's slider, whose slides take `two_columns`, `grid`, `card` and
  `image`.

## Order of work

1. The `pager` provider and its spec, test first.
2. `blockOrder` and its spec; Tab and the CSV export use it.
3. The DOM provider: the two fixes, `isPager`, `getBlockOrder()`.
4. `BlokkliField`, `DraggableList` and `BlokkliItem`; remove
   `INJECT_FIELD_PROXY_MODE`.
5. `PagerList`, `BlockPage`, `FieldPager` and `Page`; the band's layout.
6. The drop slots, the add buttons, the approval highlight, the swap's
   rectangles.
7. Navigation.
8. The styleguide, the sandbox's gallery and content, docs, skills, changelog.
9. The E2E fixture and spec.

## Files

- **New:**
  - `src/runtime/editor/providers/pager.ts` and its spec
  - `src/runtime/editor/helpers/blockOrder/index.ts` and its spec
  - `src/runtime/editor/components/PagerList/index.vue` and
    `BlockPage/index.vue`
  - `test/e2e-drupal/content/nodes/pager.yml`
  - `test/e2e-drupal/features/pager/pager.test.ts`
- **Changed:**
  - runtime: `BlokkliField.vue`, `BlokkliItem.vue`, `helpers/injections.ts`
  - editor components: `DraggableList.vue`, `EditProvider.vue`, `FieldPager/`
    (index, `Page/`, `types.ts`; `Thumbnail/` goes)
  - editor providers and types: `dom.ts`, `fields.ts`, `types/field.ts`,
    `types/app.ts`
  - editor features: `selection/index.vue`, `translations/CsvDialog/Export/`,
    `dragging-overlay/Renderer/index.vue`, `selection/AddButtons/Renderer/`,
    `artboard/Renderer.vue`
  - `components/DiffApproval/useApprovalOverrides.ts`
  - sandbox: `Paragraph/Gallery/`, `lakeside-pool.yml`, the styleguide example
  - docs, the two skills, `src/changelog/2.0.0-alpha.74/`

## Verification

- `bun run verify`. On a failure, read `tmp/verify-output/<timestamp>.txt`.
- `bun run test:e2e-drupal test/e2e-drupal/features/pager`, then the specs that
  touch what changed: `features/selection` (Tab, the add buttons), and the CSV
  export and drag-and-drop specs. No full suite.
- **By the user, in the sandbox:**
  - the lakeside pool page as Anna Keller;
  - the playground's slider for nesting;
  - the 2D fallback (Debug → Rendering mode);
  - zoom down to 40%.

## Known limits

- Blocks that aren't shown: no analysis; search and the agent find only their
  type's name; their anchors aren't listed.
- The responsive preview shows what the site shows, not the shown block (meta
  plan).
- Swapping the shown block re-runs analyze and recomputes the add buttons.
- **Until the dots, blocks whose page is cut off have no element unless they're
  shown.**
  - They get no outline, hover, drag, drop slot, comment marker or analysis.
  - Tab skips them, and the CSV export puts them last.
  - Navigation still reaches them (decision 1).
  - If the shown block is one of them, no page is marked; the count says which
    one it is.
  - The end bar adds at the end of the field, past them. A drop after the last
    page that is visible inserts right there.

## Found on the way (not part of step 1)

- The ResizeObserver callback in `dom.ts` (382-426) uses `return` instead of
  `continue`, so a batch stops at the first block it measures for the first
  time. That first measurement takes `x` and `y` from `contentRect`, about 0. A
  plain `continue` would give more blocks that wrong position until the
  intersection observer corrects it, so it needs its own fix.
- `ui:update-rects` is declared (`events/index.ts:342`) and only the directive
  provider listens to it; nothing emits it.

## Decisions

1. ~~Navigation~~ (the meta plan's decision 4): decided, A (the user,
   2026-11-08). The options were:
   - **A:** the scroll reveals and waits;
   - **B:** an explicit `revealBlock()` at every place that navigates;
   - **C:** following the selection without a change to scrolling;
   - **D:** direct children only.
2. ~~Pages that don't fit at 72 × 48 before there are dots~~: decided, they're
   cut off, with no marker (the user, 2026-11-08). The dots were meant to reduce
   complexity, and a "+12" marker would add more. The options were:
   - wrapping into rows;
   - building the dots now;
   - cutting them off, with or without a marker.
3. ~~Testing nesting end to end~~: decided, no nested E2E test in step 1 (the
   user, 2026-11-08). Nesting adds no new code path. Its logic is unit-tested,
   and since pages that don't fit are cut off, the flat second gallery already
   tests navigation's reveal and wait. The options were:
   - a test-only container type;
   - a real sandbox slider;
   - none.

   **Possible follow-up, once the playground goes:** a real sandbox slider whose
   slides take a title, a text and an image. It tests nesting, lets visitors try
   it, and gives the dots real content.
