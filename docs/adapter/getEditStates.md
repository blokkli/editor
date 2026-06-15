# getEditStates

Search for edit states across the system.

## Signature

```typescript
getEditStates?: (e?: AdapterSearchArguments) => Promise<{
  items: GetEditStatesItem[]
  total: number
  perPage: number
  filters: PluginConfigInput[]
}>
```

## Parameters

### e

Optional search arguments containing the requested `page` (0-based) and the
selected `filters`.

```typescript
type AdapterSearchArguments = {
  page: number
  filters: Record<string, any>
}
```

## Returns

A promise that resolves to paginated edit states results, including the
available filters.

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
  lastChanged: string
  pendingChanges: number
  ownerName: string
  url: string
}
```

## Description

This method returns a list of edit states that exist in the system, typically
showing unpublished changes across different entities. This is useful for
editors to see where they have pending changes or to find edit states created by
other users.

## Example

```typescript
getEditStates: async (e) => {
  const page = e?.page ?? 0
  const perPage = 20
  const results = await searchEditStates({
    offset: page * perPage,
    limit: perPage,
    filters: e?.filters,
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
      lastChanged: item.lastChanged,
      pendingChanges: item.pendingChanges,
      ownerName: item.ownerName,
      url: item.url,
    })),
    total: results.total,
    perPage,
    filters: [],
  }
}
```
