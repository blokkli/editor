# addBlockFromClipboardItem()

This method should create a new block from the given clipboard item.

The method is called when the user pastes clipboard contents into the page.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    addBlockFromClipboardItem: (e) => {
      if (e.item.itemBundle === 'text') {
        return $fetch(
          `/backend-api/edit/${ctx.value.entityUuid}/add-text-block`,
          {
            method: 'post',
            body: {
              // Contains the clipboard data, in this case a string.
              text: e.item.clipboardData,

              // The parent entity type where the block is being added.
              // Could be the entity type of the <BlokkliProvider> or in
              // case of nested blocks, the entity type of the block.
              entityType: e.host.type,
              entityUuid: e.host.uuid,

              // The field name where the block is added.
              fieldName: e.host.fieldName,

              // The UUID of the block that should be before the new one.
              preceedingUuid: e.afterUuid,
            },
          },
        )
      }
    },
  }
})
```

:::
