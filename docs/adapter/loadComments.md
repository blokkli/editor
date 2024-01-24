# loadComments()

Loads the comments for the current edit state.

The method is called when the editor is mounted and should return all comments
that belong to the host entity.

The return value should be an array of `CommentItem` objects.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { CommentItem } from '#blokkli/types'

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    loadComments: () => {
      const comments: CommentItem[] = [
        {
          // The UUID of the comment.
          uuid: '72633ab5-2353-45ce-8a1b-3726c7da8679',

          // The UUIDs of the blocks the comment is referring to.
          blockUuids: [
            '96f7fbda-04d9-4662-9a6c-6aa3bcf964f2',
            '59b6db95-f4ca-4dd7-86a4-3ad53e66571b',
          ],

          // Whether the comment has been resolved or not.
          resolved: false,

          // The comment text.
          body: 'Can we merge these two blocks?',

          // Timestamp of when the comment was added (as seconds since UNIX epoch).
          created: 1706109810,

          // The user that added the comment. Currently only label is implemented.
          user: {
            label: 'John Wayne',
          },
        },

        {
          uuid: '4ce7b4f0-da66-4ae6-9378-c47eb7b7158e',

          // A comment can also not reference any block.
          blockUuids: [],
          resolved: true,
          body: 'We still need a hero image for the landing page.',
          created: 1705733562,

          user: {
            label: 'Martha Meier',
          },
        },
      ]

      return Promise.resolve(comments)
    },
  }
})
```

:::
