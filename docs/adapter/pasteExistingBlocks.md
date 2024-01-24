# pasteExistingBlocks()

This method should duplicate the given existing blocks at the given location.

Unlike [duplicateBlocks()](/adapter/duplicateBlocks), which duplicates block in
place, this method should duplicate existing blocks at a different location.

The method is called when a user selects one or more blocks, presses Ctrl/Cmd+C
to copy them to the clipboard and then presses Ctrl/Cmd-V to paste.

The pasting doesn't have to happen in a separate location. Pasting can happen
while the blocks are still selected. In this case it's up to the specific
implementation to decide what to do.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    pasteExistingBlocks: (uuids) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/paste-existing-blocks`,
        {
          method: 'post',
          body: {
            // The UUIDs of the blocks being pasted.
            uuids,

            // The parent entity type where the block is being added.
            // Could be the entity type of the <BlokkliProvider> or in case of nested blocks, the entity type of the block.
            entityType: e.host.type,
            entityUuid: e.host.uuid,

            // The field name where the block is added.
            fieldName: e.host.fieldName,

            // The UUID of the block that should be before the new one.
            // If undefined, the block should be moved to index 0 of the field list.
            preceedingUuid: e.afterUuid,
          },
        },
      )
    },
  }
})
```

:::
