# getPublishOptions

Get the publish options for the current edit state.

## Signature

```typescript
getPublishOptions?: () => Promise<PublishOptions>
```

## Returns

A promise that resolves to the publish options configuration.

```typescript
type PublishOptions = {
  canPublish: boolean
  isRevisionable: boolean
  hasRevisionLogMessage: boolean
  lastChanged: string | null
  canSchedule: boolean
  publishOn: string | null
  revisionLogMessage: string | null
}
```

## Description

This method returns information about the publishing capabilities and current
state of the entity being edited. The editor uses this information to display
the appropriate publish UI and options.

## Example

```typescript
getPublishOptions: async () => {
  const entity = await loadEntity()

  return {
    canPublish: entity.hasPermission('publish'),
    isRevisionable: entity.type.isRevisionable,
    hasRevisionLogMessage: entity.type.hasRevisionLog,
    lastChanged: entity.changedTime,
    canSchedule: entity.type.hasScheduling,
    publishOn: entity.publishOn,
    revisionLogMessage: entity.revisionLog,
  }
}
```
