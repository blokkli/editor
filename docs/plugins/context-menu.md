# PluginContextMenu

Creates a context menu (right-click menu) for an element with customizable menu
items.

## Usage

```vue
<template>
  <PluginContextMenu id="block-menu" :menu="menuItems">
    <div>Right-click me!</div>
  </PluginContextMenu>
</template>

<script setup lang="ts">
import { PluginContextMenu } from '#blokkli/editor/plugins'
import type { ContextMenu } from '#blokkli/types'

const menuItems: ContextMenu[] = [
  {
    type: 'button',
    label: 'Edit',
    icon: 'edit',
    callback: () => {
      // Edit action...
    },
  },
  {
    type: 'rule',
  },
  {
    type: 'button',
    label: 'Delete',
    icon: 'delete',
    callback: () => {
      // Delete action...
    },
  },
]
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this context menu. Used to track which menu is currently
open.

### menu

- **Type:** `ContextMenu[]`
- **Required:** Yes

Array of menu items to display. Each item is either a button or a rule
(separator).

**Menu Item Types:**

```typescript
type ContextMenuButton = {
  type: 'button'
  label: string
  icon: BlokkliIcon
  callback: () => void
}

type ContextMenuRule = {
  type: 'rule'
}

type ContextMenu = ContextMenuButton | ContextMenuRule
```

### tag

- **Type:** `string`
- **Required:** No
- **Default:** `'div'`

The HTML tag to use for the wrapper element.

## Slots

### default

The content that should trigger the context menu on right-click.

## Menu Item Types

### Button

A clickable menu item with a label, icon, and callback:

```typescript
{
  type: 'button',
  label: 'Copy',
  icon: 'copy',
  callback: () => copyItem(),
}
```

### Rule (Separator)

A visual separator between menu items:

```typescript
{
  type: 'rule',
}
```

## Real-World Examples

### Block Context Menu

```vue
<template>
  <PluginContextMenu id="block-actions" :menu="blockMenu">
    <div class="block-wrapper">
      <slot />
    </div>
  </PluginContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PluginContextMenu } from '#blokkli/editor/plugins'
import type { ContextMenu } from '#blokkli/types'

const props = defineProps<{
  uuid: string
}>()

const blockMenu = computed<ContextMenu[]>(() => [
  {
    type: 'button',
    label: 'Edit Block',
    icon: 'edit',
    callback: () => editBlock(props.uuid),
  },
  {
    type: 'button',
    label: 'Duplicate',
    icon: 'duplicate',
    callback: () => duplicateBlock(props.uuid),
  },
  {
    type: 'rule',
  },
  {
    type: 'button',
    label: 'Delete',
    icon: 'delete',
    callback: () => deleteBlock(props.uuid),
  },
])
</script>
```

## Notes

- Only one context menu can be open at a time
- The menu automatically positions itself based on cursor position
- Right-clicking outside the menu closes it
- The context menu is teleported to the main layout element for proper
  positioning
