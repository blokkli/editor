# useBlokkliHelper

The `useBlokkliHelper()` composable provides the `queryBlocks` method, which
walks the entire block tree and returns a flat, reactive array of matching
blocks.

This is useful when a component needs to know about blocks outside its own field
— for example, a table of contents component that collects all title blocks
across the page.

## queryBlocks

### Filter by Bundle

Pass an array of bundle names to get all blocks of those types:

```vue
<script lang="ts" setup>
const { queryBlocks } = useBlokkliHelper()

// Returns a ComputedRef of all 'title' blocks on the page.
const titles = queryBlocks(['title'])
</script>
```

The returned array is typed based on the bundle names. If you query for
`['title']`, each item in the array will have the correct `props` type for the
`title` bundle.

### Filter by Callback

For more control, pass a callback function. The callback receives each block and
should return an object with `include` (whether to include the block) and
optionally `continueChildren` (whether to walk into nested blocks):

```vue
<script lang="ts" setup>
const { queryBlocks } = useBlokkliHelper()

// Find all blocks that have a specific option value.
const highlightedBlocks = queryBlocks((item) => {
  if (item.options?.highlight === '1') {
    return { include: true }
  }
  return { include: false }
})
</script>
```

Returning `null` or `undefined` from the callback skips the block and all its
children. Setting `continueChildren: false` skips only the children.

## Nested Blocks

`queryBlocks` automatically walks into nested blocks (blocks that contain other
blocks via `<BlokkliField>`). For this to work, the parent block must define
[`propsFieldMapping`](/define-blokkli#propsfieldmapping) so that blökkli knows
which props contain nested block arrays.

## Reactivity

The result is a `ComputedRef` that updates whenever blocks are added, removed,
moved, or have their options changed — including during editing.

## Example: Table of Contents

A component that renders a list of all title blocks on the page:

```vue
<template>
  <nav>
    <ul>
      <li v-for="item in items" :key="item.uuid">
        {{ item.title }}
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { computed, useBlokkliHelper } from '#imports'

const { queryBlocks } = useBlokkliHelper()

const titles = queryBlocks(['title'])

const items = computed(() =>
  titles.value.map((v) => ({
    uuid: v.uuid,
    title: v.props.title,
  })),
)
</script>
```

::: tip

`useBlokkliHelper()` automatically injects the root block list from the nearest
`<BlokkliProvider>`. If the component is not inside a `<BlokkliField>`, you can
pass the block list as the second argument to `queryBlocks`.

:::
