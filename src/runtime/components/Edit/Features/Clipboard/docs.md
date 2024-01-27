## Overview

The feature integrates the user's clipboard with the editor.

## Existing blocks

Existing blocks can be copy pasted on the same page.

## New blocks

When matching contents of the clipboard are pasted into the window, the feature
will display a preview of the clipboard data in the sidebar pane. The preview
can then be drag and dropped as a new block into the page.

For this to work the adapter has to implement the
[adapter.addBlockFromClipboardItem] method.
