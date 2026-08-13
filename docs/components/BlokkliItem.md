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
- **Default:** `0`

The index of the block within its field. This is passed automatically when
rendering via `BlokkliField`.

### parentType

- **Type:** `string`
- **Required:** No
- **Default:** `''`

The bundle of the parent block, used for context-based component rendering (e.g.
rendering a different component depending on the parent block type).

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

When a field is in proxy mode, you are responsible for rendering its nested
blocks yourself. The `items` slot prop provides the (filtered) block items,
which you can pass straight to `BlokkliItem` using `v-bind`:

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

## Notes

- Must be used inside a `BlokkliProvider` component.
- It is globally registered, so it does not need to be imported.
- Passing the entire block item with `v-bind="item"` is the recommended way to
  supply `uuid`, `bundle`, `props` and `options` at once.
- `BlokkliField` renders blocks using `BlokkliItem` internally — render it
  manually only when you need control over the markup (e.g. proxy mode).
