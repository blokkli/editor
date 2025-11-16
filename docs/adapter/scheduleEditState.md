# scheduleEditState

Schedule an edit state to be published at a specific date and time.

## Signature

```typescript
scheduleEditState?: (options: {
  hostEntityType: string
  hostEntityUuid: string
  revisionLogMessage?: string
  date: string
}) => Promise<MutationResponseLike<T | undefined | null>>
```

## Parameters

### hostEntityType

The entity type of the host entity.

### hostEntityUuid

The UUID of the host entity.

### revisionLogMessage

Optional revision log message describing the changes.

### date

The ISO 8601 date and time when the edit state should be published.

## Returns

A promise that resolves to a mutation response, or `undefined`/`null` if
scheduling is not supported.

## Description

This method schedules the current edit state to be automatically published at a
future date and time. The backend should store this schedule and publish the
changes when the scheduled time is reached.

## Example

```typescript
scheduleEditState: async (options) => {
  await schedulePublication({
    entityType: options.hostEntityType,
    entityUuid: options.hostEntityUuid,
    publishAt: options.date,
    message: options.revisionLogMessage,
  })

  return {
    success: true,
    state: null,
  }
}
```
