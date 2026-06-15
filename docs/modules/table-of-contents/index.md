# Table of Contents

The table-of-contents module registers a globally available
`<BlokkliTableOfContents>` component that builds a list of links from the blocks
on a page. It is **renderless** — it resolves the links and hands them to your
template through the default slot, so you own the markup and styling.

The module is **zero-config**.

## Enable the module

```typescript
import tableOfContents from '@blokkli/editor/table-of-contents'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [tableOfContents()],
  },
})
```

The component is registered globally, so `<BlokkliTableOfContents>` can be used
anywhere without importing it.

## Usage

Pass the block bundles to include and a `mapItem` function that turns each
matched block into a link. The default slot receives the resolved `links`:

```vue
<template>
  <BlokkliTableOfContents
    v-slot="{ links }"
    :bundles="['title']"
    option-name="showInMenu"
    :map-item="
      (item) => {
        if (item.bundle === 'title') {
          return { id: item.uuid, label: item.props.title }
        }
        return null
      }
    "
  >
    <nav>
      <ul>
        <li v-for="link in links" :key="link.id">
          <a :href="`#${link.id}`">{{ link.label }}</a>
        </li>
      </ul>
    </nav>
  </BlokkliTableOfContents>
</template>
```

`mapItem` receives the typed block item, so checking `item.bundle` narrows
`item.props` to that bundle's props. Return `null` to skip a block.

The slot content can be inlined as above, or delegated to a child component that
takes the links as a prop:

```vue
<template>
  <BlokkliTableOfContents v-slot="{ links }" :bundles="['title']" :map-item="...">
    <MyMenu :links="links" />
  </BlokkliTableOfContents>
</template>
```

```vue
<!-- MyMenu.vue -->
<script lang="ts" setup>
import type { BlokkliTableOfContentsLink } from '#blokkli/table-of-contents'

defineProps<{ links: BlokkliTableOfContentsLink[] }>()
</script>
```

## Props

| Prop         | Type                                                | Description                                                                  |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| `bundles`    | `string[]`                                          | Block bundles to include. Reusable (library) blocks of these bundles match too. |
| `mapItem`    | `(item) => BlokkliTableOfContentsLink \| null`      | Maps a matched block to a link. Return `null` to skip it.                    |
| `optionName` | `string` _(optional)_                               | Name of a `defineBlokkli` option used to toggle whether a block is included. |

`BlokkliTableOfContentsLink` is `{ id: string; label: string }`.

## Slot

| Slot      | Payload                                         |
| --------- | ----------------------------------------------- |
| `default` | `{ links: BlokkliTableOfContentsLink[] }`       |

## Behaviour

- Blocks are matched by the `bundles` prop, including reusable (library) blocks
  of those bundles.
- With `optionName` set, only blocks whose corresponding option is truthy are
  included — letting editors opt individual blocks in or out (e.g. a
  `showInMenu` checkbox option on the block).
- Globally hidden blocks are always excluded.
- Blocks where `mapItem` returns `null` are dropped.

The type alias `#blokkli/table-of-contents` exports `BlokkliTableOfContentsLink`
for use in your own components.
