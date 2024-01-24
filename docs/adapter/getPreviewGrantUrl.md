# getPreviewGrantUrl()

This method should return an URL that allows a person without access to the
editor to see a preview of the current changes being made.

This method is called when the user clicks on the "Preview (with smartphone)"
button in the editor.

Actually granting access is left to the specific implementation. It could be
that opening this URL sets a session cookie that grants read-only permissions to
the edit state.

The returned URL should be a fully valid URL starting with https://.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getPreviewGrantUrl: () => {
      return 'https://example.com/backend-api/grant-access?grantToken=QNeQGCzrBfJ1E83b3kcDKll9RmMsTBDR3Ozb3jYVoAcqTphgNuZlrRmsgAHc2JUj'
    },
  }
})
```

:::
