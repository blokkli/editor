# getUserPermissions()

This method should return the permissions of the current user. Based on these
permissions, the editor enables or disables certain features.

This is a **required** adapter method.

## Permissions

The base permission is `use_blokkli` which grants access to the editor. Features
can register additional permissions via module augmentation of the
`UserPermissionMap` interface. For example, the agent module registers a
`use_agent` permission.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getUserPermissions: async () => {
      const user = await $fetch('/api/user/permissions')

      const permissions: string[] = ['use_blokkli']

      if (user.canUseAgent) {
        permissions.push('use_agent')
      }

      return permissions
    },
  }
})
```

:::
