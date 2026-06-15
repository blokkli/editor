# View Option

Registers a toggleable view option in the editor. View options change how the
editor displays content - like a layout grid, wireframe mode, or change
highlighting - without modifying the content itself.

A view option is registered with the `defineViewOption` composable. It returns a
reactive `isVisible` flag you use to conditionally render your overlay. The
on/off state is persisted to local storage and the toggle automatically appears
in the editor's view options area.

## Usage

```vue
<template>
  <div v-if="isVisible" class="grid-overlay" />
</template>

<script setup lang="ts">
import { defineViewOption } from '#blokkli/editor/composables'

const { isVisible } = defineViewOption({
  id: 'grid',
  label: 'Grid',
  description: 'Shows a layout grid overlay on top of the page.',
  icon: 'bk_mdi_grid_view',
  keyCode: 'G',
})
</script>
```

## Config

The composable takes a single config object of type `ViewOption`.

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this view option. Used as the local storage key for the
persisted on/off state.

### label

- **Type:** `string`
- **Required:** Yes

The label shown for the option in the view options menu and used in commands.

### description

- **Type:** `string`
- **Required:** Yes

A short description of what the option does.

### icon

- **Type:** `BlokkliIcon`
- **Required:** Yes

The icon displayed for the toggle.

### keyCode

- **Type:** `string`
- **Required:** No

The key code for the keyboard shortcut (e.g. `'G'`).

### tourText

- **Type:** `string`
- **Required:** No

Optional text for the interactive tour. If provided, the option is included in
the editor tour.

### weight

- **Type:** `number`
- **Required:** No

The weight, used for positioning the option. Lower weights appear first.

## Return Value

```typescript
{
  isVisible: ComputedRef<boolean>
}
```

### isVisible

A computed boolean that is `true` when the option is toggled on. It also
accounts for viewport - view options are only available on desktop, so
`isVisible` is always `false` on mobile. Use it to conditionally render your
overlay.

## Real-World Examples

### Grid Overlay

A grid overlay loaded from the adapter, toggled via a view option:

```vue
<template>
  <div v-if="isVisible" class="bk-grid-overlay" v-html="gridMarkup" />
</template>

<script setup lang="ts">
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { defineViewOption } from '#blokkli/editor/composables'

const { adapter } = defineBlokkliFeature({
  id: 'grid',
  label: 'Grid',
  icon: 'bk_mdi_grid_view',
  requiredAdapterMethods: ['getGridMarkup'],
  description: 'Provides a view option to render a grid.',
  viewports: ['desktop'],
})

const gridMarkup = await Promise.resolve(adapter.getGridMarkup())

const { $t } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'grid',
  label: $t('viewOptionGrid', 'Grid'),
  description: $t(
    'viewOptionGridDescription',
    'Shows a layout grid overlay on top of the page.',
  ),
  tourText: $t(
    'gridTourText',
    'Display a layout grid overlay on top of the page.',
  ),
  keyCode: 'G',
  icon: 'bk_mdi_grid_view',
})
</script>
```

### Reacting to State Changes

Use `watch` on `isVisible` to run side effects when the option is toggled:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { defineViewOption } from '#blokkli/editor/composables'

const { isVisible } = defineViewOption({
  id: 'dark_mode',
  label: 'Dark mode',
  description: 'Preview the page with a dark color scheme.',
  icon: 'bk_mdi_dark_mode',
})

watch(isVisible, (value) => {
  document.documentElement.classList.toggle('dark-mode', value)
})
</script>
```

## Notes

- The toggle appears in the editor's view options area.
- The on/off state is automatically persisted to local storage and survives page
  reloads.
- View options are only available on desktop - `isVisible` is always `false` on
  mobile.
- Multiple view options can be active at the same time.
- Toggling a view option does not create undo/redo history entries; it only
  affects the visual display, never the content.
