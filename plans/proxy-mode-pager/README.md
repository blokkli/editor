# Proxy mode as a pager

A field that shows one block at a time (a slider, a tabbed scene, a stepper)
gets a pager while editing. A band above the field shows its blocks as pages,
the editor picks which block the field shows, and that block is edited in place.
It replaces the proxy strip and `proxy.vue`. Planned with the user on
2026-11-08, from user feedback; the band was prototyped in the sandbox's
styleguide (`6a0d2f510`). This is the meta plan: what we want and in which
order. Each step gets its own plan.

## The feedback

For a container that renders one child at a time with `proxy-mode`:

- the proxy strip only shows while something is selected;
- it doesn't show which child the container displays;
- it can't add a child;
- selecting or dropping a child can look as if it replaced the displayed one.

It came from a project with a "story" paragraph (scrollytelling) that takes
"title" and "card" paragraphs. Nothing scrolls while editing, so only the first
slide is visible, and the proxies are an abstract stand-in: whatever the
project's `proxy.vue` renders.

## Use cases

1. **Slider:** one slide at a time, usually with a library like Swiper.
2. **Scene:** for example a block of teasers (title, text, image): a vertical
   tab list of all titles, the current teaser's text on the right, its image as
   the background. Projects pass the slot's `items` to a bespoke component that
   renders the scene from the props, so nothing in it can be edited inline.
3. **Nested:** a slider of slides that take text or image blocks. Today the
   proxies render nested proxy fields, where blocks can be added inside a slide.

## Today

- **The project renders the children** from the slot's `items`
  (`src/runtime/components/BlokkliField.vue:2`), in a non-editing context. They
  aren't registered as blocks (`src/runtime/composables/defineBlokkli.ts:192`),
  but their editable and droppable directives do register, with the child's
  entity context, and clash with those of `proxy.vue`: the last registration
  wins.
- **The editor draws its own strip** (`DraggableList`'s proxy branch),
  absolutely positioned over the field, visible while anything is selected
  anywhere (`src/runtime/editor/components/DraggableList.vue:129-136`).
- **The proxies are the registered blocks,** and the strip's list is the
  registered field. Selection, hover, drag and drop, the add buttons and the
  analyzer all work on them.
- **`proxy.vue`** is collected next to the block's component
  (`src/build/Collector/Blocks.ts:234`), keyed by bundle (`PROXY_COMPONENTS`,
  `src/build/templates/definitions/editComponents.ts`). It gets only the block's
  props: no uuid, no options.
- **Nothing shows the selected child.** `select` and `scrollIntoView` scroll to
  its proxy. The responsive preview looks the block up by `data-bk-uuid`
  (`src/runtime/editor/components/PreviewProvider.vue:225`), which these
  children don't have.
- **The Structure view** (the `proxy_view` feature) renders every field with the
  same proxies.
- **No tests** cover proxy mode. It's used by the sandbox's gallery (its slider
  display; the image has a `proxy.vue`) and the playground's slider (six
  `proxy.vue` files).

## Decisions

- **The editor renders the shown block by default. A project can opt in to
  rendering it itself.** Two steps, below. Sliders and nested sliders need no
  project code; scenes can be exact when a project puts in the work.
- **The band,** as prototyped:
  - **Bar:** dark (mono-900). On the left, the field's label and the shown
    block, like "2 / 6", at most 100px wide: a longer label is cut off, with the
    whole label as its title.
  - **Pages:** light, one per block. They're 120 × 80 (3:2, like the add list's
    help pictures) and shrink to 72 × 48 when they don't fit.
  - **Dots, never scrolling:** when the pages don't fit even at 72 × 48, the
    band shows dots instead, one per block. The band never scrolls sideways:
    with 30 blocks, scrolling through thumbnails is no better (the user,
    2026-11-08). How the dots work is open, below. Until then, pages that don't
    fit are cut off, with no marker (step 1; the user, 2026-11-08).
  - **State:** each page has its index as a pill at the top left: accent on the
    shown page, which is also the only one not dimmed. The selected page gets a
    white outline.
  - **Adding:** no + in the band for now (decision 7, part 2): the field's end
    bar and the shown block's tabs add.
