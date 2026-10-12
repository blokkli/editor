# loadState()

Load edit state in the given langcode.

The method is expected to return the state object that you define in the generic
argument of `defineBlokkliEditAdapter()`.

The returned object will then be passed to the [adapter.mapState] method of your
adapter.

If the method throws, the editor shows a banner: the state could not be loaded.
To tell the user why, throw a `StateUnavailableError`. Its message replaces the
banner's general hint, so write it for the user:

```typescript
import { StateUnavailableError } from '#blokkli/editor/adapter'

throw new StateUnavailableError('This page is being imported. Try again later.')
```

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

type YourStateType = {
  page: {
    title: 'My page'
  }
  editState: {
    currentMutationIndex: number
    mutations: any[]
    mutatedFields: any[]
    violations: any[]
    // etc.
  }
}

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    loadState: async (): Promise<YourStateType | undefined> => {
      const response = await $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/get-state`,
      )
      return response.data
    },
  }
})
```

:::
