# Fragments

Fragments are reusable content sections that can be placed into a
`<BlokkliField>` using the `allowedFragments` prop. Unlike regular blocks,
fragments don't have a backend entity — they are defined entirely in the
frontend.

A fragment is a Vue component that uses `defineBlokkliFragment()` instead of
`defineBlokkli()`. It inherits the block context (UUID, options, index, etc.)
from its parent fragment block.

## Defining a Fragment

Fragment components are placed in a dedicated directory (e.g.,
`~/components/Blokkli/Fragment/`) and use the `defineBlokkliFragment()`
composable:

```vue
<template>
  <div class="cta-section">
    <h2>Call to Action</h2>
    <p>Subscribe to our newsletter.</p>
  </div>
</template>

<script lang="ts" setup>
defineBlokkliFragment({
  name: 'cta',
  label: 'CTA',
  description: 'Provides a large CTA section.',
  editor: {
    previewWidth: 1200,
  },
})
</script>
```

## Configuration

### name

**Type:** `string` (required)

The unique name of this fragment. Used to reference it in the `allowedFragments`
prop on `<BlokkliField>`.

### label

**Type:** `string` (required)

The human-readable label displayed in the editor.

### description

**Type:** `string`

A short description of what the fragment renders.

### chunkName

**Type:** `string`

The chunk group for code splitting, same as in `defineBlokkli()`.

### options

**Type:** [type.BlockDefinitionOptionsInput]

Define options for this fragment. Works the same as block options.

```vue
<script lang="ts" setup>
const { options } = defineBlokkliFragment({
  name: 'hero',
  label: 'Hero',
  options: {
    variant: {
      type: 'radios',
      label: 'Variant',
      default: 'default',
      options: {
        default: 'Default',
        large: 'Large',
      },
    },
  },
})
</script>
```

### globalOptions

**Type:** `GlobalOptionsKey[]`

Reference global options defined in `nuxt.config.ts`, same as in
`defineBlokkli()`.

### editor

**Type:** [type.BlokkliDefinitionInputEditorBase]

Editor behaviour settings (e.g., `previewWidth`, `icon`).

## Using Fragments in a Field

To allow a fragment to be placed in a `<BlokkliField>`, use the
`allowedFragments` prop:

```vue
<template>
  <BlokkliField
    name="content"
    :list="blocks"
    allowed-fragments="cta"
  />
</template>
```

You can allow multiple fragments:

```vue
<BlokkliField
  name="content"
  :list="blocks"
  :allowed-fragments="['cta', 'hero']"
/>
```

## Return Value

`defineBlokkliFragment()` returns the same context object as `defineBlokkli()`:

- `uuid` — The block UUID
- `index` — Reactive index in the field
- `options` — Reactive computed options
- `parentType` — Parent block bundle if nested
- `fieldListType` — The field list type
- `siblings` — All blocks in the same field
- `rootBlocks` — Root-level blocks
- `provider` — Provider entity context

See [Block Context](/define-blokkli/block-context) for details.

## Configuration

Fragments require the `fragmentBlockBundle` option to be set in your
`nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  blokkli: {
    fragmentBlockBundle: 'blokkli_fragment',
  },
})
```

This tells blökkli which block bundle wraps fragment components.
