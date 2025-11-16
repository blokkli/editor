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
import { PluginContextMenu } from '#blokkli/plugins'
import type { ContextMenu } from '#blokkli/types'

const menuItems: ContextMenu[] = [
  {
    id: 'edit',
    label: 'Edit',
    icon: 'edit',
    callback: () => {
      // Edit action...
    },
  },
  {
    id: 'delete',
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

Array of menu items to display. Each item can have nested sub-menus.

**Menu Item Structure:**

```typescript
type ContextMenu = {
  id: string
  label: string
  icon?: BlokkliIcon
  callback?: () => void
  disabled?: boolean
  children?: ContextMenu[]
}
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

### Simple Action

```typescript
{
  id: 'copy',
  label: 'Copy',
  icon: 'copy',
  callback: () => copyItem(),
}
```

### Disabled Item

```typescript
{
  id: 'paste',
  label: 'Paste',
  icon: 'paste',
  disabled: !hasClipboardData,
  callback: () => pasteItem(),
}
```

### Nested Menu

```typescript
{
  id: 'transform',
  label: 'Transform',
  icon: 'transform',
  children: [
    {
      id: 'uppercase',
      label: 'To Uppercase',
      callback: () => transformText('uppercase'),
    },
    {
      id: 'lowercase',
      label: 'To Lowercase',
      callback: () => transformText('lowercase'),
    },
  ],
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
import { PluginContextMenu } from '#blokkli/plugins'
import type { ContextMenu } from '#blokkli/types'

const props = defineProps<{
  uuid: string
  canEdit: boolean
  canDelete: boolean
}>()

const blockMenu = computed<ContextMenu[]>(() => [
  {
    id: 'edit',
    label: 'Edit Block',
    icon: 'edit',
    disabled: !props.canEdit,
    callback: () => editBlock(props.uuid),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: 'duplicate',
    callback: () => duplicateBlock(props.uuid),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: 'delete',
    disabled: !props.canDelete,
    callback: () => deleteBlock(props.uuid),
  },
])
</script>
```

### Field Context Menu with Transform Options

```vue
<template>
  <PluginContextMenu id="field-menu" :menu="fieldMenu">
    <div class="field-wrapper">
      <BlokkliField name="content" :list="blocks" />
    </div>
  </PluginContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ContextMenu } from '#blokkli/types'

const transformPlugins = await adapter.getTransformPlugins()

const fieldMenu = computed<ContextMenu[]>(() => [
  {
    id: 'paste',
    label: 'Paste Blocks',
    icon: 'paste',
    disabled: !hasClipboard.value,
    callback: () => pasteBlocks(),
  },
  {
    id: 'transform',
    label: 'Transform All',
    icon: 'transform',
    children: transformPlugins.map((plugin) => ({
      id: plugin.id,
      label: plugin.label,
      callback: () => applyTransform(plugin.id),
    })),
  },
])
</script>
```

## Notes

- Only one context menu can be open at a time
- The menu automatically positions itself based on cursor position
- Right-clicking outside the menu closes it
- Nested menus open on hover
- The context menu is teleported to the main layout element for proper
  positioning
