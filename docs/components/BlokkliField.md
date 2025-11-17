# BlokkliField

The `BlokkliField` component renders a list of blocks and enables drag-and-drop
functionality during editing.

## Usage

```vue
<template>
  <BlokkliField name="content" :list="blocks" />
</template>
```

## Props

### name

- **Type:** `string`
- **Required:** Yes

The machine name of the field being rendered.

### list

- **Type:** `Array<FieldListItem | null> | FieldListItem | null`
- **Required:** No
- **Default:** `[]`

The block items to render. Can be:

- An array of block items
- A single block item
- `null` or `undefined` (renders empty field)

Arrays can contain `null` or `undefined` values, which are filtered out.

### tag

- **Type:** `string`
- **Required:** No
- **Default:** `'div'`

The HTML tag to use for the wrapper element.

### fieldListType

- **Type:** `ValidFieldListTypes`
- **Required:** No
- **Default:** `'default'`

The field list type, used for context-based rendering. Available types are
defined in the module configuration.

Common types: `'default'`, `'inline'`, `'header'`, `'footer'`

### editOnly

- **Type:** `boolean`
- **Required:** No
- **Default:** `false`

If `true`, blocks are only rendered during editing. In normal mode, you're
responsible for rendering the items yourself using the slot.

### listClass

- **Type:** `string | object | array`
- **Required:** No
- **Default:** `''`

CSS classes to apply to the wrapper element. Same as the `:class` prop.

### editClass

- **Type:** `string | object | array`
- **Required:** No
- **Default:** `''`

CSS classes applied only during editing.

### nonEmptyClass

- **Type:** `string`
- **Required:** No
- **Default:** `''`

CSS class applied when the field contains at least one block.

### allowedFragments

- **Type:** `string | string[]`
- **Required:** No
- **Default:** `[]`

List of fragment names that can be added to this field. Note that the
`blokkli_fragment` block bundle must also be allowed in the field configuration.

### dropAlignment

- **Type:** `'horizontal' | 'vertical'`
- **Required:** No

Forces a specific drop alignment during drag-and-drop. Useful for horizontal
layouts.

### proxyMode

- **Type:** `boolean`
- **Required:** No
- **Default:** `false`

Enables proxy mode. In this mode, actual block components are not rendered
during editing. Instead, proxy blocks are rendered in an absolutely positioned
overlay.

This is useful for complex layouts where blocks need to maintain their visual
position but editing should happen in a separate layer.

**Important:** When using proxy mode, you need a wrapper with
`position: relative` somewhere in your layout.

### shouldRenderItem

- **Type:** `(item: FieldListItem) => boolean`
- **Required:** No

Custom function to determine whether a block should be rendered. Useful for
conditional rendering based on block properties.

## Slots

### default

The default slot receives:

#### items

- **Type:** `FieldListItemTyped[]`

The list of blocks after filtering (visibility, options, etc.).

### after

Rendered after the blocks. Receives the same props as the default slot.

## Examples

### Basic Usage

```vue
<template>
  <BlokkliField name="content" :list="page.content" />
</template>
```

### With Custom Classes

```vue
<template>
  <BlokkliField
    name="sidebar"
    :list="page.sidebar"
    list-class="sidebar-container"
    edit-class="min-h-[200px] border-2 border-dashed"
    non-empty-class="has-content"
  />
</template>
```

### Horizontal Layout

```vue
<template>
  <BlokkliField
    name="buttons"
    :list="page.buttons"
    list-class="flex gap-4"
    drop-alignment="horizontal"
    field-list-type="inline"
  />
</template>
```

### With Fragments

```vue
<template>
  <BlokkliField
    name="content"
    :list="page.content"
    :allowed-fragments="['cta', 'contact_form', 'newsletter']"
  />
</template>
```

### Grid Layout

```vue
<template>
  <BlokkliField
    name="grid"
    :list="page.grid"
    class="grid grid-cols-2 lg:grid-cols-4 gap-4"
    edit-class="min-h-[300px]"
    drop-alignment="horizontal"
  />
</template>
```

### Using the Slot

```vue
<template>
  <BlokkliField name="content" :list="page.content" v-slot="{ items }">
    <div class="content-wrapper">
      <TableOfContents :items />
      <!-- Blocks are still rendered automatically -->
    </div>
  </BlokkliField>
</template>
```

### Edit Only Mode

Use `editOnly` when you want full control over rendering in normal mode:

```vue
<template>
  <BlokkliField
    name="featured"
    :list="page.featured"
    edit-only
    v-slot="{ items }"
  >
    <!-- This content only renders in normal mode -->
    <Carousel v-if="!isEditing" :items />
  </BlokkliField>
</template>
```

### Nested Fields

Fields can be nested inside block components:

```vue
<!-- Grid.vue block component -->
<template>
  <section class="grid-section">
    <BlokkliField
      name="header"
      :list="header"
      field-list-type="header"
      list-class="grid-header"
    />
    <BlokkliField
      name="items"
      :list="items"
      class="grid grid-cols-3 gap-4"
      drop-alignment="horizontal"
    />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  header: FieldListItemTyped[]
  items: FieldListItemTyped[]
}>()
</script>
```

### Conditional Rendering

```vue
<template>
  <BlokkliField
    name="content"
    :list="page.content"
    :should-render-item="shouldRender"
  />
</template>

<script setup lang="ts">
const shouldRender = (item: FieldListItem) => {
  // Don't render archived blocks in normal mode
  if (!isEditing && item.options.archived) {
    return false
  }
  return true
}
</script>
```

## Notes

- Must be used inside a `BlokkliProvider` component
- Automatically handles visibility based on block options (language, publish
  dates, etc.)
- During editing, provides drag-and-drop functionality
- Can be nested to create complex layouts
- The `list` prop should reference the same field data passed to the provider's
  `entity` prop
