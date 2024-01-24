# takeOwnership()

This method should change the owner of the current edit state to the current
user.

When the [mapState()](/adapter/loadState) method returns `false` for the
`currentUserIsOwner` property, the user can not edit anything on the page and is
instead presented with a banner informing them that someone else is currently
editing the page. They have the option to "take ownership" of editing. When they
click the button, this method is called.

The method should return the updated state where `currentUserIsOwner` is set to
`true`. Else the banner will still be visible.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    takeOwnership: () => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/take-ownership`,
        {
          method: 'post',
        },
      )
    },
  }
})
```

:::
