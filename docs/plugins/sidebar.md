# PluginSidebar

Creates a sidebar panel with a toggle button. Sidebars can display additional
tools, information, or controls that don't fit in the main toolbar.

## Usage

```vue
<template>
  <PluginSidebar
    id="structure"
    title="Structure"
    icon="tree"
    tour-text="Shows a structured list of all blocks"
  >
    <div class="sidebar-content">
      <!-- Your sidebar content here -->
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { PluginSidebar } from '#blokkli/editor/plugins'
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this sidebar.

### title

- **Type:** `string`
- **Required:** Yes

The title displayed in the sidebar header.

### icon

- **Type:** `BlokkliIcon`
- **Required:** Yes

The icon displayed in the sidebar toggle button.

### region

- **Type:** `'left' | 'right'`
- **Required:** No
- **Default:** `'right'`

Which region to display the sidebar in.

### weight

- **Type:** `string | number`
- **Required:** No
- **Default:** `0`

The weight, used for positioning the sidebar button. Lower weights appear first.

### editOnly

- **Type:** `boolean`
- **Required:** No

Whether the sidebar is only available in edit mode. If true, the sidebar is
hidden in preview mode.

### disabled

- **Type:** `boolean`
- **Required:** No

Whether the sidebar is disabled.

### renderAlways

- **Type:** `boolean`
- **Required:** No

Whether to always render the sidebar content. By default, content is only
rendered when the sidebar is open.

### keyCode

- **Type:** `string`
- **Required:** No

The key code for the keyboard shortcut (e.g., `'l'`).

### meta

- **Type:** `boolean`
- **Required:** No

Whether the shortcut needs the meta modifier key.

### shift

- **Type:** `boolean`
- **Required:** No

Whether the shortcut needs the shift modifier key.

### minWidth

- **Type:** `number`
- **Required:** No

Minimum width when detached (in pixels).

### minHeight

- **Type:** `number`
- **Required:** No

Minimum height when detached (in pixels).

### size

- **Type:** `{ width: number; height: number }`
- **Required:** No

Default size when detached.

### beta

- **Type:** `boolean`
- **Required:** No

Whether to display a BETA indicator badge.

### isLoading

- **Type:** `boolean`
- **Required:** No

Whether the sidebar content is currently loading. Displays a loading spinner
when true.

### tourText

- **Type:** `string`
- **Required:** No

Optional text for the interactive tour.

## Events

### @updated

Emitted when the sidebar is opened, closed, or detached/attached.

## Slots

### default

The sidebar content. Receives several slot props:

```typescript
{
  scrolledToEnd: boolean
  isDetached: boolean
  width: number | undefined
  height: number | undefined
  toggleSidebar: () => void
  isResizing: boolean
}
```

### icon

Custom icon slot (overrides the `icon` prop).

### badge

Optional badge to display on the button.

## Detached Mode

Sidebars can be detached into floating windows on desktop:

- Click the detach button in the sidebar header
- The sidebar becomes a draggable, resizable window
- Position and size are saved
- Click the attach button to return it to the sidebar

## Real-World Examples

### Structure Sidebar

Display a tree view of all blocks:

```vue
<template>
  <PluginSidebar
    id="structure"
    :title="$t('structureToolbarLabel', 'Structure')"
    :tour-text="
      $t(
        'structureTourText',
        'Shows a structured list of all blocks on the current page.',
      )
    "
    icon="tree"
    weight="-90"
  >
    <div class="bk-structure">
      <TreeView :blocks="allBlocks" />
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { PluginSidebar } from '#blokkli/editor/plugins'
import { useBlokkli } from '#imports'

const { state, $t } = useBlokkli()
const allBlocks = computed(() => state.blocks.value)
</script>
```

### Library Sidebar

Browse and insert reusable blocks:

```vue
<template>
  <PluginSidebar
    id="library"
    title="Library"
    icon="library"
    key-code="l"
    meta
    :is-loading="isLoading"
    :min-width="400"
    :min-height="300"
  >
    <template #badge>
      <div v-if="libraryCount" class="badge">{{ libraryCount }}</div>
    </template>

    <div class="library-sidebar">
      <input
        v-model="searchText"
        type="search"
        placeholder="Search library..."
      />
      <LibraryGrid :items="filteredItems" />
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PluginSidebar } from '#blokkli/editor/plugins'

const searchText = ref('')
const isLoading = ref(true)

const libraryItems = await adapter.getLibraryItems({
  bundles: [],
  page: 0,
  text: '',
})

isLoading.value = false

const libraryCount = computed(() => libraryItems.total)

const filteredItems = computed(() => {
  if (!searchText.value) {
    return libraryItems.items
  }
  return libraryItems.items.filter((item) =>
    item.title.toLowerCase().includes(searchText.value.toLowerCase()),
  )
})
</script>
```

### Comments Sidebar

Display and manage block comments:

```vue
<template>
  <PluginSidebar
    id="comments"
    title="Comments"
    icon="comment"
    beta
    v-slot="{ scrolledToEnd }"
  >
    <div class="comments-sidebar">
      <CommentsList :comments="comments" />

      <div v-if="!scrolledToEnd" class="scroll-indicator">
        ↓ Scroll for more
      </div>

      <CommentForm @submit="addComment" />
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { PluginSidebar } from '#blokkli/editor/plugins'

const comments = await adapter.loadComments()

async function addComment(body: string) {
  await adapter.addComment(selectedUuids.value, body)
}
</script>
```

### Settings Sidebar (Edit Only)

```vue
<template>
  <PluginSidebar
    id="settings"
    title="Settings"
    icon="settings"
    region="left"
    edit-only
    render-always
  >
    <div class="settings-sidebar">
      <h3>Editor Settings</h3>
      <label>
        <input v-model="autoSave" type="checkbox" />
        Auto-save changes
      </label>
      <label>
        <input v-model="showGrid" type="checkbox" />
        Show grid
      </label>
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PluginSidebar } from '#blokkli/editor/plugins'

const autoSave = ref(true)
const showGrid = ref(false)
</script>
```

## Notes

- Only one sidebar per region can be open at a time
- Opening a sidebar closes any other sidebar in the same region
- Sidebar state (open/closed) persists across sessions
- Detached mode is only available on desktop
- Use `renderAlways` sparingly as it can impact performance
- The sidebar automatically closes on mobile after drag-and-drop operations
- Keyboard shortcuts are automatically registered