- **No `thumbnail.vue`: a page shows the type's icon and name** (decision 5). A
  separate thumbnail file would be a dead end once pages render the real
  component (the user, 2026-11-08). `proxy.vue` stays, for the Structure view
  only (below).
  - **Follow-up: the block's real component as its page, with `isThumbnail`.**
    It reuses the real component with its props, options and nested blocks. A
    new `isThumbnail` returned by `defineBlokkli` lets a component skip side
    effects or expensive data fetching there.
  - **What exists for that follow-up:**
    - The library, template and fragment dialogs already render real blocks
      small: `BlockPreviewItem` renders `<BlokkliItem>` in `ScaleToFit`, outside
      the edit state, at the block's `editor.previewWidth`
      (`src/runtime/editor/components/BlockPreviewItem/index.vue:22-28, 111-115`).
    - A block opts out with `editor.noPreview`.
    - `defineBlokkli` returns `uuid`, `index`, `options`, `isEditing`,
      `parentType`, `fieldListType`, `siblings`, `rootBlocks`, `provider` and
      `isSelected` (`src/runtime/composables/defineBlokkli.ts:204-215`). Nothing
      tells a component it renders as a preview, not even in those dialogs, so
      `isThumbnail` could cover them too.
    - The prototype's `Thumbnail/` is the scaled 1200 × 800 canvas that this
      needs.
  - **Costs to weigh then:** real components (images, data fetching) render in
    the band, up to about 8 at once. Some blocks look wrong at 3:2: a short
    title is a strip, a tall block is cut off. The shown block renders twice.
- **The band and the field sit in one wrapper** (decision 2). While editing, a
  pager field renders one element: the band, and below it the list holding the
  shown block, which keeps the field's `tag` and classes. The registered field
  element is the band's list of pages (decision 3). `BlokkliField` renders the
  wrapper, so step 2's project content goes in it too.
  - **Why:** the field's element is the project's layout container (the
    gallery's grid, `tag="ul"` lists) or an item of the parent's layout (a
    columns block's two fields are its grid's cells). A band inside the field
    would become one of its items, invalid in a `ul`. A band next to the field
    would take a cell of the parent's grid. A floating band would cover content
    all the time.
  - **New rule:** a class for the field's place in its parent (a grid cell,
    `col-span-2`) goes on the wrapper. In proxy mode, the field's `class`,
    `list-class`, `edit-class` and `tag` do nothing today, neither while editing
    nor on the site (`src/runtime/components/BlokkliField.vue:28-35`), so no
    project relies on them.
- **The pages are the field's children, like today's proxies** (decision 3). The
  band's list of pages is the registered field element. Every page carries
  `data-bk-uuid` and `.bk-field-list-item`. Each page of a block that isn't
  shown is registered as that block's element. The shown block is registered
  with its real element below the band; its page stays in the list for the order
  and the drop slots, unregistered (the editor keeps one element per block,
  `src/runtime/editor/providers/dom.ts:858-865`).
  - **Why:** elements on the page never get clicks in the editor. A full-screen
    canvas takes every pointer event and checks it against the rectangles of the
    registered blocks
    (`src/runtime/editor/components/AnimationCanvas/index.vue:114-151`); only
    renderers can claim clicks first, as the add buttons do. Registered pages
    get selecting, hovering, multi-selecting and dragging for free. Dragging a
    page reorders, since the drop slots come from the field element's children.
    Tab, the CSV export and the field's maximum follow the edit state's order. A
    selected page gets the normal outline, which the renderer turns white on the
    dark band. Every feature already runs on today's proxies, which work the
    same way.
  - **Without an element,** features skip a block silently: no outline, hover,
    drag image, Tab stop, scroll target, comment marker or drop slots; search by
    type only, last in the CSV export, no analysis.
  - **What it costs:**
    - The drop code must use the shown page's own rectangle: that block's
      registered rectangle is the real block below.
    - Each change of the shown block swaps page and real block, which re-runs
      analyze and recomputes the add buttons.
    - For blocks that aren't shown, search and the agent read the page's text
      (the type's name, later the real component's), and comment markers and
      highlights sit on the page.
    - The shown page has no element of its own block. Step 1 registers it as a
      stand-in that the hit tests count as the block (`step-1.md`, "The shown
      page"): at first it selected and dragged the block holding the field.
- **`proxy-mode` becomes the pager** (decision 6). It's the same prop: while
  editing, it renders the band and the shown block instead of the slot and the
  floating strip. It's a breaking change, but for the better (the user,
  2026-11-08), and version 2 is still an alpha (`2.0.0-alpha.74`).
  - **Every project that uses proxy mode gets the pager without code changes.**
    The name still fits: the field is edited through stand-ins, now pages
    instead of proxies.
  - **The code goes:** the per-field strip (`DraggableList`'s proxy branch for
    `proxy-mode`). The Structure view keeps its proxies (`BlockProxy`).
  - **The `relative` wrapper** the docs required for the strip isn't needed any
    more; it does no harm.
  - **Scene projects lose their composition while editing until step 2's
    opt-in.** It wasn't editable before either, but it was visible. The docs and
    the migration skill must say so.
