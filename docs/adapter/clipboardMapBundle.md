# clipboardMapBundle

Determine the block bundle for a clipboard item.

## Signature

```typescript
clipboardMapBundle?: (
  e: ClipboardMapBundleEvent,
) => string | string[] | undefined | null
```

## Parameters

### e

A clipboard event containing information about the pasted content.

```typescript
type ClipboardMapBundleEvent =
  | { type: 'plaintext'; text: string }
  | { type: 'video'; videoService: string; videoId: string }
  | { type: 'image'; fileType: string; fileSize: number }
  | { type: 'file'; fileType: string; fileSize: number }
  | { type: 'link'; url: string }
```

## Returns

The bundle ID that should be created for this clipboard item, or
`undefined`/`null` if the item cannot be mapped to a bundle.

## Description

This method is called when a user pastes content into the editor. Based on the
type and content of the clipboard item, the adapter should return the
appropriate block bundle to create.

For example, pasted plain text might map to a "text" bundle, while a YouTube URL
might map to a "video" bundle.

## Example

```typescript
clipboardMapBundle: (e) => {
  if (e.type === 'plaintext') {
    return 'text'
  } else if (e.type === 'video' && e.videoService === 'youtube') {
    return 'youtube_video'
  } else if (e.type === 'image') {
    return 'image'
  }
  return null
}
```
