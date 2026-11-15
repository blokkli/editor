# Compositions: bespoke sections the agent builds

A composition is a paragraph like any other, whose content is a tree of
primitives (box, stack, grid, heading, text, button, …) styled with the
project's design tokens. It's for one-off sections, a campaign hero or the
landing page of a marketing campaign, that no paragraph type was made for. The
agent builds them; editors adjust what the agent built.

This is an exploration. The POC exists to try things out: no tests, no code
quality, nothing committed.

## Decisions

- **The agent composes, the editor adjusts** (the user, 2026-11-14). Building a
  complex section by hand is painful in any tool. The editor is for small
  changes to an existing composition, so the agent's format and tools come
  first.
- **A composition is one paragraph among the others**, a one-off section, not a
  reusable component.
- **Primitives:** blökkli ships the layout primitives, and projects register
  their own with the same API. The POC defines them all in the sandbox.
- **Primitives and plain HTML** (the user, 2026-11-14): the agent may use the
  primitives (box, stack, grid, heading, text, …) for consistency, and plain
  HTML elements with its own CSS when it needs something they don't offer.
  Components that do something (icon, behaviours) are only components; images
  and anything else with data of its own are child paragraphs (below). The style
  guide says when a primitive is the better choice.
- **The agent writes markup that looks like a Vue SFC** (the user, 2026-11-14):
  tags, attributes, and a `<style>` block. Tags are primitives, attributes are
  their props, classes are the agent's own:

  ```html
  <Box class="hero">
    <Heading class="title">Swim in the Aare this summer</Heading>
    <button url="/de/baden" on-dark>Find a bathing spot</button>
  </Box>

  <style>
    .hero {
      background: var(--color-primary);
      color: var(--color-white);
      padding: calc(var(--spacing) * 8) calc(var(--spacing) * 4);
    }
    @container (min-width: 48rem) {
      .hero {
        padding-block: calc(var(--spacing) * 20);
      }
    }
    @keyframes rise {
      from {
        opacity: 0;
        translate: 0 2rem;
      }
    }
    .title {
      animation: rise linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
    }
  </style>
  ```

  Why markup and not JSON: models write worse code wrapped in JSON
  ([Aider, 2024](https://aider.chat/2024/08/14/code-in-json.html)), and HTML,
  Vue and CSS are what they have seen most. Vue's own template parser
  (`@vue/compiler-dom`'s `parse()`) reads this format, directives included.

- **Styling is CSS only, with the tokens as CSS variables** (the user,
  2026-11-14): maximum flexibility. The agent gets a style guide (the tokens,
  what each is for, the breakpoints) and writes the composition's `<style>`
  block. No Tailwind classes from the agent: classes the site's build never saw
  have no CSS, so free Tailwind classes would need a compiler at runtime or an
  allowlist built into the site's CSS. The primitives' props still map to
  classes, but those are a fixed set the build generates.
- **Storage, the direction** (the user, 2026-11-14; the placeholders were
  replaced by child paragraphs on 2026-11-15, see "Texts are child paragraphs"):
  the structure is stored once for all languages, with placeholders for its
  texts. The texts go next to it, later in a translatable key-value field on the
  paragraph (the key is the placeholder), where Drupal can sanitise, filter,
  index and translate them like any field. That gives symmetric translations:
  one structure, content per language. The agent never sees placeholders: the
  tool fills in the content of the current language when the agent reads, and
  takes it out again, by the part's id, when it writes.
- **Components with data of their own are child paragraphs** (the user,
  2026-11-14): the composition paragraph gets one flat paragraphs field, and the
  markup marks where each child goes:

  ```html
  <image
    id="hero-image"
    class="hero-media"
    media="42"
    :image-style="heroImage"
  />
  ```

  The tag is the promoted type's (`image` → `<Image>`), the id is the child's
  key, and the other attributes are its fields (`media` for `field_media`): the
  tool sets them on the child and takes them out of the source.

  The child is a paragraph of the project's own types (image, link, video,
  chart, …), so all of it comes from the project: its fragments (rokka), link
  fields (aliases per language, the access check), entity usage, cache tags,
  translations of its fields, the agent's tools (`search_media`,
  `replace_media_field`, `update_text_fields`) and the editor's (inline editing,
  dropping media on its field). Links and media aren't translatable, and
  paragraphs keep them that way.
  - **The child carries its key** in an option of its own. UUIDs change on every
    copy (duplicate, paste, templates, transfer, detaching from the library,
    cloning the node); options are copied along. Layout Paragraphs does the same
    with `parent_uuid` and `region` in each child's behaviour settings, and its
    issue queue shows what remapping UUIDs costs (from memory).
  - **One mutation** creates a composition with its children: `addNewBlocks`
    takes nested children with their values and options
    (`src/runtime/editor/events/index.ts`).

