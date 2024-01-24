# resolveComment()

Resolves a comment.

The method is called when the user clicks on the "Resolve" button on an
unresolved comment.

The return value should be an array of `CommentItem` objects, where the comment
being resolved is marked as resolved.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    resolveComment: (uuid: string) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/resolve-comment`,
        {
          method: 'post',
          body: {
            // The UUID of the comment that should be resolved.
            uuid,
          },
        },
      )
    },
  }
})
```

:::
