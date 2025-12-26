## Overview

The fragments feature implements a way to create non-editable content fragments
that can be placed on multiple pages. A fragment can be anything from a simple
button to a complex section, for example:

- CTA section with title, lead and CTA button
- Pricing table
- Table of contents
- Contact form

A fragment is entirely defined by your app and does not have to rely on data
from your backend.

In the background, a fragment is rendered using the special `blokkli_fragment`
block bundle. For fragments to work your backend must provide a block of this
bundle. The block stores the `name` of the fragment.

## Defining fragments

Defining a fragment is similar to defining a normal block component. But instead
of `defineBlokkli` you have to use `defineBlokkliFragment`:

```vue
<template>
  <div>
    <h2>This is my fragment!</h2>
  </div>
</template>

<script setup lang="ts">
defineBlokkliFragment({
  name: 'my_demo_fragment',
  label: 'My Demo Fragment',
  description: 'Renders a simple text.',
  editor: {
    previewWidth: 1200,
  },
})
</script>
```

The argument of the composable is similar to the one of `defineBlokkli`, but
instead of `bundle` you define both a `name` and `label` (both are required) and
an option `description`. Other properties like `options`, `globalOptions` or
`editor` are also available.

## Data structure

For blökkli to render the correct fragment a block of bundle `blokkli_fragment`
must exist.

To render a fragment, the following data structure is needed:

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="1"
  >
    <BlokkliField :list="blocks" name="blocks" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
const blocks = [
  {
    uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
    bundle: 'blokkli_fragment',
    props: {
      name: 'my_demo_fragment',
    },
  },
]
</script>
```

:::

The block must provide the name of the fragment as the only prop. blökkli will
then render the fragment component that matches this name.

Options work as you would expect:

```typescript
const blocks = [
  {
    uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
    bundle: 'blokkli_fragment',
    options: {
      myDemoOption: true,
    },
    props: {
      name: 'my_demo_fragment',
    },
  },
]
```