- **A paragraph type is promoted by a component for compositions** (the user,
  2026-11-14): `defineBlokkli({ renderFor: { parentBundle: 'composition' } })`,
  which blökkli already supports. That component fills the cell it gets, with no
  outer spacing. The build knows which types have one; the guide lists them for
  the agent.
- **The composition module renders and registers its children itself** (the
  user, 2026-11-14), not a new mode of `BlokkliField`. The editor only treats
  what one of its field renderers registered as a block: the list
  (`DraggableList`) or the pager's slot (`PagerList/SlotItem`), with
  `dom.registerField` and `useBlockRegistration`. The composition does the same,
  for each child where the markup puts it. Core gets a flag in the registered
  field's data, like `isPager`: no drop slots and no add buttons around the
  field's blocks. They assume the blocks are the field element's children, in
  order (`dragging-overlay/Renderer`, `field.element.children`).
- **The children stay where the markup puts them** (the user, 2026-11-15, option
  A of three). Editors edit a child's content in place (its media, its edit
  form, its options), but can't move it, remove it, duplicate it, convert it or
  make it reusable; nothing is added to the composition's field. Only the source
  changes the structure, through the agent or the options overlay. As
  Gutenberg's `templateLock: 'contentOnly'`. Not chosen: open places (a tag
  without its paragraph becomes a drop target, so a child dragged out can come
  back, with `defineDropAreas`) and swapping two children of a type by
  exchanging their keys. Either can come later on top of this.
- **Texts are child paragraphs** (the user's idea, 2026-11-14; chosen 2026-11-15
  over placeholders in a key-value field and over texts edited in the source,
  which has no translations): projects promote their title and text types, and
  every text is a child, which replaces the placeholders. The structure holds no
  text; primitives only show texts from the project's own translations. The
  `Heading` and `Text` primitives go (the user, 2026-11-15): their text is a
  prop, which would stay in the source, untranslated.
  - Why: the key-value field would rebuild what paragraphs have. It's a custom
    field type; blökkli's inline editing works on a whole field, not one item of
    a multi-value field; the translation tools (outdated flags, auto-translate,
    the translate dialog, the CSV export) work on paragraph fields; the
    sandbox's search collects paragraphs' text fields by field type
    (`blokkli_playground/.../ParagraphsText.php`), never an option. A
    translatable multi-value field also has its items per language, so a key can
    be missing in one.
  - The agent marks each text with the promoted type's tag (the user,
    2026-11-15, option A of three; not chosen: headings and paragraphs becoming
    children by their element, or every element that holds text):

    <!-- prettier-ignore -->
    ```html
    <Title id="title" as="h2" class="title">Baden in der Aare</Title>
    <Text id="lead" class="lead"><p>Vier neue Badestellen …</p></Text>
    ```

    The content between the tags is the child's field: plain text for a title
    (`field_title`, 255 characters), the field's HTML for a text (`field_text`,
    `basic_html`, always block level, so a text can't be a `<p>`). `as` is the
    element a title renders. Text anywhere else is refused, so every text is
    translatable. The tool takes the content out of the stored source and puts
    it back when the agent reads. Moving, wrapping and restyling parts only
    change the source; a changed text sets its child's field; a new tag creates
    a child, a removed one deletes it.

  - No box around a child (the user, 2026-11-15, option B of three; not chosen:
    a box for images only, or for every child): the root of a component for
    compositions is the element the markup placed. Its class, the scope
    attribute, `data-bkc-child` and an image's ratio pass through `BlokkliItem`
    to that root, as Vue's scoped CSS styles a child component's root.
    `useCompositionChild()` gives `{ key, placement, as }`. Every such component
    needs a single root; a child whose paragraph is missing renders nothing.

  - Translations work as on every blökkli page: the paragraphs field isn't
    translatable, the children's text fields are, the structure is shared. In
    translating mode the tool accepts only text changes.
  - Costs: about 16 children for the first sample; every eyebrow and label
    wrapped in a tag; a block outline on every stat label while editing; a
    heading with emphasis needs a promoted type with a restricted format (the
    title field is plain); the composition's CSS doesn't reach inside a rich
    text, only inherited properties do.
  - Risk, the same with placeholders: an edit that drops a part's id makes its
    text look new, and it loses its translations. The tool could keep an id when
    a removed part and an added one have the same text, or refuse an edit that
    drops an id with translations behind it.

