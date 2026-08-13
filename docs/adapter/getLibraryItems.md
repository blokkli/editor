# getLibraryItems()

This method should return the available library items.

The method receives a single `data` argument of type
`BlokkliAdapterGetLibraryItemsData`:

```typescript
type BlokkliAdapterGetLibraryItemsData = {
  bundles: string[]
  page: number
  filters: Record<string, any>
}
```

The `bundles` property contains the bundles that can be placed in the selected
field. The method should only return library items with blocks of one of these
bundles.

It's expected to return a paginated result of `LibraryItem` objects:

```typescript
type BlokkliAdapterGetLibraryItemsResult = {
  items: LibraryItem[]
  total: number
  perPage: number
  filters: PluginConfigInput[]
}
```

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import type { LibraryItem } from '#blokkli/editor/features/library/types'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getLibraryItems: (data) => {
      const items: LibraryItem[] = [
        {
          // The UUID of the library item.
          uuid: 'e011fd53-b083-4db0-a4aa-26c3602916f8',

          // The label of the library item.
          label: 'CTA Button for Newsletter',

          // The bundle of the reusable block.
          bundle: 'link',

          // The FieldListItem of the reusable block. The data is used to render a preview of the block.
          item: {
            uuid: '47f0bf41-bd49-47c2-a2c4-145f80abe161',
            bundle: 'link',
            props: {
              href: '/subscribe-now',
              title: 'Subscribe to our newsletter',
            },
          },
        },
        {
          uuid: '4e7ac454-2b6b-4c45-a01c-34abdd52b792',
          label: 'Contact Card',
          bundle: 'card',
          item: {
            uuid: '3ce777ca-70a5-48fb-b220-7ac2ab052516',
            bundle: 'card',
            props: {
              title: 'Contact us now',
              text: 'Need help? We are here to support.',
              icon: 'phone',
            },
          },
        },
      ]

      const filtered = items.filter((v) => data.bundles.includes(v.bundle))

      return Promise.resolve({
        items: filtered,
        total: filtered.length,
        perPage: 20,
        filters: [],
      })
    },
  }
})
```

:::
