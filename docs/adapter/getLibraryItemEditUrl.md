# getLibraryItemEditUrl

Build the URL to edit a library item.

## Signature

```typescript
getLibraryItemEditUrl?: (e: AdapterGetLibraryItemEditUrl) => string | null
```

## Parameters

### e.libraryItemUuid

The UUID of the library item to edit.

### e.libraryItemId

The ID of the library item, or `null`. It comes from the `id` of the
`libraryItem` prop of the block that places the library item.

## Returns

The URL of the page that edits the library item, or `null` if it can't be built.
Without a URL, the block's "Edit" action is disabled.

## Description

"Edit" on a reusable block opens this URL in an overlay. The page edits the
library item in blökkli, so the URL usually contains `blokkliEditing` with the
library item's UUID.

## Example

```typescript
getLibraryItemEditUrl: (e) => {
  if (!e.libraryItemId) {
    return null
  }
  return `/library-item/${e.libraryItemId}?blokkliEditing=${e.libraryItemUuid}`
}
```
