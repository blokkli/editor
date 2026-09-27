# getPreviewGrantUrl()

This method should return an URL that allows a person without access to the
editor to see a preview of the current changes being made.

This method is called when the user clicks on the "Preview (with smartphone)"
button in the editor.

Actually granting access is left to the specific implementation. It could be
that opening this URL sets a session cookie that grants read-only permissions to
the edit state.

The method returns a path on the site, such as
`/backend-api/grant-access?grantToken=…`. The editor puts its own origin
(`window.location.origin`) in front of it, so the path must be reachable on the
host the editor runs on.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getPreviewGrantUrl: () => {
      return '/backend-api/grant-access?grantToken=QNeQGCzrBfJ1E83b3kcDKll9RmMsTBDR3Ozb3jYVoAcqTphgNuZlrRmsgAHc2JUj'
    },
  }
})
```

:::
