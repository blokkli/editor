# Phase 3: Paragraph components (defineBlokkli)

Requires phase 2 to be done. Everything in this phase is optional or a
deprecation cleanup: the project already works without it.

## Workflow

This is the long, repetitive part of the migration. Work in batches:

1. List every component that calls `defineBlokkli` or `defineBlokkliFragment`
   and add them to the **Paragraph components** section of the progress file.
2. Migrate one component (or one folder) at a time, applying all changes below.
3. Check the component off in the progress file once it passes typecheck.

Components are independent of each other, so batches can be handed to subagents
or spread over multiple sessions.

## editable and droppable fields

Existing `v-blokkli-editable` or `v-blokkli-droppable` directives continue to
work. It is no longer needed to provide the `type` argument for directives:
`v-blokkli-editable:field_lead` is enough.
`v-blokkli-editable:[editableFieldName]` also works for dynamic name mapping.

This now works because the editor now loads all field definitions for paragraphs
and therefore knows that `field_lead` is a `string` field or that `field_image`
is a `entity_reference` field for `media` entities.

## propsFieldMapping

blökkli needs this new property on `defineBlokkli` to understand which Drupal
paragraph fields map to which props.

For example, if you have a `image` paragraph with two authorable fields
`field_description` and `field_image` and one that isn't authorable
(`field_is_large`):

```graphql
fragment paragraphImage on ParagraphImage {
  captionOverride: fieldDescription
  image: fieldImage {
    ...mediaImage
  }
  isLarge: fieldIsLarge
}
```

Then your paragraph component should look something like this:

```vue
<script lang="ts" setup>
import type { ParagraphImageFragment } from '#graphql-operations'

defineProps<ParagraphImageFragment>()

defineBlokkli({
  bundle: 'image',
  propsFieldMapping: {
    captionOverride: {
      name: 'field_description',
      type: 'editable',
    },
    image: {
      name: 'field_image',
      type: 'droppable',
    },
    isLarge: null,
  },
})
</script>
```

- `captionOverride` maps to `field_description` => it's a string field, so it
  needs to be mapped
- `image` maps to `field_image` => this is an entity reference, so it needs to
  be mapped as well
- `isLarge` is not directly authorable via blökkli in the frontend => map it to
  `null`

The type of `propsFieldMapping` is automatically inferred from the codegen TS
fragment type. That way when fields get added or removed from the fragment, it
produces a TS error.

The property itself is _not_ required and blökkli will also work without it. The
main use for it is that during various interactions in the editor, blökkli
provides a live preview of a field. For example, when the user edits
`field_description`, during typing, blökkli will automatically override the
`captionOverride` prop value with whatever the user is entering. If
`propsFieldMapping` is not set, blökkli will fall back to the previous behavior
and directly replace `innerHTML` on the matching `v-blokkli-editable` DOM
element.

In addition it is used heavily by the `agent` blökkli module.

## ctx.isEditing

Before:

```vue
<script lang="ts" setup>
const { isEditing } = defineBlokkli({
  bundle: 'image',
})
</script>
```

While this continues to work, it's deprecated and will be removed in the future.

In V2, the recommended way is to use the special `import.meta.blokkliEditing`
marker:

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'image',
})

const isEditing = import.meta.blokkliEditing
</script>
```

blökkli now creates _two separately compiled versions_ for each paragraph
component: One where the marker is `false` and one where it's `true`. Inside the
editor, it always loads the editing component.

The big benefit: you can now have special editor-only code that is only
available within the editor. In the build, this first compiles to
`const isEditing = false`. Rollup/rolldown then tree shakes any code like
`<EditorInfo v-if="isEditing">` or `if (isEditing) {}`.

Note that this only works in `.vue` files: in the components that call
`defineBlokkli` or `defineBlokkliFragment`, and in every `.vue` component they
import, directly or through Nuxt's auto-imports, which get an editing version
too. In `.ts` files it ALWAYS resolves to `false`!

## Fields in proxy mode

A `<BlokkliField proxy-mode>` now renders as a pager while editing: a band of
pages, one per child, and below it the child the field shows, as a real block.
Its slot only renders on the site and in the preview.

- Remove the wrapper with `position: relative` that the old proxy list needed.
  It does no harm.
- Code in the slot's components that only ran while editing (such as disabling a
  slider's buttons) no longer runs: remove it.
- `<BlokkliItem>` in the slot is fine now. Its directives no longer clash with
  the editor's list.
- A `<BlokkliItem>` of one of the field's children gets its index and its
  parent's bundle from the field now, on the site too: before, the slot's
  children rendered as if they were at the top of the page, at index 0. A child
  whose component checks `parentType` or has a `renderFor` variant for the
  parent renders as nested, as the editor renders it. Check those components on
  the site; drop a `parent-type` or `index` passed only to make up for it.
- A `proxy.vue` only renders in the editor's Structure view now. Keep it there.
- `class` goes on the element that holds the band and the shown child. `tag`,
  `list-class` and `edit-class` go on the list that holds the shown child. In
  proxy mode, they did nothing before.
- A slot that composes the children into a scene (titles as tabs, the current
  child's text beside them) loses that composition while editing, unless the
  field opts in with `proxy-mode="slot"`: its slot then renders below the band
  while editing too. Ask the project which it wants. To opt in:
  - render the shown child, `items[shownIndex]`, as a `<BlokkliItem>` keyed by
    its uuid, with a default slot around all of the child's markup; it's then
    the child, edited in place. `shownIndex` is `null` on the site;
  - render what the layout can't show as
    `<BlokkliItem :key="item.uuid" v-bind="item" />`, the child's own component;
  - remove what the project built for it: finding the selected child itself
    (`useBlokkli()` and `selection.uuids`), an overview of the children, a
    button that adds children (the band and the add buttons do that now).

  See "Rendering the Shown Block Yourself" in the proxy mode docs.

## Done when

- Every component in the progress file is checked off
- No `defineBlokkli` call destructures `isEditing` anymore
- The project's typecheck passes
