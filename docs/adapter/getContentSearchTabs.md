# getContentSearchTabs()

This method should return an array of `ContentSearchTab` objects that define the
available tabs in the search feature. The `id` of each tab is used as the
identifier when calling
[getContentSearchResults()](/adapter/getContentSearchResults) and the `title` is
used as the label in the UI.

```typescript
type ContentSearchTab = {
  id: string
  title: string
  description: string | null
  types: { type: string; bundles: string[] }[]
}
```

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getContentSearchTabs: () => {
      return [
        {
          id: 'images',
          title: 'Images',
          description: null,
          types: [{ type: 'media', bundles: ['image'] }],
        },
        {
          id: 'pages',
          title: 'Pages',
          description: null,
          types: [{ type: 'node', bundles: ['page'] }],
        },
      ]
    },
  }
})
```

:::
