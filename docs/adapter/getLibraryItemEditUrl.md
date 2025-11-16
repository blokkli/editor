# getLibraryItemEditUrl

Build the URL to edit a library item.

## Signature

```typescript
getLibraryItemEditUrl?: (uuid: string) => string
```

## Parameters

### uuid

The UUID of the library item to edit.

## Returns

The URL to the edit form for the library item.

## Description

This method returns the URL that should be opened when a user wants to edit a
reusable block from the library. The URL typically points to the edit form for
the library item entity.

## Example

```typescript
getLibraryItemEditUrl: (uuid) => {
  return `/admin/library-items/${uuid}/edit`
}
```
