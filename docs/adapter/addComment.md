# addComment()

Adds a new comment.

The method is called when the user either adds a new comment to one or more
blocks or when they add a reply to an existing comment.

The return value should be an array of `CommentItem` objects, where the newly
added comment is also included.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    addComment: (blockUuids: string[], body: string) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/add-comment`, {
        method: 'post',
        body: {
          // The UUIDs of the blocks being commented on.
          blockUuids,

          // The comment text.
          body,
        },
      })
    },
  }
})
```

:::
