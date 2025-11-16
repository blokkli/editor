# setMutationItemStatus

Set the enabled/disabled status of a mutation item.

## Signature

```typescript
setMutationItemStatus?: (
  index: number,
  status: boolean
) => Promise<MutationResponseLike<T>>
```

## Parameters

### index

The index of the mutation item in the history.

### status

The new status: `true` to enable, `false` to disable.

## Returns

A promise that resolves to a mutation response containing the updated state.

## Description

This method allows temporarily disabling or enabling specific mutations in the
history without removing them. Disabled mutations are not applied when the state
is loaded, but they remain in the history and can be re-enabled later.

This is useful for testing different combinations of changes or temporarily
reverting specific changes while keeping them in the history.

## Example

```typescript
setMutationItemStatus: async (index, status) => {
  await updateMutationStatus(editStateId, index, status)

  return {
    success: true,
    state: await loadCurrentState(),
  }
}
```