- **`proxy.vue` stays, for the Structure view only** (the user, 2026-11-08).
  Proxy-mode fields no longer render it. It isn't deprecated: no build warning.
  The docs and the add-paragraph-type skill must say where it renders now.

## Step 1: the editor renders the shown block

- **The field:** while editing, a pager field doesn't render the project's slot.
  It renders the band, and below it the shown block the way a normal field
  renders its blocks. The site and the responsive preview keep rendering the
  slot.
- **A real block:** the shown block gets selection, inline editing, live
  options, drop areas, nested fields and the add buttons, as in any field.
  `renderFor` (`parentBundle`) and `edit-class` let a project adapt it to its
  container.
- **The band:** clicking a page shows its block and selects it. Adding uses the
  shown block's tabs, left and right, and the field's end bar (decision 7).
- **Navigation:** a block that isn't shown is shown first when it's selected
  from the structure, search, history, the breadcrumbs, Tab, comments or the
  agent. The same goes for a block inside it. Then the editor scrolls to it.
- **`proxy.vue`:** pager fields no longer render it. The Structure view
  (`BlockProxy`) keeps rendering it, as today.
- **Migration:**
  - The sandbox's gallery and the playground's slider.
  - Docs: `docs/define-blokkli/proxy-mode.md` and
    `docs/components/BlokkliField.md`.
  - The shipped skills: section 8 of `skills/blokkli-add-paragraph-type`, and a
    note in phase 3 of `skills/blokkli-v2-migration`. It should say that
    `proxy.vue` files now only render in the Structure view, that the `relative`
    wrapper isn't needed, and that scene projects lose their composition while
    editing until step 2.
  - The changelog (`src/changelog/`), which is for editors: it describes the
    band, not the API.
  - E2E tests, since none exist yet.

## Step 2: the project renders it (opt-in)

Planned in [`step-2.md`](./step-2.md), from svv's story (the project the
feedback came from). Its decisions, in short:

- **The opt-in:** `proxy-mode="slot"`. The slot then renders while editing,
  below the band, and gets the shown index (`v-slot="{ items, shownIndex }"`).
- **Markup as the shown block:** a `<BlokkliItem>` with a default slot, around
  all the places the block's markup sits in. It provides the block's context and
  registers its element; the directives find it through the element tree. The
  working name here was `<BlokkliEntityContext>`.
- **Only the shown block is a block:** every other child's `<BlokkliItem>`
  renders as on the site, so each child is a block at most once and hidden
  slides stay out.
- **What a layout can't show,** the slot renders as a plain `<BlokkliItem>`,
  with a warning in development when it doesn't.
- **The sandbox gets a story block** to build and test against.
- **Step 1 doesn't change.**

## Open decisions

1. ~~Who renders the shown block while editing~~: decided, above.
2. ~~Where the band sits~~: decided, above (a wrapper).
3. ~~What the editor registers for blocks that aren't shown~~: decided, above
   (the pages, like today's proxies).
4. ~~Showing a block on navigation~~: decided in step 1's plan, A (the user,
   2026-11-08; `step-1.md`, "Navigation"). Deferred at first. The event bus is
   synchronous: `scrollIntoView` runs inside the `emit` right after `select`
   (`src/runtime/editor/events/index.ts:368`), before anything re-renders, and
   does nothing for a block without a rectangle
   (`src/runtime/editor/features/artboard/Renderer.vue:405-428`). With decision
   3, a hidden child's page is registered, so navigating to it already reaches
   the band. What's missing is anything inside a hidden slide: it has no
   element. The pager follows the selection anyway, since page clicks select
   through the canvas.
   - **A** (recommended): the pager shows the child that is selected or contains
     a selected block, found by walking up the state
     (`state.getFieldListForBlock()`). A scroll to a block without an element
     asks its pager to show it, waits until it's registered (bounded), then
     scrolls. Nothing that navigates changes.
   - **B:** an explicit `dom.revealBlock(uuid)` promise, which every place that
     navigates calls first: about a dozen, plus the agent's tools.
   - **C:** only direct children follow the selection; content nested in a
     hidden slide can't be reached.
   - **Either way:** keep the shown block in the editor, as a map from field to
     uuid, so that it survives re-renders and reordering.
5. ~~What a page shows~~: decided, above (the type's icon and name; the real
   component with `isThumbnail` as a follow-up).
