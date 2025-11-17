# PluginTourItem

Registers an item for the interactive editor tour. The tour helps users discover
and understand editor features.

## Usage

```vue
<template>
  <PluginTourItem
    id="my-feature"
    title="My Feature"
    text="This feature allows you to do amazing things."
    selector="#my-feature-button"
  />

  <div id="my-feature-button">Click me!</div>
</template>

<script setup lang="ts">
import { PluginTourItem } from '#blokkli/plugins'
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this tour item.

### title

- **Type:** `string`
- **Required:** Yes

The title of the tour step.

### text

- **Type:** `string`
- **Required:** Yes

The description text explaining this feature. Supports markdown.

### selector

- **Type:** `string`
- **Required:** No

Optional CSS selector to find the target element. If provided, the tour will
highlight this element.

### element

- **Type:** `HTMLElement | null`
- **Required:** No

Optional direct reference to the target element. Takes precedence over selector.

## How It Works

The tour item:

1. Registers itself with the tour system
2. Tries to find the target element (via `element`, `selector`, or the
   component's own element)
3. When the tour reaches this step:
   - Highlights the element
   - Shows a popover with the title and text
   - Scrolls the element into view

## Real-World Examples

### Basic Feature Tour

```vue
<template>
  <PluginTourItem
    id="grid-toggle"
    title="Grid Overlay"
    text="Toggle a layout grid overlay to help align content."
    selector=".bk-toolbar-button.bk-is-grid"
  />
</template>
```

### Tour with Element Reference

```vue
<template>
  <PluginTourItem
    id="publish-button"
    title="Publish Changes"
    text="Click here to publish all your changes and make them live."
    :element="publishButtonElement"
  />

  <button ref="publishButton" @click="publish">Publish</button>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { PluginTourItem } from '#blokkli/plugins'

const publishButton = useTemplateRef('publishButton')
</script>
```

### Markdown in Description

```vue
<template>
  <PluginTourItem
    id="keyboard-shortcuts"
    title="Keyboard Shortcuts"
    :text="`
## Essential Shortcuts

- **Cmd+Z** / **Ctrl+Z**: Undo
- **Cmd+Shift+Z** / **Ctrl+Shift+Z**: Redo
- **Delete**: Delete selected blocks
- **Cmd+C** / **Ctrl+C**: Copy blocks

Open the **Help** sidebar for a complete list.
    `"
  />
</template>
```

### Inline Tour Step

Wrap content to highlight it:

```vue
<template>
  <PluginTourItem
    id="block-actions"
    title="Block Actions"
    text="When you select a block, action buttons appear here."
  >
    <div class="block-actions-container">
      <button>Edit</button>
      <button>Duplicate</button>
      <button>Delete</button>
    </div>
  </PluginTourItem>
</template>
```

### Multi-Step Feature Tour

```vue
<template>
  <div class="search-feature">
    <PluginTourItem
      id="search-step-1"
      title="Content Search"
      text="Step 1: Click the search button to open the search sidebar."
      selector="#search-sidebar-button"
    />

    <PluginTourItem
      id="search-step-2"
      title="Search Tabs"
      text="Step 2: Switch between different content types using these tabs."
      selector=".search-tabs"
    />

    <PluginTourItem
      id="search-step-3"
      title="Search Results"
      text="Step 3: Drag items from the results directly onto the page."
      selector=".search-results"
    />
  </div>
</template>
```

### Conditional Tour Item

Only show tour item when feature is available:

```vue
<template>
  <PluginTourItem
    v-if="hasTransformPlugins"
    id="transform-blocks"
    title="Transform Blocks"
    text="Apply transformations to selected blocks to modify their content automatically."
    selector=".transform-button"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const transformPlugins = await adapter.getTransformPlugins()
const hasTransformPlugins = computed(() => transformPlugins.length > 0)
</script>
```

## Integrated with Other Plugins

Many plugin components automatically create tour items when you provide
`tourText`:

```vue
<!-- These automatically register tour items -->
<PluginSidebar
  id="library"
  title="Library"
  icon="library"
  tour-text="Browse and insert reusable blocks from the library."
/>

<PluginToolbarButton
  id="preview"
  title="Preview"
  icon="preview"
  region="after-menu"
  tour-text="Open a preview of your changes in a new window."
/>

<PluginItemAction
  id="duplicate"
  title="Duplicate"
  icon="duplicate"
  tour-text="Create a copy of the selected block."
/>
```

## Tour Flow

The tour follows this flow:

1. User activates the tour (via Help sidebar or keyboard shortcut)
2. Tour steps are presented in order based on their logical sequence
3. Each step:
   - Highlights the target element
   - Shows a popover with title and description
   - Provides "Next" and "Previous" buttons
   - Allows skipping or closing the tour

## Notes

- Tour items are collected from all features and plugins
- The tour only includes items whose elements are currently visible
- Use markdown for rich formatting in the `text` prop
- Tour state (completed steps) is saved per user
- Users can restart or skip the tour at any time
- The tour automatically adapts to show only relevant features
- If an element can't be found, that step is skipped
