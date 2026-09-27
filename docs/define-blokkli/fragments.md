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
composable. The directory must be covered by the module's `pattern` option, like
block components. With the Drupal module's default patterns, use e.g.
`~/components/Paragraph/BlokkliFragment/<Name>/index.vue`.

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

Editor behaviour settings (e.g., `previewWidth`, `icon`). Unlike blocks,
fragments don't pick up an `icon.svg` next to the component: set `editor.icon`.

The argument of `defineBlokkliFragment()` must be a static object literal, as
for `defineBlokkli()`.

## Using Fragments in a Field

To allow a fragment to be placed in a `<BlokkliField>`, use the
`allowedFragments` prop:

```vue
<template>
  <BlokkliField name="content" :list="blocks" allowed-fragments="cta" />
</template>
```

The default is an empty list: without the prop, editors can't add fragments to
the field.

You can allow multiple fragments:

```vue
<BlokkliField
  name="content"
  :list="blocks"
  :allowed-fragments="['cta', 'hero']"
/>
```

The field must also allow the fragment block bundle (`blokkli_fragment` by
default) in the backend. Fragments that are already in a field keep rendering
even if the prop doesn't list them.

## Fragments that load data

A fragment can load its own data, e.g. the latest news, in an async setup:

```vue
<script lang="ts" setup>
// Before the first await.
defineBlokkliFragment({
  name: 'latest_news',
  label: 'Latest news',
  editor: {
    icon: 'bk_mdi_news',
    previewWidth: 800,
  },
})

const { data } = await useAsyncData('latest-news', () => fetchLatestNews())
</script>
```

- **Call `defineBlokkliFragment()` first, before any `await`.** It registers the
  block with the editor.
- **It works in every mode:** on the server, while editing, and in the preview
  of the add dialog, which renders the real component at `previewWidth` (default
  400). The preview runs the query too; `editor.noPreview` turns it off.
- **Render one root element, always.** While editing, show a placeholder when
  there's no data: the editor needs an element to select and drag.
- **Don't throw on a failed request.** An error in an async setup takes the page
  down with it. Render nothing instead.
- **Make the key depend on everything the data depends on,** e.g. the language
  of the page.

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

## The Fragment Block Bundle

In the backend, a fragment is a block of the bundle set by the
`fragmentBlockBundle` option, which stores the fragment's name. The default is
`blokkli_fragment`, which the Drupal module uses. Only set it if your backend
uses another bundle:

```typescript
export default defineNuxtConfig({
  blokkli: {
    fragmentBlockBundle: 'my_fragment',
  },
})
```
