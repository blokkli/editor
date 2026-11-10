# Step 2: the project renders the shown block (opt-in)

The second step of the [meta plan](./README.md). A field in proxy mode can opt
in: while editing, its own slot renders below the band, and the markup the slot
ties to the shown block is that block, with selection, inline editing and its
nested fields. Planned on 2026-11-08 from the project that ran into the problem
(svv, below), and checked against the code (Vue 3.5.38) by a plan agent the same
day; its corrections are in the text. The decisions are at the end.

## What changes

- **For editors:** a scene looks as it does on the site while editing: the band
  above it, the shown block in the scene's layout, edited in place.
- **For projects:** a field opts in with `proxy-mode="slot"` (decision 1). The
  slot gets the shown block's index. Markup the slot wraps in a keyed
  `<BlokkliItem>` is that block (decision 2). What the slot can't show, it
  renders as a plain `<BlokkliItem>`, as step 1 does (decision 4).
- **Step 1 doesn't change.** A field that doesn't opt in renders as now: the
  band and the shown block, rendered by the editor.

## The cases

### svv's story: the main case

`frontend/app/components/Paragraph/Story/` in svv, on `@blokkli/editor`
2.0.0-alpha.64: a scrollytelling block whose `field_paragraphs` is in proxy
mode.

- **The scene:** the slot passes `items` to `Renderer.vue`. `mapper.ts` turns
  each child into plain data (a "slide"), and the `storyType` option picks one
  of three layouts:
  - **split** (`RendererSplitTwo`): each slide's visual on the left (its image,
    a big number, a quote's portrait), its text on the right;
  - **tabs** (`RendererAccordeon`): every slide's title in a list on the left,
    the content on the right;
  - **images** (`RendererImage`).
- **While editing,** each renderer drops the scroll animation for a static
  `h-screen` layout and renders only the selected slide, or the first.
  `index.vue` finds it by watching `app.selection.uuids` against
  `app.state.getMutatedField(...)` (`useBlokkli(true)`): step 1's pager, built
  on internal APIs.
