# convertBlocks()

This method should convert the given block UUIDs to the given target bundle.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    convertBlocks: (uuids: string[], targetBundle: string) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/convert-blocks`,
        {
          method: 'post',
          body: {
            uuids,
            targetBundle,
          },
        },
      )
    },
  }
})
```

:::
