# PluginViewOption

Creates a toggle button in the view options area. Used for options that change
the visual display or behavior of the editor without modifying content.

## Usage

```vue
<template>
  <PluginViewOption
    id="grid"
    v-slot="{ isActive }"
    label="Toggle grid"
    title-on="Show grid"
    title-off="Hide grid"
    icon="grid"
    key-code="G"
  >
    <div v-if="isActive" class="grid-overlay" />
  </PluginViewOption>
</template>

<script setup lang="ts">
import { PluginViewOption } from '#blokkli/plugins'
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this view option. Used for storage key and event tracking.

### label

- **Type:** `string`
- **Required:** Yes

The label used in commands and tour.

### titleOn

- **Type:** `string`
- **Required:** Yes

The tooltip text when the option is OFF. Should describe what happens when
turned on (e.g., `'Show grid'`).

### titleOff

- **Type:** `string`
- **Required:** Yes

The tooltip text when the option is ON. Should describe what happens when turned
off (e.g., `'Hide grid'`).

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

The icon displayed in the button.

### keyCode

- **Type:** `string`
- **Required:** No

The key code for the keyboard shortcut. Automatically includes Meta modifier
(e.g., `'g'` for Cmd+G / Ctrl+G).

### editOnly

- **Type:** `boolean`
- **Required:** No

Whether the view option is only available in edit mode.

### weight

- **Type:** `number | string`
- **Required:** No
- **Default:** `0`

The weight, used for positioning the button. Lower weights appear first.

### modelValue

- **Type:** `boolean`
- **Required:** No

Two-way binding for the active state. Can be used with `v-model`.

### tourText

- **Type:** `string`
- **Required:** No

Optional text for the interactive tour.

## Slots

### default

The slot receives the current active state:

```typescript
{
  isActive: boolean
}
```

### icon

Custom icon slot (overrides the `icon` prop).

## Events

### @update:modelValue

Emitted when the active state changes.

```typescript
(isActive: boolean) => void
```

## Real-World Examples

### Grid Overlay

```vue
<template>
  <PluginViewOption
    id="grid"
    v-slot="{ isActive }"
    :label="$t('gridToggle', 'Toggle grid')"
    :title-on="$t('gridShow', 'Show grid')"
    :title-off="$t('gridHide', 'Hide grid')"
    :tour-text="
      $t('gridTourText', 'Display a layout grid overlay on top of the page.')
    "
    key-code="G"
    icon="grid"
  >
    <div v-if="isActive" class="bk-grid-overlay" v-html="gridMarkup" />
  </PluginViewOption>
</template>

<script setup lang="ts">
import { PluginViewOption } from '#blokkli/plugins'

const gridMarkup = await adapter.getGridMarkup()
</script>
```

### Dark Mode Toggle

```vue
<template>
  <PluginViewOption
    id="dark_mode"
    v-model="isDarkMode"
    label="Dark mode"
    title-on="Enable dark mode"
    title-off="Disable dark mode"
    icon="dark_mode"
    key-code="D"
    @update:model-value="onToggle"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { PluginViewOption } from '#blokkli/plugins'

const isDarkMode = ref(false)

watch(isDarkMode, (value) => {
  document.documentElement.classList.toggle('dark-mode', value)
})

function onToggle(isActive: boolean) {
  console.log('Dark mode:', isActive)
}
</script>
```

### Highlight Changes

```vue
<template>
  <PluginViewOption
    id="highlight_changes"
    v-slot="{ isActive }"
    label="Highlight changes"
    title-on="Highlight changed blocks"
    title-off="Hide change highlights"
    icon="highlight"
    edit-only
  >
    <style v-if="isActive">
      .bk-is-changed {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
    </style>
  </PluginViewOption>
</template>
```

### Accessibility Checker

```vue
<template>
  <PluginViewOption
    id="a11y_check"
    v-slot="{ isActive }"
    label="Accessibility check"
    title-on="Run accessibility check"
    title-off="Hide accessibility issues"
    icon="accessibility"
    key-code="A"
  >
    <AccessibilityOverlay v-if="isActive" :issues="a11yIssues" />
  </PluginViewOption>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const isActive = ref(false)
const a11yIssues = ref([])

watch(isActive, async (value) => {
  if (value) {
    a11yIssues.value = await runAccessibilityCheck()
  }
})
</script>
```

### Wireframe Mode

```vue
<template>
  <PluginViewOption
    id="wireframe"
    v-slot="{ isActive }"
    label="Wireframe mode"
    title-on="Show wireframe view"
    title-off="Hide wireframe view"
    icon="wireframe"
    :weight="-10"
  >
    <Teleport v-if="isActive" to="head">
      <style>
        * {
          color: #000 !important;
          background: #fff !important;
          border-color: #000 !important;
        }
        img {
          opacity: 0.1;
        }
      </style>
    </Teleport>
  </PluginViewOption>
</template>
```

### Responsive Preview (with Custom Icon)

```vue
<template>
  <PluginViewOption
    id="responsive"
    v-slot="{ isActive }"
    v-model="isResponsiveMode"
    label="Responsive preview"
    title-on="Show responsive preview"
    title-off="Hide responsive preview"
    key-code="R"
  >
    <template #icon>
      <Icon :name="currentDevice.icon" />
    </template>

    <ResponsiveFrame v-if="isActive" :device="currentDevice" />
  </PluginViewOption>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const isResponsiveMode = ref(false)
const deviceIndex = ref(0)

const devices = [
  { name: 'Mobile', icon: 'phone', width: 375 },
  { name: 'Tablet', icon: 'tablet', width: 768 },
  { name: 'Desktop', icon: 'desktop', width: 1440 },
]

const currentDevice = computed(() => devices[deviceIndex.value]!)
</script>
```

## Notes

- View options appear in the toolbar's view options region
- State is automatically saved to local storage and persists across sessions
- Only visible on desktop (hidden on mobile)
- The button shows inactive state when off, active state when on
- Keyboard shortcuts automatically use the Meta modifier (Cmd/Ctrl)
- Use `v-slot="{ isActive }"` to conditionally render content
- Use `v-model` for two-way binding of the active state
- Multiple view options can be active simultaneously
- Changes to view options don't create undo/redo history entries
- View options don't modify content - only affect the visual display
