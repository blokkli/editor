# Proxy Mode

Some blocks show one nested block at a time: image sliders, carousels, steppers,
tabbed scenes. Most of their nested blocks aren't visible, so they can't be
edited in place.

Enable proxy mode on the `<BlokkliField>` of such a block. While editing, the
field then renders as a pager:

- A band above the field shows its blocks as pages, one per block, with its
  index and the icon and name of its type. On the left: the field's label and
  which block it shows, like "2 / 6".
- Below the band, the field shows one block as a real block. Editors edit it
  like any other block: inline, its options, its nested fields, the buttons to
  add blocks before or after it.
- After the last page, the band has a button that adds a block at the end of the
  field, whatever is selected.
- Clicking a page selects its block, which shows it. The field also shows a
  block when the block, or a block inside it, is selected anywhere else: in the
  structure, search, history or comments.
- When the pages don't fit, they get smaller. The ones that still don't fit are
  cut off.

On the site and in the preview, the field's default slot renders the blocks.

## Enable Proxy Mode

Set the `proxy-mode` prop, and render the blocks from the slot's `items`.

```vue
<template>
  <BlokkliField v-slot="{ items }" name="slides" :list="slides" proxy-mode>
    <Carousel>
      <BlokkliItem v-for="item in items" :key="item.uuid" v-bind="item" />
    </Carousel>
  </BlokkliField>
</template>

<script lang="ts" setup>
import type { FieldListItemTypedArray } from '#blokkli-build/generated-types'
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'slider',
})

defineProps<{
  slides: FieldListItemTypedArray
}>()
</script>
```

The slot renders on the site and in the preview, so you render the nested blocks
yourself, as the `<Carousel>` does in this example. Use `<BlokkliItem>` to
render a block, or render components from the items' props however you wish.

A `<BlokkliItem>` of one of the field's blocks gets its index and its parent's
bundle from the field, as the blocks of any other field do: `renderFor` and the
block's `parentType` see it nested in your block. Pass `index` or `parent-type`
to change them.

While editing, the slot doesn't render: the editor renders the band and the
block the field shows. A field whose layout matters can render the shown block
itself (below).

- `class` goes on the element that holds the band and the block. It takes the
  field's place in its parent, so put classes for that place here, such as a
  grid cell's.
- `tag`, `list-class`, `edit-class` and `non-empty-class` go on the list that
  holds the shown block.
- The shown block knows its parent's bundle, so `renderFor` and `edit-class` can
  adapt it to the container.

The prop is read once. To switch between proxy mode and a normal field, for
example with an option, render two fields with `v-if` and `v-else`.

A wrapper with `position: relative` isn't needed.

## Rendering the Shown Block Yourself

The editor renders the shown block on its own, as its type's component. For a
block whose layout matters, such as a scene with each section's picture on the
left and its text on the right, the field's slot can render it instead: set
`proxy-mode="slot"`. While editing, the slot then renders below the band, and
gets `shownIndex`, the index of the shown block in `items`. It's `null` on the
site, in the preview and for an empty field.

Render the shown block as a `<BlokkliItem>`, keyed by its uuid, with a default
slot around the markup that belongs to it. That markup is the block: editors
select it, edit it inline and add to its nested fields where it is.

::: code-group

```vue [Story/index.vue]
<template>
  <BlokkliField
    v-slot="{ items, shownIndex }"
    name="sections"
    :list="sections"
    proxy-mode="slot"
  >
    <StoryScene :items :shown-index />
  </BlokkliField>
</template>
```

```vue [Story/Scene.vue]
<template>
  <div class="grid gap-12">
    <BlokkliItem v-for="item in visible" :key="item.uuid" v-bind="item">
      <div class="grid grid-cols-2">
        <img :src="item.props.imageUrl" alt="" />
        <div>
          <h3 v-blokkli-editable:field_title>{{ item.props.title }}</h3>
          <BlokkliField name="field_blocks" :list="item.props.blocks" />
        </div>
      </div>
    </BlokkliItem>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

const props = defineProps<{
  items: FieldListItemTyped[]
  shownIndex: number | null
}>()

// On the site, every section; while editing, the one the field shows.
const visible = computed(() => {
  if (props.shownIndex === null) {
    return props.items
  }
  const shown = props.items[props.shownIndex]
  return shown ? [shown] : []
})
</script>
```

:::

- **One `<BlokkliItem>` per block, around all its places.** When a block's
  markup is in two places, such as a picture and its text, wrap an element that
  holds both. Markup outside it is decoration: pressing it selects the block
  that holds the field.
- **What the layout can't show,** render as
  `<BlokkliItem :key="item.uuid" v-bind="item" />`, without a slot: its type's
  component, as the editor would render it. In development, the editor warns
  when the shown block isn't rendered as a `<BlokkliItem>`.
- **The other blocks' `<BlokkliItem>`s render as on the site.** They can't be
  selected or edited where they are: their pages stand in for them. A slider
  that renders every slide can keep doing so.
- `class` goes on the element that holds the band and the slot. `tag`,
  `list-class`, `edit-class` and `non-empty-class` do nothing, as on the site.
- **Limits:**
  - The first node inside the `<BlokkliItem>` must be an element or a component
    with a single root: it's the block's element. Nothing teleported out of it
    counts as the block.
  - The blocks that aren't shown render their nested fields from their props, as
    on the site.

## Structure View (`proxy.vue`)

The editor's Structure view renders every block as a proxy: the label of its
type and its nested fields. Fields in proxy mode render the same way there.

In cases like image carousels, it helps editors to see a bit more context than
just the name of the block. For this, you can implement a _proxy component_,
which the Structure view displays in addition to the label. The pages of a field
in proxy mode don't render it: they show the icon and name of the type.

To do this, create a `proxy.vue` file in the same directory as your main block
component. This file **must not** use the `defineBlokkli` composable.

To continue with our image carousel example, if you have an `image` block in
`~/components/Blokkli/Image/index.vue`, create a file called `proxy.vue` in the
same directory.

::: code-group

```vue [~/components/Blokkli/Image/proxy.vue]
<template>
  <div v-blokkli-droppable:imageSrc>
    <img :src="imageSrc" />
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  imageSrc: string
}>()
</script>
```

Now, in the Structure view, blökkli uses the `proxy.vue` component to display
some additional markup for the `image` block.

:::

![Screenshot showing proxies with a proxy component](/assets/proxy-mode-component.png)

The component will receive the same props as the main block component. However
it does not have access to the usual context (such as `uuid`) or any of the
options defined in your main block component. You may still annotate elements
using the `v-blokkli-droppable` or `v-blokkli-editable` directives to make them
editable in the editor.

It's recommended to keep the contents of the `proxy.vue` component simple. In
particular, keep in mind that the available width can be quite limited, so try
to keep the width and height of the rendered markup as small as possible.
