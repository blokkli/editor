# importFromExisting()

This method should import blocks from the given source entity and field.

The method is called when the user opens the "Import from existing" dialog,
selects a source entity and one or more fields and clicks on submit.

For this feature to work the `getHostEntities()` method must also be implemented
— the dialog reuses the workspaces provider's host entity list, filtered to
entities of the same bundle as the current page.

The user also needs the `list_entities` permission (see
[getUserPermissions()](/adapter/getUserPermissions)): the list has every entity,
also the ones that the user may not view.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    importFromExisting: (e) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/import-from-existing`,
        {
          method: 'post',
          body: {
            // The UUID of the source entity from which to import blocks.
            sourceUuid: e.sourceUuid, // e.g. "1645ba79-8770-4a0c-a58b-163a847eea22"

            // The fields from which to import blocks.
            sourceFields: e.sourceFields, // e.g. ["field_content_blocks", "field_footer_blocks"]
          },
        },
      )
    },
  }
})
```

:::
