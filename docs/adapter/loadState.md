# loadState()

Load edit state in the given langcode.

The method is expected to return the state object that you define in the generic
argument of `defineBlokkliEditAdapter()`.

The returned object will then be passed to the [adapter.mapState] method of your
adapter.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

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
    loadState: async (): YourStateType => {
      const response = await $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/get-state`,
      )
      return response.data
    },
  }
})
```

:::
