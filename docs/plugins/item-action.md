# PluginItemAction

Creates an action button that appears when blocks are selected. Used for
operations that act on one or more selected blocks.

## Usage

```vue
<template>
  <PluginItemAction
    id="delete"
    title="Delete"
    icon="delete"
    multiple
    key-code="Delete"
    @click="onDelete"
  />
</template>

<script setup lang="ts">
import { PluginItemAction } from '#blokkli/plugins'
import type { RenderedFieldListItem } from '#blokkli/types'

async function onDelete(items: RenderedFieldListItem[]) {
  await adapter.deleteBlocks(items.map((item) => item.uuid))
}
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this item action.

### title

- **Type:** `string`
- **Required:** Yes

The title of the action. Displayed in the tooltip and keyboard shortcut hints.

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

Optional icon to display in the button.

### disabled

- **Type:** `boolean`
- **Required:** No

Whether the action is disabled.

### active

- **Type:** `boolean`
- **Required:** No

Whether the button should be displayed in an active state. Useful when the
action opens a dropdown or dialog.

### multiple

- **Type:** `boolean`
- **Required:** No

Whether the action supports multiple items. If false, the action is disabled
when more than one item is selected.

### editOnly

- **Type:** `boolean`
- **Required:** No

Whether the action is only available in edit mode. If true, the action is hidden
in preview mode.

### keyCode

- **Type:** `string`
- **Required:** No

The key code to use for the keyboard shortcut (e.g., `'c'` for the "c" key).

### meta

- **Type:** `boolean`
- **Required:** No

Whether the shortcut needs the meta modifier key. On Mac this is Cmd, on
Windows/Linux this is Ctrl.

### weight

- **Type:** `number | string | 'last'`
- **Required:** No

The weight, used for positioning the button. Lower weights appear first. Use
`'last'` to always position at the end.

### tourText

- **Type:** `string`
- **Required:** No

Optional text for the interactive tour. If provided, this action will be
included in the editor tour.

## Events

### @click

Emitted when the action is clicked. Receives an array of selected block items.

```typescript
(items: RenderedFieldListItem[]) => void
```

## Slots

### default

Receives the selected items and UUIDs:

```vue
<PluginItemAction id="custom" title="Custom Action" v-slot="{ items, uuids }">
  <CustomDialog :items="items" />
</PluginItemAction>
```

## Real-World Examples

### Delete Action

```vue
<template>
  <PluginItemAction
    id="delete"
    :title="$t('deleteButton', 'Delete')"
    icon="delete"
    multiple
    edit-only
    key-code="Delete"
    :weight="-80"
    @click="onDelete"
  />
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { PluginItemAction } from '#blokkli/plugins'
import type { RenderedFieldListItem } from '#blokkli/types'

const { state, $t } = useBlokkli()

async function onDelete(items: RenderedFieldListItem[]) {
  await state.mutateWithLoadingState(
    () => adapter.deleteBlocks(items.map((v) => v.uuid)),
    $t('deleteError', 'The block could not be deleted.'),
  )
}
</script>
```

### Duplicate Action (Single Block Only)

```vue
<template>
  <PluginItemAction
    id="duplicate"
    title="Duplicate"
    icon="duplicate"
    key-code="d"
    meta
    @click="onDuplicate"
  />
</template>

<script setup lang="ts">
import type { RenderedFieldListItem } from '#blokkli/types'

async function onDuplicate(items: RenderedFieldListItem[]) {
  // Only duplicates the first item since multiple=false
  const uuid = items[0]?.uuid
  if (uuid) {
    await adapter.duplicateBlocks([uuid])
  }
}
</script>
```

### Convert Action with Dropdown

```vue
<template>
  <PluginItemAction
    id="convert"
    title="Convert"
    icon="convert"
    :active="isDropdownOpen"
    multiple
    @click="toggleDropdown"
    v-slot="{ items }"
  >
    <ConversionDropdown
      v-if="isDropdownOpen"
      :items="items"
      @close="isDropdownOpen = false"
    />
  </PluginItemAction>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PluginItemAction } from '#blokkli/plugins'

const isDropdownOpen = ref(false)

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}
</script>
```

### Make Reusable Action

```vue
<template>
  <PluginItemAction
    id="make_reusable"
    :title="$t('makeReusable', 'Make reusable')"
    icon="library"
    :disabled="!canMakeReusable"
    tour-text="Convert a block into a reusable library item"
    @click="onMakeReusable"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RenderedFieldListItem } from '#blokkli/types'

const canMakeReusable = computed(() => {
  // Check if selected blocks can be made reusable
  return selection.items.value.every((item) => !item.isReusable)
})

async function onMakeReusable(items: RenderedFieldListItem[]) {
  const uuid = items[0]?.uuid
  if (uuid) {
    await adapter.makeBlockReusable({ uuid, title: 'New Library Item' })
  }
}
</script>
```

## Notes

- Item actions are only visible when blocks are selected
- They appear in the selection toolbar above selected blocks
- Actions with `multiple: false` are automatically disabled when multiple blocks
  are selected
- Actions are teleported to `#bk-blokkli-item-actions`
- The `weight` prop controls the order (lower numbers appear first)
- Use `weight: 'last'` for destructive actions like Delete
- Keyboard shortcuts are automatically registered and appear in the shortcuts
  panel
