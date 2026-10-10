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
  | { type: 'image'; fileType: string; fileSize: number; fileName?: string }
  | { type: 'file'; fileType: string; fileSize: number; fileName?: string }
  | { type: 'link'; url: string }
```

While files are dragged in from the operating system, their names are unknown
and their sizes are 0: browsers tell them only at the drop, when the method is
called again.

## Returns

The bundles a block for this clipboard item can have, or `undefined`/`null` if
the item cannot be mapped to a bundle.

## Description

This method is called when a user pastes content into the editor, or drags files
in. Based on the type and content of the clipboard item, the adapter should
return the appropriate block bundles.

For example, pasted plain text might map to a "text" bundle, while a YouTube URL
might map to a "video" bundle.

Each file is mapped on its own. Return `null` for a file the backend would
refuse, such as one too large, or of a type the user can't upload: the editor
then names the file in a message, instead of adding it.

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
