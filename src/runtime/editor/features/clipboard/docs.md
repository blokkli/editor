## Overview

The feature integrates the user's clipboard with the editor: pasted text, links,
videos, images and files, and files dragged in from the operating system, become
new blocks. Existing blocks can be copied and pasted.

## Existing blocks

Existing blocks can be copy pasted on the same page, with
[adapter.pasteExistingBlocks].

## New blocks

Pasted content starts a drag: the user drops it where the new block should go,
and the fields that allow a bundle for it light up. The
[adapter.clipboardMapBundle] method maps each item to the bundles its block can
have, and [adapter.addBlockFromClipboardItem] adds it.

## Files

Pasted files and files dragged in from the operating system add a block each. A
field accepts them when it allows a bundle for every file, so an image and a PDF
can be dropped together, each with its own bundle. A file the adapter maps to no
bundle, for example because it's too large, is named in a message.

When the adapter implements [adapter.uploadFile], [adapter.getUploadForm],
[adapter.createMediaFromUploads] and [adapter.addBlocksFromUploads], dropping
the files opens a dialog:

- The files upload two at a time, with their progress. A file that fails can be
  uploaded again or removed.
- Each file's media fields (its name, its alternative text, …) are shown below
  it, and filled in while the other files upload.
- When files of a type can become blocks of several bundles, the dialog asks
  which.
- "Add" creates the media, then adds the blocks with one mutation.

Without these methods, each file is read into memory and added with
[adapter.addBlockFromClipboardItem].