- **Built for the editor** (SVV-350, SVV-351), all replaced by step 1:
  - `EditOverview.vue`: numbered pills over the scene, the shown slide
    highlighted, and how many children the layout can't show (the band);
  - `EditEmpty.vue`: a placeholder for an empty story (the empty field's area);
  - `blokkli/features/story-add`: a labelled toolbar button that adds sections
    (the add tabs and the end bar).
- **Nothing is editable inline.** Titles and texts are mapped data, rendered
  with `v-html`. The nested fields (an accordion section's `field_content`, an
  image section's `field_paragraph`) are read from the editor's state while
  editing, since the props don't have them then (`mapper.ts`,
  `resolveChildren`).
- **Layouts leave children out:** tabs shows only accordions, text/image
  sections, quotes with a name and charts with a title; images only shows
  images.
- **With step 1,** the story isn't rendered while editing: the shown section
  renders below the band as its standalone paragraph (TextImage, Number…).

### The simpler cases

- **svv's Random** renders every child with `<BlokkliItem v-for v-show>`, fixed
  to the first while editing. With step 2, it shows the shown index.
- **svv's Carousel** feeds `items` to a slider component, without pointer events
  while editing. **TeaserList** ("stack", "slider") has components of its own.
- **The sandbox's gallery** (`Gallery/Slider.vue`) renders mapped data
  (`MediaImage` and a caption), like svv's carousel. No sandbox block is a scene
  (decision 5).

## The opt-in (decided: A, the user, 2026-11-08)

- **`proxy-mode="slot"`:** the slot renders the shown block while editing.
  `proxy-mode` alone stays step 1: the editor renders it.
- **The type is `boolean | 'slot'`, in this order.** The compiler turns it into
  `[Boolean, String]`, and with Boolean first, Vue casts a bare `proxy-mode` to
  `true`; `'slot' | boolean` would make it `''`. `DraggableList`'s prop gets the
  same type.
- **Read once,** like `proxy-mode` (`BlokkliField.vue:167-168`).

## What the slot gets

- **`items`:** the edit state's list with the live options, as now
  (`BlokkliField.vue:277-299`). In an opted-in slot, also the live props
  (`state.mutatedItemProps`), which `BlokkliItem` gives a block's component
  (`BlokkliItem.vue:81-93`). Inline edits of a field that the type maps to a
  prop write there too (`useEditableFieldOverride.ts`), so a scene shows a field
  while it's edited. `PagerList` merges them; `filteredList`, which also feeds
  the siblings, the root blocks and the editor's lists, stays as it is.
- **`shownIndex`:** the index of the shown block in `items`, from the pager
  (`pager.getShown`, as `PagerList` gets it, `PagerList/index.vue:80-87`), and
  `null` when the field is empty. `BlokkliField`'s own slot passes `null`: on
  the site, in the preview, for fields the user can't edit and in library items.

## Rendering

- **The slot goes below the band.** `BlokkliField` forwards its default slot to
  the editor's list (`DraggableList`, `DraggableList.vue:34-44`), which forwards
  it to `PagerList`. `PagerList` renders it in the wrapper, below the band,
  instead of the shown block (`PagerList/index.vue:13-27`). `defineSlots` types
  `shownIndex` the whole way; Vue keeps the forwarded slot stable, so it causes
  no extra renders.
- **No list element around it:** the slot renders what it renders on the site.
  `tag`, `list-class`, `edit-class` and `non-empty-class` do nothing for an
  opted-in field, as on the site; `class` goes on the wrapper, as in step 1.
- **The slot renders inside the editor.** `BlokkliField` doesn't provide "not
  editing" and "uses proxies" to it, since it renders the pager
  (`BlokkliField.vue:314-318`), so the shown block's nested fields render as
  editor lists.
- **The rectangles:** `PagerList` refreshes them when the list of the shown
  block changes size (`PagerList/index.vue:135-146`). With the slot, it watches
  the wrapper.
- **As in step 1:** the band, the add buttons and the end bar, navigation, the
  Structure view. Navigation waits until the shown block is registered
  (`whenRendered`, `artboard/Renderer.vue:411`), which the slot's
  `<BlokkliItem>` does.

## Markup as the shown block (decided: A, the user, 2026-11-08)

**One keyed `<BlokkliItem>` with a default slot per block, around all its
places:**

- **Without a slot,** it renders the type's component, as today. **With one,**
  it renders the slot instead: the project's markup is that block.
- **Around all its places:** markup that sits in more than one place is wrapped
  in an element that holds only that block's parts. In svv's split and images
  layouts, that's the scene's grid, which holds only the shown section while
  editing.
- **Keyed by the block's uuid:** a `<BlokkliItem>` resolves its component and
  its context when it's set up (`BlokkliItem.vue:95-109, 129-134`). Reused for
  another block, it would keep both.
- **Its context, as now:** `<BlokkliEditable>` and `<BlokkliField>` inside it
  address the block's fields. A `<BlokkliField>` inside it is the block's nested
  field, an editor list while editing.
- **An inner component does the editor's part.** In an opted-in slot,
  `BlokkliItem` renders a component that `PagerList` provides, as `EditProvider`
  provides `DraggableList`, so that the site's bundle gets no editor code. It's
  keyed by the block's uuid and its mode (below). Its render function calls the
  slot itself and adds to the first element it renders:
  - `bk-field-list-item`: `getBlockOrder()` collects these (`dom.ts`; Tab and
    the CSV export). Without it, the blocks nested in the scene would come after
    the last page;
  - `data-bk-uuid` and `data-bk-is-muted`, as the editor's lists set them;
  - `data-bk-slot-item`, for the directives (below).

  It adds them while rendering, because the directives mount before the
  component does. It calls the slot function directly: through `<slot>`, Vue
  tracks the slot's dynamic children, and a cloned vnode would break the next
  update. It skips comments and text, goes into fragments, and builds new arrays
  rather than changing the slot's. A component as the first node gets the
  attributes through fallthrough; one with several roots or with
  `inheritAttrs: false` gets a warning in development.

- **Its element:** while editing, the inner component registers that first
  element (`useBlockRegistration`, `useBlockRegistration.ts:62`, as `BlockPage`
  does). A plain `<BlokkliItem>` is registered by its type's component, as
  everywhere.
- **The directives** read the context of the component whose template they're in
  (`blokkliDirectives.ts:34-53`). In a scene, that's the scene's component,
  whose context is the block that holds the field. So:
  - they find the closest `[data-bk-slot-item]` element;
  - if their own context is the entity that holds that item's field, the markup
    is the scene's: they use the item, or skip themselves when the item isn't
    the shown block;
  - otherwise, as today: the component's context, then the provider's element
    (`blokkliDirectives.ts:12-31`).

  Looking for the closest item first wouldn't do: the blocks nested in the scene
  sit inside its element, and their own context is right. Unregistering uses the
  entity stored when the directive mounted, not a new lookup.

- **On the site,** it renders the slot with its context and registers nothing:
  the same template serves both. `index` and `parentType` are what the project
  passes, else what the field passes to the blocks it renders itself (decision
  6), on the site as while editing.

## Only the shown block is a block

- **`PagerList` provides the field's children and the shown block** to the slot.
  A `<BlokkliItem>` checks that its uuid is one of the field's children: the
  blocks of fields nested in the scene inherit the injection.
- **In an opted-in slot, the shown block's `<BlokkliItem>` is a real block:**
  registered, with the live props, its nested fields as editor lists.
- **Any other child's `<BlokkliItem>` renders as on the site:** not registered,
  nothing in it editable. The inner component provides "outside the state",
  which `<BlokkliEditable>` and the directives check (as for
  `BlockPreviewItem`), and "not editing" and "uses proxies", which
  `FromLibrary`'s inner block checks. Its first element gets `data-bk-slot-item`
  too, so that the scene's directives inside it skip themselves. Its page goes
  on standing in for it.
- **Switching:** when the shown block changes, a mounted `<BlokkliItem>` (svv's
  Random keeps every child mounted, hidden with `v-show`) remounts its content
  as the block or as on the site: the inner component is keyed by the mode too,
  since provides and `defineBlokkli`'s registration are set at setup
  (`defineBlokkli.ts:104, 186-198`).
- **Fragments:** `defineBlokkliFragment` registers wherever it is
  (`defineBlokkliFragment.ts:36-40`). It gets the check `defineBlokkli` has (not
  in a proxy slot, editing), which also stops fragments in the library's and
  templates' previews from registering.
- **Why:** the editor keeps one element per block (`dom.ts`, `registerBlock`),
  and the pages are the other blocks' elements (the meta plan's decision 3).
  This also covers the meta plan's rules: each child is a block at most once,
  hidden slides stay out, Swiper's cloned slides are plain markup.
