# unscheduleEditState

Remove a scheduled publication for an edit state.

## Signature

```typescript
unscheduleEditState?: (options: {
  hostEntityType: string
  hostEntityUuid: string
}) => Promise<MutationResponseLike<T | undefined | null>>
```

## Parameters

### hostEntityType

The entity type of the host entity.

### hostEntityUuid

The UUID of the host entity.

## Returns

A promise that resolves to a mutation response, or `undefined`/`null` if
unscheduling is not supported.

## Description

This method removes a previously scheduled publication for the edit state. After
calling this method, the edit state will no longer be automatically published at
the scheduled time.

## Example

```typescript
unscheduleEditState: async (options) => {
  await removeScheduledPublication({
    entityType: options.hostEntityType,
    entityUuid: options.hostEntityUuid,
  })

  return {
    success: true,
    state: null,
  }
}
```
