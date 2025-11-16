# getEditStates

Search for edit states across the system.

## Signature

```typescript
getEditStates?: (page?: number) => Promise<{
  items: GetEditStatesItem[]
  total: number
  perPage: number
}>
```

## Parameters

### page

Optional page number for pagination (0-based).

## Returns

A promise that resolves to paginated edit states results.

```typescript
type GetEditStatesItem = {
  hostEntityType: string
  hostEntityUuid: string
  entity: {
    label?: string
    status?: boolean
    bundleLabel?: string
  }
  currentUserIsOwner: boolean
}
```

## Description

This method returns a list of edit states that exist in the system, typically
showing unpublished changes across different entities. This is useful for
editors to see where they have pending changes or to find edit states created by
other users.

## Example

```typescript
getEditStates: async (page = 0) => {
  const perPage = 20
  const results = await searchEditStates({
    offset: page * perPage,
    limit: perPage,
  })

  return {
    items: results.items.map((item) => ({
      hostEntityType: item.entityType,
      hostEntityUuid: item.entityUuid,
      entity: {
        label: item.entityLabel,
        status: item.entityStatus,
        bundleLabel: item.bundleLabel,
      },
      currentUserIsOwner: item.userId === currentUser.id,
    })),
    total: results.total,
    perPage,
  }
}
```