6. ~~The API~~: decided, above (`proxy-mode` becomes the pager; `proxy.vue`
   stays for the Structure view). Step 2's opt-in is `proxy-mode="slot"`
   (`step-2.md`, decision 1).
7. **The add buttons in a pager field: the tricky part** (the user, 2026-11-08).
   Below, under smaller questions, until it gets its own section.

**Smaller questions:**

- **This branch's add buttons in a pager field** (decision 7):
  - **Before and after the shown block: left and right, following the band's
    order** (part 1, decided 2026-11-08). The shown block's tabs don't treat the
    pages as neighbours, so the sides come from the field's layout: horizontal
    for the band, so before is left and after is right (`getFlowSides()`,
    `src/runtime/editor/features/selection/AddButtons/geometry.ts:344-358`). The
    pages above it would otherwise count as neighbours "above", putting the tabs
    on its top and bottom edges (314-338, 370-395). This keeps the rule that a
    selected block has before and after tabs, and gives the slide editors' main
    action, adding next to the current slide, in one click.
  - **A selected page gets no add buttons:** selecting it shows its block, and
    with several pages selected there are none (`AddButtons/index.vue:288-317`).
  - **No + in the band** (part 2, decided 2026-11-08). Adding at the end uses
    the existing end bar of the field and the after tab of the last slide. The
    end bar shows while the block holding the field, or the page, is selected
    and the pointer is over the band.
    - **Possible follow-up: the band's own +.** A CSS-styled element in the
      band, with a band renderer that draws nothing and claims its clicks
      (`Renderer` has `onClick` and `cursor`,
      `src/runtime/editor/providers/animation.ts:44-140, 479-507`), sets the
      cursor and a hover class. The checks and the adding (`getFieldTargets`,
      `activate`) would move out of the add buttons' component so that both use
      them, and the add buttons would skip a pager field's end bar and empty
      area.
  - **Defaults for step 1's plan** (follow from parts 1 and 2):
    - **The end bar's side follows the band's layout,** like the tabs: right, at
      the end of the pages. Today its side comes from the last two rendered
      children (`AddButtons/Renderer/index.vue:197-212`), which in a pager field
      can mix the real block below and a page.
    - **An empty pager field still renders and registers its list,** so it gets
      the dashed area with its knob and drop slots. Without a +, that's the only
      way to add the first block. The prototype doesn't render the list when
      it's empty (`FieldPager/index.vue:24`).
    - **A new block is shown as soon as it's selected,** within the render cycle
      after which its editable opens
      (`src/runtime/editor/features/dragging-overlay/index.vue:256-322`). To
      verify while building it.
  - **Clicking the shown page** selected the block holding the field at first:
    the page isn't the block's element. Solved in step 1 with a stand-in, not a
    band renderer (`step-1.md`, "The shown page").
- **The responsive preview:** showing the selected block there too would need
  the shown index on the site.
- **The dots** (deferred by the user, 2026-11-08; to try in the styleguide):
  - If they stand in for blocks the way pages do, each one is a hit target, and
    the editor gives every block's rectangle at least 24 × 24
    (`src/runtime/editor/providers/ui.ts:909-924`). 30 dots then need about
    720px plus the label, which a narrow column doesn't have.
  - Two directions: a window of dots around the shown one, smaller toward the
    edges (as Instagram does); or dots as an indicator only, with previous and
    next buttons to move.
  - Whether dots are registered stand-ins at all, or the blocks have no element
    in dots mode.

## The prototype

- **Where:** `src/runtime/editor/components/FieldPager/` (index, `Page/`,
  `Thumbnail/`, `types.ts`) and the styleguide entry `example-proxy-mode`
  (`sandbox/frontend/blokkli/features/styleguide/examples/ProxyMode/`). It opens
  with `?bkOverlay=styleguide&bkStyleguideItem=example-proxy-mode` on the dev
  site.
- **Variants:** with and without thumbnails, a long label, a gallery, many
  slides, a resizable narrow container, an empty field.
- **Sizing:** CSS flexbox sizes the pages. A thumbnail measures its page
  (`onElementResize`) and scales its 1200 × 800 canvas to it. The fallback is
  sized in `cqw`: the page is a container.
- **Out of date:**
  - The prototype still scrolls at 72 × 48, and keeps the shown page in view.
    Dots replace that.
  - Its "thumbnails" (`FieldPagerItem.thumbnail`, `thumbnailProps`) stand for
    the follow-up's real component; step 1 shows the type's icon and name.
  - Its dashed + at the end of the band: step 1 has none (decision 7, part 2).
