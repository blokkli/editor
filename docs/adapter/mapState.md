# mapState()

This method is called whenever one of the other adapter methods returns the
refreshed state.

Its job is to map the state from your type to the expected type by blökkli.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { MappedState } from '#blokkli/types'

type YourStateType = {
  page: {
    title: string
    owner: {
      id: string
      name: string
    }
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
  const user = useCurrentUser()

  const mapState = (yourState: YourStateType): MappedState => {
    return {
      currentIndex: yourState.editState.currentMutationIndex,
      mutations: yourState.editState.mutations.map(mapMutation),
      currentUserIsOwner: yourState.page.owner.id === user.value.id,
      ownerName: yourState.page.owner.name,
      mutatedState: {
        fields: yourState.editState.mutatedFields.map(mapMutatedFields),
      },
      // etc.
    }
  }
  return {
    mapState,
  }
})
```

:::