- **Image sizes: the agent states each image's share and ratio per breakpoint**
  (the user, 2026-11-14):
  `{ width: { base: '100%', md: '50%' }, ratio: '4/3', priority: true }`. The
  project states the composition's width for a window width (e.g.
  `min(100vw - 2rem, 80rem)`); the module turns the container breakpoints into
  window ranges and passes the promoted component a placement per project
  viewport: the largest width in pixels, and the ratio. The component builds its
  image style from that: with rokka,
  `defineImageStyle({ type: 'sizes', aspectRatio, sizes })` at runtime
  ([@rokka-io/nuxt](https://npmjs.com/package/@rokka-io/nuxt)); the sandbox
  picks the nearest of its Drupal image styles. Why:
  - only the agent knows how wide a cell is: it wrote the grid, and nothing
    reads a width out of free CSS;
  - `sizes` and `<picture>`'s `media` only know the window, the composition's
    breakpoints are container queries;
  - `sizes="auto"` (lazy images only) is in Chrome 126 and Firefox 150, not in
    Safari, 27.3 Technology Preview included
    ([caniuse](https://caniuse.com/wf-sizes-auto));
  - measuring on the client leaves server-rendered heroes without an image until
    hydration.

  A wrong share costs bytes or sharpness. The editor could compare an image's
  displayed width with its source's after rendering (an analyzer). The module
  could write the wrapper's `aspect-ratio` per container query from `ratio`, so
  the agent doesn't repeat it in its CSS.

- **Structured values: Vue bindings with literals, and constants in
  `<script setup>`** (the user, 2026-11-14):

  ```html
  <script setup>
    const cardImage = { ratio: '4/3', width: { base: '100%', md: '33%' } }
  </script>

  <image id="card-1" media="42" :image-style="cardImage" />
  <image
    id="card-2"
    media="43"
    :image-style="{ ratio: '1/1', priority: true }"
  />
  ```

  - The block allows only `const name = <literal>` (objects, arrays, strings,
    numbers, booleans); functions, imports and calls are refused, with the line.
    A binding takes a constant's name or an inline literal. The compiler swaps
    names for values, so the tree the renderer gets is the same, and the block
    never reaches the browser.
  - Why: it's what every SFC does, so the agent knows it; shared values are
    stated once; the expression language's state goes there later
    (`const open = ref(false)`). JSON in an attribute clashes with the
    attribute's quotes, and a free data block (`$data.x`) is invented and
    invites texts into the structure.
  - Bindings are refused on text props: texts stay in the markup, where the
    placeholders find them.
  - A value per breakpoint inside an object is `{ base, md }`, the shape the
    compiler stores. `md:gap="lg"` stays for flat primitive props; merging the
    two waits until we see which one the agent gets wrong.
  - A structured prop declares its shape as a schema: the check validates the
    value and names the path (`image.width.md: expected a percentage`), the
    guide describes it, and the build can export it next to the options schema
    that Drupal already validates against (`blokkli-options-schema.json`).
  - The check needs a JavaScript parser (acorn, or `@babel/parser`, which
    `@vue/compiler-core` already depends on). In Drupal, a PHP one such as Peast
    (from memory), which the expression language needs anyway.

- **One mutation per change, with the composition's whole state** (the user,
  2026-11-14): the source, and every child with its UUID, type, key and field
  values. Drupal matches the children by UUID: sets fields on those that exist,
  creates the new ones, deletes the missing ones. No parsing in the mutation;
  the check runs on output. The UUIDs come from the client, so a child keeps its
  UUID across iterations. The tool reads the current state before it writes, so
  inline edits made in between are part of it.
  - Why it matters: every request in the editor replays all mutations from the
    stored host (`ParagraphsBlokkliEditState::getMutatedState()` →
    `executeMutations()`), so a mutation's cost is paid on every later request.
  - Measured locally (2026-11-14, a fast idle machine, so a lower bound):
    creating 800 title or text paragraphs in memory 80 ms, setting a field on
    them about 1 ms, replaying the front page's edit state with one mutation 107
    ms. Not measured: a mutation plugin's proxies and bookkeeping, the
    validation of the extra paragraphs. To measure on real hardware before
    relying on it.
  - Later, in blökkli's edit state: a later state of the same composition
    contains everything an earlier one set, so in an unbroken run of composition
    mutations only the last needs replaying. Only within a run: a mutation in
    between (an inline edit of a child) may need a child that an earlier
    composition mutation created. Undo still works: going back replays up to the
    previous entry, the last of its run.
- **Breakpoints are container queries:** a composition adapts to its own width,
  not the window's.
- **Saving in the editor:** like the action bar's options, changes stay local
  and are stored on blur or when the part is deselected, never while typing (the
  user, 2026-11-14).
- **Interactivity: an expression language in Vue's syntax** (option B under
  "Interactivity", the user, 2026-11-14), with functions that blökkli and the
  project register. No code that the agent or an editor wrote runs on the page.
- **Much of the interactivity is CSS** (the user, 2026-11-14): keyframes,
  scroll-driven animations, transitions. Safe once it's confined: see "CSS"
  under "Open".
- **Checked on output, by Drupal** (the user leans that way, 2026-11-14):
  nothing stored is trusted. With CSS only, no compiler is needed, so Drupal can
  do all of it.

## Where the POC stands

Second iteration (2026-11-14): the agent writes markup and `<style>` blocks, the
server compiles and checks them. The primitives' props still map to a fixed set
of Tailwind classes that the build generates (the safelist and the `@source`
line in the sandbox's `main.css`); the agent's own styling is CSS.

- **Storage:** `{ version: 2, source }` as a JSON option
  (`dataType: 'composition'`) in the paragraph's `behavior_settings`, a base
  field that isn't translatable (`paragraphs/src/Entity/Paragraph.php`). Texts
  are in the source, in one language: placeholders come later.
- **The check runs on Nuxt's server for now:**
  `POST /api/blokkli/composition/compile` (`runtime/server/compile.ts`), a pure
  function of the source, so it can take any input. Not the middleware's
  `onServerResponse` hook: that would have to find compositions in every
  response's shape (page, edit state, mutation results). The renderer asks it
  with `useAsyncData`; server rendering puts the answer in the payload. To move
  to Drupal once the rules hold.
  - Vue's template parser (`@vue/compiler-dom`) reads the markup; tags with a
    capital are primitives, the others must be in `ALLOWED_ELEMENTS`
    (`runtime/helpers/markup.ts`, shared with the agent's guide).
  - Parts without an id get one in the source (`heading-1`, `div-3`); inline
    elements get none.
  - CSS: postcss checks it, then the scoping (postcss-selector-parser, as Vue's
    scoped styles: the scope attribute on the last compound) and a last check
    that drops any rule without the scope. Not `@vue/compiler-sfc`: Nitro
    bundled its template engines (consolidate) and the whole frontend
    answered 500.
  - Every composition's CSS starts with containment, the tokens' custom
    properties (`--space-*`) and ends with the reduced-motion rule.
- **Rendering:** `CompositionRenderer` (the root, with the scope attribute, and
  the CSS through `useHead`), `CompositionNodes` (a render function over the
  server's tree). In the browser, the CSS goes in a `<style>` element without
  the nonce: fine on the dev server, to check against a build.
- **Agent:** `get_composition_guide` (the guide, generated from the definitions,
  the tokens and the markup rules), `get_composition`, `create_composition`,
  `edit_composition` (replaces a snippet, like `str_replace`),
  `update_composition`, and the skill. Every mutation compiles first and refuses
  the source with every error and its line. Not tried with the model yet.
- **Editor:** the options overlay edits the whole source ("Composition
  (source)"). A sidebar that showed the parts' tree and edited a part's markup
  was removed (2026-11-15): it was the only panel that opened by itself, and the
  child paragraphs made it unneeded.
- **Sandbox:** tokens with `property`/`propertyValue` and the breakpoints'
  `minWidth` (`sandbox/frontend/blokkli/composition/tokens.ts`), `@theme static`
  in `main.css`, the XSS validator off for the compile route (`nuxt.config.ts`).
  The paragraph type `composition` is in `sandbox/drupal/config/sync` (imported
  on the dev site; `ddev reset` restores a bake from before it, so
  `ddev drush cim -y` after it).
- **The front page's edit state** (owned by the admin: `ddev drush uli /de`)
  holds two samples: a hero with an image and a gallery (the first composition),
  and a pair of images the agent's tools created (at the end).

Third iteration (2026-11-14): images as child paragraphs.

- **Drupal:** the composition type has `field_paragraphs` (only `image` for now,
  not translatable). `blokkli_playground`'s mutation `update_composition`
  (`src/Plugin/ParagraphsBlokkli/Mutation/UpdateComposition.php`) takes the
  whole state: the option's value and the children as JSON (the GraphQL
  extension only builds input types for the module's own mutations). It extends
  `AddMutationBase`: new children get its access checks, templates and
  validation.
- **The key:** the option `bkCompositionKey` on each child, the id of its tag.
  The edit state has a new paragraph's options in `state.mutatedOptions`, not in
  the field list's `options` (those come from the stored paragraph): merge both,
  as `BlokkliField` does.
- **The compiler:**
  - a tag of a promoted type (`<Image>`) becomes a `child` node; its other
    attributes are field values, which leave the source (`compiled.children`);
  - `<script setup>` constants and `:image-style` are parsed with
    `@babel/parser` and only literals pass;
  - the placement (`sizes`, the largest width per window range, the ratio) is
    computed from the tokens' `layout`, and each child's ratio becomes CSS on
    its box.
- **Promoted types:** the template `composition-children` lists the types with
  `renderFor: { parentBundle: <a composition type> }`. A complex option type can
  say `nestsBlocks`, so the composition counts as a block with nested blocks
  (`BlockBundleWithNested`, which `parentBundle` takes).
- **Rendering:** `CompositionRenderer` takes the field's list (the edit state's
  while editing and in the preview), provides what a field provides, and while
  editing registers the field with `hostPlacesBlocks` (core's new flag: no drop
  slots, no add buttons before or after). `CompositionNodes` renders a child in
  a box (`data-bkc-child`) as `BlokkliItem`, the editor's variant while editing,
  so it's a real block. `useCompositionChild()` (`#blokkli/composition/child`)
  gives the component its placement.
- **Sandbox:** `Paragraph/Image/Composition.vue` fills its box, `srcset` from
  three image styles (medium, large, content), `sizes` from the placement, eager
  and `fetchpriority="high"` with `priority`. The tokens' `layout` is
  `container-wide`: 75rem, less the gutters.
- **Agent:** create, edit and update go through `prepareCompositionUpdate` /
  `buildChildren` (`composition_helpers.ts`): one mutation (`addNewBlocks` with
  children, or `updateComposition`). The guide lists the promoted types with
  their reference and link fields, and the constants.
- **Tried in the editor** (scripts, no model): create with two images, add a
  third with `edit_composition`, change the layout (same UUIDs), remove a tag
  (its paragraph goes), change `media` in the source (same UUID, new image),
  click an image (the image paragraph is selected, breadcrumb Composition »
  Parts » Bild), the preview (rendered without the editor). No console errors.

Gaps:

- **Reading field values back:** `get_composition` shows the tags without
  `media`; nothing reads a reference's value generically. The agent knows the
  ids it wrote.
- **Texts of children** (an image's caption) aren't offered: the component for
  compositions doesn't show them, and texts are undecided ("Texts as child
  paragraphs").
- **The structure view** doesn't list the children.
- **Drupal and the promotion must agree:** the field's allowed types and the
  components for compositions are configured apart.
- **`@babel/parser`** isn't a dependency of the package yet (it comes with
  `@vue/compiler-core`).
- `typecheck:build` fails on `build/templates/primitives.ts` (from the second
  iteration): it imports runtime helpers that `tsconfig.node.json` doesn't list.

Then (2026-11-15):

- **The sidebar is gone** (see "Editor" above).
- **The children stay in place:** core's permissions provider has
  `isBlockPlacedByHost` (the registered field's `hostPlacesBlocks`) and
  `canChangeBlockContent` (read-only field, restricted ancestor). A placed block
  fails `canChangeBlockField`, which dragging, delete, duplicate, conversions,
  swap and the agent's move, delete, duplicate and rearrange tools check, and
  `canChangeField` is false for its field. `canEditBlock`,
  `getBlockPermissions`, the edit action and the agent's content tools
  (`requireCanChangeBlockContent`) only ask about the content. Delete, duplicate
  and "make reusable" say why ("This block stays where the block around it
  places it."), and the agent's tools tell it to change the composition instead.
- **Tried in the editor** (scripts): the images in the front page's compositions
  are placed, can't be dragged, deleted or duplicated, and stay editable (the
  edit action, `field_media`); the compositions themselves still drag. The
  agent's delete, duplicate and move tools refuse them.

Fourth iteration (2026-11-15): texts as child paragraphs.

- **Drupal:** the composition's `field_paragraphs` also allows `title` and
  `text` (`ParagraphComposition.fieldParagraphs` is `[Paragraph]` now).
  `update_composition` takes an optional `langcode`: a child's text goes into
  that translation through the module's `updateTextFieldValue` (its format
  kept), and only a change in the host's source language marks the other
  translations outdated. Optional, because a stored mutation without it replays
  with null: a required context without a value throws, and the whole edit state
  failed to load.
- **Promoted text types:** the `composition-children` template records the field
  a component for compositions edits (`v-blokkli-editable:<field>`) as
  `textField`. A type with one takes content between its tags.
- **The compiler:** a child's content (`{ html, text }`, its HTML checked
  against the allowed elements, no classes or ids) leaves the stored source;
  `contentAt` says where it goes back. A self-closing child tag is stored with a
  closing tag. `as` is checked against `CHILD_ELEMENTS`. Text outside a child's
  tags is refused, with the tags that take text.
- **Rendering:** no box: `CompositionNodes` passes the class, the scope and
  `data-bkc-child` through `BlokkliItem` to the component's root;
  `useCompositionChild()` gives `as`. A child without its paragraph renders
  nothing. `data-bkc-node` (the sidebar's) is gone.
- **The tools:** `readAgentSource` puts each child's stored text
  (`fieldValue.readRawValue`, the current language) back between its tags, for
  `get_composition` and `edit_composition`. `buildChildren` sets the text field
  from the content: plain text for a plain field (with its maximum length), HTML
  wrapped in `<p>` if it isn't block level for a rich one. In translating mode
  the stored source must stay the same and no attribute may be set;
  `edit_composition` and `update_composition` work there.
- **Sandbox:** `Title/Composition.vue` (the `as` element, `h2` by default) and
  `Text/Composition.vue` (`rich-text`, `div` by default); the image's root is
  its box. The `heading` and `text` primitives are gone. The Aare composition
  uses `<Title>` and `<Text>` now.
- **A fix on the way:** the build's `extractScriptContent` took the skill's
  example `<script setup>` for a script block, so the composition skill had no
  name and was left out of the agent's skills since the third iteration. Only a
  file that starts with a tag has script blocks now.
- **Tried in the editor** (scripts, no model): converting the Aare composition
  (four text children, the CSS reaching `.copy h2`), reading it back, changing
  the title (same UUID), inline editing of the title, clicking it (the title is
  selected), `create_composition` with a title and a text in one mutation, the
  French translation (the eyebrow's text in French, German unchanged, changes to
  the structure refused), the errors for loose text, markup in a title and
  content in an `<Image>`. No console errors.

Gaps:

- **The Button's label** is still a prop in the source, untranslated: it waits
  for "Links inside texts and the Button primitive".
- **Attributes with text** (`title`, `aria-label`) stay in the source,
  untranslated.
- **A tag's id changed by the agent** makes its text new: the old paragraph and
  its translations go (the risk under "Texts are child paragraphs").
- **The guide is per project:** the skill's example names the sandbox's tags
  (`<Title>`, `<Text>`, `<Box>`).

## Open

### For the agent

- **Which HTML elements and attributes are allowed:** the renderer's list
  (`section`, `div`, `h1`–`h6`, `p`, `ul`/`li`, `a`, `strong`, `figure`,
  `details`/`summary`, `button`, …).
- **The style guide:** generated from `tokens.ts` (with a description per token)
  or from the theme's CSS (the `@theme` block in the sandbox's `main.css`, whose
  comments already say what each colour is for). Tailwind only emits the theme
  variables that some class uses; `@theme static` emits all of them (tried
  2026-11-14). Tailwind 4 has one spacing variable (`--spacing`), the steps are
  `calc(var(--spacing) * n)`; named steps (`--space-md`) would come from the
  tokens.
- **Raw values:** whether the check only warns about `#a3212b` or `37px` instead
  of a token, or refuses them.
- **CSS:** see "CSS" below.
- **Ids:** the editor and the placeholders need a stable id per part. Either the
  agent sees and keeps them (`id="hero"`), or the tool matches parts itself.
- **Edits:** replacing a snippet of the markup, in the way the agent is used to
  edit files, instead of resending the whole section.
- **Seeing the result:** none of the agent's tools can return an image today. A
  screenshot of the rendered section, sent back to the model, probably matters
  more for the design than the format.
- **Examples:** finished sections the agent adapts instead of starting from
  nothing.
- **Interactivity:** state, events and simple logic, without running code that
  the agent or an editor wrote. See "Interactivity" below.

### CSS

The agent's CSS is safe once it can't leave the composition. Raw CSS can:

- **reach the whole page and the editor:** `body`, `.bk-…`, hiding or faking
  things;
- **send requests:** `url()` loads any URL on the site with the visitor's
  cookies (the CSP only blocks other hosts), e.g. `url(/user/logout)`; attribute
  selectors with `url()` are the classic way CSS leaks data;
- **cover the page:** `position: fixed` with a high `z-index`, over the site and
  the editor's toolbar;
- **leak globally:** `@import`, `@font-face`, `@property`, `@layer`,
  `@counter-style`, keyframe names;
- **bypass translations:** text in `content: "…"`;
- **ignore motion settings:** `prefers-reduced-motion`, flashing.

What confines it:

- **Every selector scoped to the composition.** Vue's scoped CSS does this in JS
  (`@vue/compiler-sfc`'s `compileStyle()`, tried 2026-11-14): `body {…}` becomes
  `body[data-v-c1]`, which matches nothing; `@keyframes rise` becomes `rise-c1`,
  and `animation: rise …` follows. It lets `url()` through. In Drupal, two ways:
  rewrite each selector so that its subject carries the composition's attribute
  (needs a selector parser), or wrap the block in `@scope`, which only matches
  inside the composition (simpler, if every browser the site supports has it: to
  check). Keyframe names are renamed either way.
- **A CSS parser rejects the rest:** `url()` and `image-set()`, `@import` and
  the global at-rules, strings in `content` (only `""`). Allowed: `@media`,
  `@container`, `@supports`, `@keyframes` (renamed), `@starting-style`. In
  Drupal: `sabberworm/php-css-parser`, not installed yet (postcss, css-tree and
  lightningcss are in `node_modules`, for the JS side).
- **`contain: layout paint` on the composition's root:** fixed descendants are
  positioned and clipped inside it, and it has its own stacking context. The top
  layer (`popover`, a modal `<dialog>`) escapes it: allow those only on purpose.
- **Reduced motion:** a rule we append turns animations and transitions off
  under `prefers-reduced-motion: reduce`.

**Checked on output, by Drupal.** What's stored is never trusted: anyone can
write to Drupal through the GraphQL mutations, past the editor and the agent's
tools. Their checks only give good errors. As with Drupal's text formats, the
filtering happens when the composition is output: the GraphQL field that serves
a composition returns the tree and the checked CSS, never the stored source.
Mutation responses carry the state, so the editor gets the checked CSS too.

- **What our code interprets** (the tree, props, expressions) needs no
  sanitiser: the renderer only does what it implements, so a tampered document
  can't add capabilities. Unknown tags render nothing, unknown props are
  dropped. The renderer checks URL schemes (no `javascript:`). The expression
  parser for the small grammar is a few KB and is itself the list of what's
  allowed, so it can ship to the browser; or the server sends the parsed tree.
- **What the browser interprets** (CSS, later rich text) is sanitised before it
  reaches the browser. No parser ships to the browser.
- **The alternative, Nuxt's server:** every composition passes through it too.
  Server rendering happens there, and the browser gets its GraphQL only through
  the middleware (nginx refuses Drupal's `/graphql` from outside). The
  middleware's `onServerResponse` hook
  (`sandbox/frontend/server/graphqlMiddleware.serverOptions.ts`) sees every
  response, mutation responses included.
- **Who parses the markup into the tree:** Drupal on output, or the browser with
  a small parser (the renderer's checks hold either way).
- **The CSP is no safety net on server-rendered pages:** nuxt-security adds the
  response's nonce to every `<script>`, `<style>` and `<link>` in the HTML, the
  body included
  (`node_modules/nuxt-security/dist/runtime/nitro/plugins/40-cspSsrNonce.js`).
  Whatever is in the rendered HTML runs. The same goes for any `v-html` that
  renders on the server, compositions or not.
- **In the editor,** the client never turns the agent's source into CSS itself.
  Until the server's response arrives, the composition keeps the last CSS from
  the server. Open:

- **Applying it in the browser:** server rendering can put it in a `<style>`
  element (nuxt-security gives it the nonce). After that, in the single-page app
  and in the editor, the CSS arrives with each response: through the CSSOM (a
  constructable stylesheet), or a `<style>` element with the page's nonce. To
  check against a build, which the CSP binds (the dev server allows inline
  styles).
- **Browser support:** scroll-driven animations (`animation-timeline: view()`)
  aren't in every browser yet; the skill tells the agent to write them so that
  the section is complete without them.
- **Interactivity without code:** `<details>`, `popover` with `popovertarget`,
  `:has()` with `:checked`.

### Interactivity

Code that runs on the page is stored XSS: it runs for visitors, and in the
editor with an editor's session. The author is the agent, which reads content it
didn't write (search results, other pages, imports), and editors. The frontend's
CSP (`sandbox/frontend/nuxt.config.ts`) already turns no string into code:
`script-src` has only nonces and `'strict-dynamic'`, no `'unsafe-eval'` or
`'wasm-unsafe-eval'`; `script-src-attr 'none'`, `connect-src 'self'`,
`form-action 'self'`, Trusted Types in builds.

The options (B chosen, 2026-11-14, with the refinement):

- **A, behaviours as primitives:** tabs, accordions, carousels as Vue components
  by developers; the agent uses them through props and slots.
- **B, an expression language in Vue's syntax:** state on a part,
  `@click="open = !open"`, `v-if`, `:class`. Parsed into a syntax tree when
  saved (acorn), only a few node types allowed, interpreted at render without
  `eval`. Only the composition's state, no `:href`/`:src`/`v-html`, events only
  on interactive elements. Refinement: expressions may call functions that
  blökkli and the project register (`scrollTo('form')`, `track('cta')`).
- **C, real JavaScript in a sandbox:** a worker or QuickJS in WASM that only
  changes state. Needs the CSP loosened, no server rendering.
- **D, stored code compiled like the project's:** stored XSS by design.

How others do it (2026-11-14):

|                             | Authors write                                                           | What keeps it safe                                       |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| Builder.io                  | Real JS: bindings, action handlers, page JS with `state` and `fetch`    | Roles: only developers may use code                      |
| Framer                      | React code components and overrides                                     | The site's own team writes them                          |
| Plasmic                     | State, interactions, JS expressions, functions from the codebase (`$$`) | Roles: content creators only use components              |
| WordPress Interactivity API | Directives that name state and actions, `!` is the only operator        | No expressions: the logic is the block developer's JS    |
| AMP                         | `amp-bind`: bounded expressions; `amp-script`: JS in a worker           | The grammar; the worker, whose changes apply after a tap |

- Builder.io evaluates on the server in isolated-vm, in the browser with
  `eval()` for anything beyond a property path: that needs `'unsafe-eval'`, or
  its Edge build, a JS interpreter that is heavier, slower and ES5 only
  ([CSP](https://www.builder.io/c/docs/csp-unsafe-eval),
  [custom code](https://www.builder.io/c/docs/custom-code),
  [roles](https://www.builder.io/c/docs/guides/roles-and-permissions)).
- Framer moved common overrides to built-in features: effects for animation,
  components for interactions, fetch for data
  ([overrides](https://www.framer.com/developers/overrides/introduction)).
- Plasmic's state is local to its component or page
  ([interactions](https://docs.plasmic.app/learn/interactions-reference/),
  [custom functions](https://docs.plasmic.app/learn/registering-custom-functions/),
  [content creator mode](https://docs.plasmic.app/learn/content-creator-mode/)).
- WordPress: a directive's value "is a string pointing to a specific state,
  action, or side effect"; `wp-html` only takes `asDangerousHTML()`
  ([directives and store](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/api-reference/)).
- AMP: no custom functions, classes or loops, only the document's state, at most
  250 operands per expression
  ([amp-bind](https://amp.dev/documentation/components/amp-bind),
  [amp-script](https://amp.dev/documentation/components/amp-script/)).

What it means here: the tools that allow real code trust their author, and make
code a permission for the site's developers. That doesn't carry over: the agent
would hold the permission, and with it any content it reads. The platforms with
many authors, WordPress and AMP, restrict the language instead, and Framer moves
the same way.

### For the editor

- **Editing inside the composition:** the child paragraphs are real blocks (see
  "Decisions"). The structure's own parts (primitives, HTML) are only edited in
  the source (the options overlay or the agent); for those, the recommendation
  was virtual blocks: a layer around the adapter turns the document into blocks
  for the editor, and folds their changes back into one update of the
  composition.
- **Dropping into a composition:** none for now (see "The children stay where
  the markup puts them"); dropping media on a child's own field works. Open
  places that take a drop can come later.
- **Children without a place:** a child that no tag refers to (the agent removed
  the tag) is deleted or shown at the end; a tag whose child was deleted renders
  nothing.
- **What editors adjust:** with styling in CSS, the parts have few options left.
  Texts, links and images are the editor's; the styling is the agent's (or a CSS
  view for those who want it).

### Content

- **Translations:** when a source text changes, its translations become
  outdated.
- **Rich text:** bold and links inside a text.
- **Links inside texts and the Button primitive:** a link inside a sentence
  can't be a child paragraph. Recommendation: buttons are the project's link
  paragraph, and links inside texts stay plain `href`s, as in every text field
  of the sandbox today (no linkit), so they break when an alias changes. Later,
  for text fields and compositions alike: `entity:node/123` in the markup,
  resolved by Drupal on output (as linkit and core's `media_embed` do). The
  composition's `sanitizeUrl` refuses `entity:` today.
