# PluginToolbarButton

Creates a button in the editor toolbar. Used for actions that should be easily
accessible from the main toolbar.

## Usage

```vue
<template>
  <PluginToolbarButton
    id="preview"
    title="Preview"
    region="after-menu"
    icon="preview"
    @click="openPreview"
  />
</template>

<script setup lang="ts">
import { PluginToolbarButton } from '#blokkli/plugins'

function openPreview() {
  window.open('/preview')
}
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this toolbar button.

### title

- **Type:** `string`
- **Required:** Yes

The title displayed in the tooltip.

### region

- **Type:** `'after-title' | 'before-title' | 'before-sidebar' | 'after-menu' | 'before-sidebar-right' | 'view-options'`
- **Required:** Yes

Which toolbar region to render the button in. Different regions appear in
different locations of the toolbar:

- `'before-title'` - Far left, before the page title
- `'after-title'` - After the page title
- `'after-menu'` - After the main menu button
- `'before-sidebar'` - Before the right sidebar buttons
- `'before-sidebar-right'` - Alternative position before sidebars
- `'view-options'` - In the view options area

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

Optional icon to display in the button.

### disabled

- **Type:** `boolean`
- **Required:** No

Whether the button is disabled.

### active

- **Type:** `boolean`
- **Required:** No

Whether the button should be displayed in an active state. Useful when the
button opens a dropdown or toggles a feature.

### editOnly

- **Type:** `boolean`
- **Required:** No

Whether the button is only available in edit mode. If true, the button is hidden
in preview mode.

### keyCode

- **Type:** `string`
- **Required:** No

The key code for the keyboard shortcut (e.g., `'h'`).

### meta

- **Type:** `boolean`
- **Required:** No

Whether the shortcut needs the meta modifier key.

### shift

- **Type:** `boolean`
- **Required:** No

Whether the shortcut needs the shift modifier key.

### weight

- **Type:** `number | string`
- **Required:** No
- **Default:** `0`

The weight, used for positioning the button. Lower weights appear first.

### shortcutGroup

- **Type:** `string`
- **Required:** No

The keyboard shortcut group. Used for organizing shortcuts in the shortcuts
panel.

### tourText

- **Type:** `string`
- **Required:** No

Optional text for the interactive tour.

### noCommand

- **Type:** `boolean`
- **Required:** No

Whether to skip registering this button as a command. Useful when you want the
button UI without command palette integration.

## Events

### @click

Emitted when the button is clicked.

## Slots

### default

Custom content for the button (overrides the `icon` prop).

```vue
<PluginToolbarButton id="custom" title="Custom" region="after-menu">
  <span class="custom-icon">🎨</span>
</PluginToolbarButton>
```

## Real-World Examples

### Preview in New Window

```vue
<template>
  <PluginToolbarButton
    id="preview_new_window"
    :title="$t('previewNewWindow', 'Preview (new window)')"
    region="after-menu"
    icon="open_in_new"
    :disabled="!state.canEdit.value"
    :tour-text="
      $t(
        'previewNewWindowTourText',
        'Opens a preview of the current changes in a new window.',
      )
    "
    @click="openPreview"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli, useRoute } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'

const { $t, state } = useBlokkli()
const route = useRoute()

const previewUrl = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

function openPreview() {
  window.open(previewUrl.value)
}
</script>
```

### Undo/Redo Buttons

```vue
<template>
  <PluginToolbarButton
    id="undo"
    title="Undo"
    region="before-title"
    icon="undo"
    :disabled="!canUndo"
    key-code="z"
    meta
    @click="undo"
  />

  <PluginToolbarButton
    id="redo"
    title="Redo"
    region="before-title"
    icon="redo"
    :disabled="!canRedo"
    key-code="z"
    meta
    shift
    @click="redo"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlokkli } from '#imports'

const { history } = useBlokkli()

const canUndo = computed(() => history.canUndo.value)
const canRedo = computed(() => history.canRedo.value)

function undo() {
  history.undo()
}

function redo() {
  history.redo()
}
</script>
```

### Publish Button with Dropdown

```vue
<template>
  <PluginToolbarButton
    id="publish"
    title="Publish"
    region="before-sidebar-right"
    icon="publish"
    :active="isDropdownOpen"
    :disabled="!hasChanges"
    @click="toggleDropdown"
  >
    <PublishDropdown
      v-if="isDropdownOpen"
      @publish="onPublish"
      @schedule="onSchedule"
      @close="isDropdownOpen = false"
    />
  </PluginToolbarButton>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PluginToolbarButton } from '#blokkli/plugins'

const isDropdownOpen = ref(false)
const hasChanges = computed(() => state.hasChanges.value)

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}

async function onPublish() {
  await adapter.publish({ hostEntityUuid, hostEntityType })
  isDropdownOpen.value = false
}
</script>
```

### Custom Button Content

```vue
<template>
  <PluginToolbarButton
    id="language"
    :title="`Switch to ${nextLanguage.label}`"
    region="after-menu"
    @click="switchLanguage"
  >
    <div class="language-button">
      <Icon name="language" />
      <span class="language-code">{{ currentLanguage.code }}</span>
    </div>
  </PluginToolbarButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PluginToolbarButton } from '#blokkli/plugins'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
]

const currentIndex = ref(0)

const currentLanguage = computed(() => languages[currentIndex.value]!)
const nextLanguage = computed(
  () => languages[(currentIndex.value + 1) % languages.length]!,
)

function switchLanguage() {
  currentIndex.value = (currentIndex.value + 1) % languages.length
}
</script>
```

## Notes

- Buttons are automatically registered as commands in the command palette
  (unless `noCommand` is true)
- Keyboard shortcuts are automatically registered and shown in tooltips
- Use appropriate regions to organize buttons logically
- The `weight` prop controls order within a region
- Disabled buttons are visually dimmed and don't respond to clicks
- The active state adds visual feedback for toggle buttons