- **The shown block rendered twice:** the first `<BlokkliItem>` to claim it is
  the block; the second renders as on the site, with a warning in development
  (decision 2's B would make it a second place).

## The shown block's element in a scene (decided with decision 2)

- **The element of its `<BlokkliItem>`, which holds all its places.** The
  outline, the add tabs, presses and editables cover all of them.
- **In svv's split layout,** that's the whole scene. Pressing anywhere in it
  selects the section; the story is selected through the band's free space.
- **In the tabs layout,** only the content column can be wrapped: the list on
  the left holds every section's title. The list is decoration, and pressing it
  selects the story.
- **Possible follow-up** (decision 2's B): a `<BlokkliItem>` in each place. The
  first is the block's element, and the others count as the block, as the shown
  page does. Places would better be named than taken in document order, as
  dnd-kit names a draggable's activator. A second `<BlokkliItem>` for the shown
  block would then be a second place instead of a warning.

## When the slot can't show the shown block (decided: A, the user, 2026-11-08)

**The slot renders it as a plain keyed `<BlokkliItem>`:** the type's component,
as step 1 renders it, in the place the scene has for it.

- **Why not the editor:** only the project knows what its layout shows. A block
  registers once it's mounted, later still when the project's own components in
  the scene are lazy or have an async setup (block components themselves are
  synchronous in the editor: `allComponents`, `EditProvider.vue:383`). The
  editor's fallback would come late, below the scene, and twice when the project
  renders the block after all.
- **The warning:** in development, `PagerList` checks once the field has settled
  (`dom.settleKey`, one 50ms debounce over every registration) and again after a
  second, navigation's bound. It warns once per block: when the shown block
  isn't registered, or its element has no `data-bk-uuid`. Without an element,
  the block gets no outline and no inline editing, and navigation to it gives
  up. The registered element is never its page: the shown page is a stand-in.

## svv's story with step 2

What the story would change, to check the API against the real case.

```vue
<!-- Story/index.vue -->
<BlokkliField
  v-slot="{ items, shownIndex }"
  name="field_paragraphs"
  :list="paragraphs"
  proxy-mode="slot"
>
  <ParagraphStoryRenderer
    :items
    :story-type="options.storyType"
    :shown-index
  />
</BlokkliField>
```

```vue
<!-- RendererSplitTwo while editing: the scene holds only the shown section. -->
<BlokkliItem
  v-if="shownSlide && shownItem"
  :key="shownItem.uuid"
  v-bind="shownItem"
>
  <div class="paragraph-story grid h-screen grid-cols-12 overflow-hidden">
    <div class="col-span-7">
      <!-- The visual: the image, the number, the portrait. -->
    </div>
    <div class="col-start-8 col-end-[-1] overflow-y-auto px-6 md:pr-20">
      <h2 v-blokkli-editable:field_title>{{ shownSlide.title }}</h2>
      <div v-blokkli-editable:field_text v-html="shownSlide.text" />
    </div>
  </div>
</BlokkliItem>
<!-- A child this layout can't show: its type's component. -->
<BlokkliItem v-else-if="shownItem" :key="shownItem.uuid" v-bind="shownItem" />
```

- **Goes:** the selection watcher (`useBlokkli(true)`), `EditOverview`,
  `EditEmpty`, `story-add` (the last three with step 1).
- **An accordion section** renders `<BlokkliField name="field_content">` in its
  `<BlokkliItem>` while editing, instead of `ParagraphStoryBlocks`, to edit its
  blocks; the mapper's `resolveChildren` isn't needed for it then.
- **Stays the project's:** the editing layouts without the scroll animation.

## The sandbox's scene (decided: A, the user, 2026-11-08)

**A story block in the sandbox,** modeled on svv's, from existing types:

- **Sections:** `teaser` (title, lead, image: svv's text/image), `image` (media,
  caption) and `accordion` (title, nested blocks: svv's accordion section).
- **A title of its own,** edited inline above the scene. The section's title in
  the scene is in the same template, so a directive with the wrong context would
  edit the story's title instead.
- **Layouts** (an option):
  - **split:** the shown section's visual on the left, its text on the right, in
    one keyed `<BlokkliItem>`; an accordion's blocks in its `<BlokkliField>`;
  - **images:** every image section stays mounted, the ones not shown hidden
    with a class (not `v-show`: the site renders on the server, under the CSP),
    so a mounted `<BlokkliItem>` switches. A section that isn't an image is a
    plain `<BlokkliItem>`: what the layout can't show.
- **What it brings:** two places per section, a nested field in a section, a
  layout that leaves children out, items that switch, real content for visitors,
  and E2E fixtures.
- **Made with** the `blokkli-add-paragraph-type` skill: the Drupal type and
  fields, its permissions, the GraphQL server's bundles and the fragment, the
  component, translations, content, a help picture.

## Docs, skills, changelog

- **Docs:**
  - `docs/define-blokkli/proxy-mode.md` gets "Rendering the shown block
    yourself": the key, `shownIndex !== null` as the signal, one `<BlokkliItem>`
    around all places, the fallback, the limits;
  - `docs/components/BlokkliField.md`: the prop's type, `shownIndex`;
  - `docs/components/BlokkliItem.md`: the slot and the key.
- **Skills:**
  - `skills/blokkli-v2-migration/phases/3-components.md`, "Fields in proxy
    mode": a scene opts in. It also says `import.meta.blokkliEditing` only works
    in `defineBlokkli` components (130-131); it reaches every `.vue` file that
    an editing variant imports (`BlokkliEditing.ts:78-108`);
  - `skills/blokkli-add-paragraph-type/SKILL.md` §8;
  - `.claude/skills/e2e-testing/SKILL.md`: the story fixture, which node types
    allow it;
  - `.claude/skills/sandbox/SKILL.md`: the hydrate list.
- **Changelog:** 2.0.0-alpha.74 isn't tagged yet, so its "#### Sliders" (en) and
  "#### Slider" (de) sections, with what editors see.

## Tests

- **Unit:**
  - the directive's context: scene markup in the shown item and in a hidden one,
    a block nested in the shown item, decoration, a nested scene, a library
    item, no context (the provider's element);
  - the inner component's vnode helper, on templates compiled at runtime:
    static, dynamic, `v-if`/`v-else` switching, a comment first, a
    `<template v-if>`, `v-for`, a component, several roots, attributes kept
    across renders;
  - the fragment guard.
- **E2E** (`test/e2e-drupal/features/pager/scene.test.ts`, one editor page, on
  the sandbox's story):
  - the band above the scene; the shown section is registered as the scene's
    element, the others as their pages;
  - a real click on the scene selects the section; clicking a page shows its
    section;
  - editing a section's title inline in the scene reaches Drupal and shows; the
    story's own title edits the story;
  - the hidden sections register no editables;
  - Tab goes into the accordion's blocks, then on to the next page;
  - a block added to the shown accordion renders inside the scene;
  - navigating to a block in a hidden accordion shows it;
  - the images layout: a teaser renders as its own component; switching sections
    turns the mounted items into the block and back.
- **The pager spec's helpers** go to `test/e2e-drupal/support/pager.ts`, used by
  both specs; it uses `support/selection.ts`.
- **The add buttons' spec** lists the front page's types
  (`add-buttons.test.ts:364-385`): it gets `story`.

## Order of work

1. The directive's context, test first.
2. The fragment guard.
3. The vnode helper.
4. The injection, the inner component, `BlokkliItem`.
5. The opt-in: `BlokkliField`, `DraggableList`, `PagerList`, the warning.
6. The sandbox's story and its content.
7. The E2E tests.
8. Docs, skills, changelog.

## Known limits

- **Places outside the shown block's `<BlokkliItem>` are decoration,** like
  svv's list of titles in tabs: pressing them selects the block holding the
  field.
- **The first node of the slot must be an element or a component with one
  root;** a warning says so otherwise. Nothing teleported out of it counts as
  the block.
- **A slider that renders every slide** shows them all while editing, but only
  the shown one is a block. The others can't be selected or edited in place;
  their pages stand in for them.
- **The children that aren't shown render their nested fields from their
  props,** as on the site. While editing, svv's props have no nested children,
  so a layout that showed several children at once would show them empty.
- **`editTitle` and analysis read the scene's markup** for the shown block, not
  its type's component.

## Decisions

1. ~~The opt-in~~: decided, A, `proxy-mode="slot"` (the user, 2026-11-08). The
   options were:
   - **A:** a value of `proxy-mode`;
   - **B:** a second boolean prop next to it;
   - **C:** a slot of its own for editing, which opts in by being there.
2. ~~Markup as the shown block, in one place or several~~: decided, A, one
   `<BlokkliItem>` with a slot per block, around all its places (the user,
   2026-11-08). Decision 3 went into it, after the user asked how a block in two
   places would work. The options were:
   - **A:** one `<BlokkliItem>` per block, around all its places;
   - **B:** a `<BlokkliItem>` in each place, all of them counting as the block;
   - **C:** B under a new component's name (`<BlokkliEntityContext>`);
   - **D:** only the child's own component, for its parent's type.
3. ~~The shown block's element in a scene~~: decided with decision 2.
4. ~~When the slot can't show the shown block~~: decided, A, the slot renders a
   plain `<BlokkliItem>`, with a warning in development (the user, 2026-11-08).
   The options were:
   - **A:** the slot's job, with the warning;
   - **B:** the editor notices and renders it below the slot;
   - **C:** the field is told which children its slot renders.
5. ~~The sandbox's scene~~: decided, A, a story block in the sandbox (the user,
   2026-11-08). The gallery stays the fixture of step 1's rendering. The options
   were:
   - **A:** a story block, with real content;
   - **B:** a block for the tests only, like the widget;
   - **C:** only the gallery, opted in.
6. ~~A `<BlokkliItem>`'s index and parent type in a slot~~: decided, A, the
   field fills them in (the user, 2026-11-09). The sandbox's tabs layout showed
   it: a picture that the slot rendered as its own type took itself for a block
   at the top of the page and kept a detail page's sidebar free, since the
   slot's `items` have no parent type. A `<BlokkliItem>` of one of the field's
   blocks now gets its index in the field and the field's parent type when it
   isn't given them (`getItemPlacement`), on the site too. The options were:
   - **A:** the field fills them in;
   - **B:** the slot's items carry them;
   - **C:** projects pass them.
