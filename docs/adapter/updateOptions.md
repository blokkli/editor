# updateOptions()

This method updates block options for one or more blocks.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    updateOptions: (items) => {
      // An array of UpdateBlockOptionEvent objects that have these properties:
      // {
      //    uuid: string
      //    key: string
      //    value: string
      // }

      // Example data:
      // {
      //   uuid: '2139b0fa-f407-4014-9d49-1c8a7f090190',
      //   key: 'buttonType',
      //   value: 'secondary',
      // }
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/update-options`,
        {
          method: 'post',
          body: {
            items,
          },
        },
      )
    },
  }
})
```

:::
