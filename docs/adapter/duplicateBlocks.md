# duplicateBlocks()

This method should duplicate one or more blocks.

The method is called when the user clicks duplicate when one or more blocks are
selected.

::: warning IMPORTANT

The UUIDs don't have to be part of the same field. It's possible to duplicate
several blocks that are spread in multiple fields. It's up to the specific
implementation how the blocks are duplicated.

For example, if three subsequent blocks are duplicated:

`[Title]` `[Text]` `[Link]`

The resulting state should be:

`[Title]` `[Text]` `[Link]` `[Title]` `[Text]` `[Link]`

And not:

`[Title]` `[Title]` `[Text]` `[Text]` `[Link]` `[Link]`

:::

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    duplicateBlocks: (uuids) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/duplicate-blocks`,
        {
          method: 'post',
          body: {
            // The UUIDs of the blocks being duplicated.
            uuids,
          },
        },
      )
    },
  }
})
```

:::
