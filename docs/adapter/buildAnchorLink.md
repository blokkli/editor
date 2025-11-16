# buildAnchorLink

Build the link that is copied when clicking on an anchor link indicator.

## Signature

```typescript
buildAnchorLink?: (id: string, uuid: string) => string
```

## Parameters

### id

The anchor ID (typically from a block's `anchorId` option or similar field).

### uuid

The UUID of the block that has the anchor.

## Returns

The full URL that should be copied to the clipboard.

## Description

This method builds the complete URL that users can copy and share to link
directly to a specific block on the page. The URL typically includes the page
URL plus a hash fragment with the anchor ID.

The anchor link feature requires blocks to have an option or field that provides
an anchor ID.

## Example

```typescript
buildAnchorLink: (id, uuid) => {
  const currentUrl = window.location.origin + window.location.pathname
  return `${currentUrl}#${id}`
}
```
