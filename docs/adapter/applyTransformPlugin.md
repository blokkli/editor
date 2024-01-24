# applyTransformPlugin()

This method should apply a selected transformation plugin to the given blocks.

For this feature to work, the
[getTransformPlugins()](/adapter/getTransformPlugins) method must also be
implemented.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    applyTransformPlugin: ({ pluginId, uuids }) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/apply-transform`,
        {
          method: 'post',
          body: {
            pluginId,
            uuids,
          },
        },
      )
    },
  }
})
```

:::
