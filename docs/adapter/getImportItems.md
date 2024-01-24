# getImportItems()

This method should return possible sources to import existing blocks into the
current page.

It's expected to return an object with this type:

```
{ items: ImportItem[]; total: number }
```

The method is called when the user opens the "Import from existing" dialog. It
receives an argument containing the search text entered by the user to filter
the available import sources.

For this feature to work the [importFromExisting()](/adapter/importFromExisting)
method must also be implemented.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getImportItems: (searchText?: string) => {
      return Promise.resolve({
        total: 2,
        items: [
          {
            uuid: '1645ba79-8770-4a0c-a58b-163a847eea22',
            label: 'Example page 1',
          },
          {
            uuid: '27e417eb-a5fa-4d17-94b5-e218fc653906',
            label: 'Another example page',
          },
        ],
      })
    },
  }
})
```

:::
