# Block Components

Each Drupal paragraph type needs a corresponding Vue component. The component
receives the paragraph's content as props and uses `defineBlokkli()` to register
itself with the editor.

## Basic Block

A text paragraph with inline editing:

::: code-group

```vue [~/components/Paragraph/Text/index.vue]
<template>
  <div v-blokkli-editable:field_text class="ck-content" v-html="text" />
</template>

<script lang="ts" setup>
defineProps<{ text: string }>()

defineBlokkli({
  bundle: 'text',
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.textContent,
  },
})
</script>
```

:::

::: code-group

```graphql [~/components/Paragraph/Text/fragment.graphql]
fragment paragraphText on ParagraphText {
  text: fieldText
}
```

:::

Key points:

- **`bundle: 'text'`** must match the Drupal paragraph type machine name
- **`v-blokkli-editable:field_text`** enables inline editing for the
  `field_text` Drupal field
- **`export type Props`** is used by `getBundlePropsType` for type generation

## Block with Media

For paragraphs that reference media entities, use `v-blokkli-droppable` to make
the media field a drop target:

::: code-group

```vue [~/components/Paragraph/Image/index.vue]
<template>
  <figure v-if="image">
    <img v-blokkli-droppable:field_image :src="image.url" :alt="image.alt" />
    <figcaption v-if="image.caption">{{ image.caption }}</figcaption>
  </figure>
</template>

<script lang="ts" setup>
defineProps<{
  image: {
    url: string
    alt: string
    caption?: string
  }
}>()

defineBlokkli({
  bundle: 'image',
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
  },
})
</script>
```

:::

The `v-blokkli-droppable:field_image` directive allows users to drag media items
from the media library and drop them onto this element to replace the image.

## Block with Nested Paragraphs

Paragraphs that contain other paragraphs (e.g. a grid or carousel) use
`<BlokkliField>` for the nested fields:

::: code-group

```vue [~/components/Paragraph/TwoColumns/index.vue]
<template>
  <div class="grid grid-cols-2 gap-8">
    <div>
      <BlokkliField :list="left" name="field_left" />
    </div>
    <div>
      <BlokkliField :list="right" name="field_right" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphTwoColumnsFragment } from '#graphql-operations'

defineProps<{
  left: ParagraphTwoColumnsFragment['left']
  right: ParagraphTwoColumnsFragment['right']
}>()

defineBlokkli({
  bundle: 'two_columns',
  propsFieldMapping: {
    left: 'field_left',
    right: 'field_right',
  },
  editor: {
    disableEdit: true,
    icon: 'bk_mdi_view_column_2',
  },
})
</script>
```

:::

::: code-group

```graphql [~/components/Paragraph/TwoColumns/fragment.graphql]
fragment paragraphTwoColumns on ParagraphTwoColumns {
  left: fieldLeft {
    ...paragraphsFieldItem
    props {
      ...paragraphText
      ...paragraphImage
    }
  }
  right: fieldRight {
    ...paragraphsFieldItem
    props {
      ...paragraphText
      ...paragraphImage
    }
  }
}
```

:::

Important:

- **`propsFieldMapping`** maps the Vue prop names to Drupal field names — this
  is required for nested blocks so blökkli can walk the block tree correctly
- Nested paragraph fields follow the same two-part structure
  (`paragraphsFieldItem` + `props`)
- You **cannot** use `...paragraph` inside nested fragments because that would
  create a recursive reference — instead, spread each allowed bundle fragment
  explicitly (e.g. `...paragraphText`, `...paragraphImage`)

## Block with Options

Block options are stored as paragraph behavior settings in Drupal. Define them
in `defineBlokkli()` and they are automatically saved and restored:

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',
  options: {
    variant: {
      type: 'radios',
      label: 'Variant',
      default: 'default',
      options: {
        default: 'Default',
        highlighted: 'Highlighted',
      },
    },
  },
  globalOptions: ['background'],
})
</script>
```

Options are synced to Drupal automatically by the adapter. No additional GraphQL
setup is needed — the `paragraphsBlokkliOptions` field in the
`paragraphsFieldItem` fragment handles it.

## Block with Drag Handle

If your block has a wrapper element that shouldn't be part of the draggable
area, use `ref="blokkliDraggable"` on the inner content element:

```vue
<template>
  <div class="container">
    <div ref="blokkliDraggable" class="card">
      <h3 v-blokkli-editable:field_title>{{ title }}</h3>
      <p v-blokkli-editable:field_text>{{ text }}</p>
    </div>
  </div>
</template>
```

See [blokkliDraggable](/define-blokkli/editor#blokklidraggable-template-ref) for
details.

## Naming Convention

By convention, paragraph components are placed in a directory matching the
paragraph type name in PascalCase:

```
components/
  Paragraph/
    Text/
      index.vue
      fragment.graphql
    Image/
      index.vue
      fragment.graphql
    TwoColumns/
      index.vue
      fragment.graphql
```

The directory name doesn't affect functionality — only the `bundle` value in
`defineBlokkli()` matters. But consistent naming makes it easy to find
components.

## Fragment Naming Convention

The Drupal module automatically configures `getBundlePropsType` to derive
TypeScript types from the bundle name. For a bundle called `text`, it expects a
GraphQL fragment type called `ParagraphTextFragment` (from
`#graphql-operations`).

This means your GraphQL fragments **must** follow this naming pattern:

| Bundle name   | Required fragment name | Generated type                |
| ------------- | ---------------------- | ----------------------------- |
| `text`        | `paragraphText`        | `ParagraphTextFragment`       |
| `image`       | `paragraphImage`       | `ParagraphImageFragment`      |
| `two_columns` | `paragraphTwoColumns`  | `ParagraphTwoColumnsFragment` |

As long as this convention is followed, you get fully typed block props when
using `siblings`, `rootBlocks`, or the `<BlokkliField>` slot — without any extra
configuration.
