# BlokkliItem

The `BlokkliItem` component renders a single block. It is the component that
`BlokkliField` uses internally to render each item in a field, but it is also
globally registered so you can render a block manually — for example when using
[proxy mode](/define-blokkli/proxy-mode) or when you need full control over how
the items of a field are laid out.

In most cases you pass a block item to it directly using `v-bind="item"`, which
spreads the item's `uuid`, `bundle`, `props`, `options` and other fields onto
the component.

## Usage

```vue
<template>
  <BlokkliField v-slot="{ items }" name="slides" :list="slides" proxy-mode>
    <Carousel>
      <BlokkliItem v-for="item in items" v-bind="item" />
    </Carousel>
  </BlokkliField>
</template>
```

## Props

### uuid

- **Type:** `string`
- **Required:** Yes

The UUID of the block to render.

### bundle

- **Type:** `string`
- **Required:** Yes

The bundle (block type) of the block, used to resolve which component to render.

### index

- **Type:** `number`
- **Required:** No
- **Default:** in a field's slot, the block's index in the field; else `0`

The index of the block within its field. This is passed automatically when
rendering via `BlokkliField`. In the slot of a field, a `<BlokkliItem>` of one
of the field's blocks gets it from the field.

### parentType

- **Type:** `string`
- **Required:** No
- **Default:** in a field's slot, the bundle of the block that holds the field;
  else `''`

The bundle of the parent block, used for context-based component rendering (e.g.
rendering a different component depending on the parent block type). In the slot
of a field, a `<BlokkliItem>` of one of the field's blocks gets it from the
field, as the blocks `BlokkliField` renders itself do.

### isEditing

- **Type:** `boolean`
- **Required:** No
- **Default:** `false`

Whether the block is being rendered in editing mode.

### options

- **Type:** `object`
- **Required:** No
- **Default:** `{}`

The block's options. Usually passed through from the block item via
`v-bind="item"`.

### props

- **Type:** `object`
- **Required:** No
- **Default:** `{}`

The block's props (its actual data). Usually passed through from the block item
via `v-bind="item"`.

### editContext

- **Type:** `BlockEditContext`
- **Required:** No

Editing context for the block. Passed through automatically during editing.

### isVisible

- **Type:** `boolean`
- **Required:** No

Whether the block should be considered visible. Passed through from the block
item.

## Examples

### Rendering a Field Manually

When a field is in proxy mode, its slot renders the nested blocks on the site
and in the preview, and you are responsible for rendering them yourself. The
`items` slot prop provides the (filtered) block items, which you can pass
straight to `BlokkliItem` using `v-bind`:

```vue
<template>
  <BlokkliField v-slot="{ items }" name="slides" :list="slides" proxy-mode>
    <Carousel>
      <BlokkliItem v-for="item in items" v-bind="item" />
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

## Slots

### default

Renders your markup instead of the block type's component, as that block: the
markup has the block's context, so `v-blokkli-editable`, `<BlokkliEditable>` and
a `<BlokkliField>` inside it address the block's fields. Use it in a field with
`proxy-mode="slot"`, whose slot renders the shown block in its own layout; see
[Rendering the Shown Block Yourself](/define-blokkli/proxy-mode#rendering-the-shown-block-yourself).

```vue
<template>
  <BlokkliItem :key="item.uuid" v-bind="item">
    <div class="grid grid-cols-2">
      <img :src="item.props.imageUrl" alt="" />
      <h3 v-blokkli-editable:field_title>{{ item.props.title }}</h3>
    </div>
  </BlokkliItem>
</template>
```

- **Key it by the block's uuid.** It resolves its component and its context when
  it's created, so a `<BlokkliItem>` reused for another block keeps the first
  one's.
- **One per block,** around all the places its markup is in. While editing, its
  first element is the block's element: it must be an element or a component
  with a single root.
- On the site, it renders the slot with the block's context.

## Notes

- Must be used inside a `BlokkliProvider` component.
- It is globally registered, so it does not need to be imported.
- Passing the entire block item with `v-bind="item"` is the recommended way to
  supply `uuid`, `bundle`, `props` and `options` at once.
- `BlokkliField` renders blocks using `BlokkliItem` internally — render it
  manually only when you need control over the markup (e.g. proxy mode).
