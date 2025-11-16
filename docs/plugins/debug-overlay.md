# PluginDebugOverlay

Renders content only when debug mode is enabled and the specific overlay is
activated. Used for development and debugging visualizations.

## Usage

```vue
<template>
  <PluginDebugOverlay id="viewport" title="Show viewport overlay">
    <div class="viewport-debug">
      <div class="viewport-info">
        Width: {{ viewport.width }}px<br />
        Height: {{ viewport.height }}px
      </div>
    </div>
  </PluginDebugOverlay>
</template>

<script setup lang="ts">
import { PluginDebugOverlay } from '#blokkli/plugins'
import { useBlokkli } from '#imports'

const { ui } = useBlokkli()
const viewport = ui.viewport
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this debug overlay.

### title

- **Type:** `string`
- **Required:** Yes

The title displayed in the debug overlay selector.

## Slots

### default

The content to render when the overlay is active.

## How It Works

The debug overlay:

1. Registers itself with the debug system when mounted
2. Appears in the debug panel's overlay list
3. Only renders content when:
   - Debug mode is enabled
   - The specific overlay is toggled on

## Real-World Examples

### Viewport Debug Overlay

Display viewport dimensions and breakpoint information:

```vue
<template>
  <PluginDebugOverlay id="viewport" title="Show viewport overlay">
    <div class="bk-debug-viewport">
      <div class="bk-debug-panel">
        <h3>Viewport</h3>
        <dl>
          <dt>Width:</dt>
          <dd>{{ ui.viewport.width }}px</dd>
          <dt>Height:</dt>
          <dd>{{ ui.viewport.height }}px</dd>
          <dt>Breakpoint:</dt>
          <dd>{{ ui.breakpoint.value }}</dd>
          <dt>Mobile:</dt>
          <dd>{{ ui.isMobile.value ? 'Yes' : 'No' }}</dd>
        </dl>
      </div>
    </div>
  </PluginDebugOverlay>
</template>

<script setup lang="ts">
import { PluginDebugOverlay } from '#blokkli/plugins'
import { useBlokkli } from '#imports'

const { ui } = useBlokkli()
</script>

<style scoped>
.bk-debug-viewport {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  font-family: monospace;
  z-index: 99999;
}
</style>
```

### Block Rectangles Debug Overlay

Visualize all block and field rectangles:

```vue
<template>
  <PluginDebugOverlay id="rects" title="Show field and block rects">
    <svg class="bk-debug-rects">
      <rect
        v-for="rect in blockRects"
        :key="rect.uuid"
        :x="rect.x"
        :y="rect.y"
        :width="rect.width"
        :height="rect.height"
        fill="rgba(255, 0, 0, 0.2)"
        stroke="red"
      />
      <rect
        v-for="rect in fieldRects"
        :key="rect.key"
        :x="rect.x"
        :y="rect.y"
        :width="rect.width"
        :height="rect.height"
        fill="rgba(0, 0, 255, 0.2)"
        stroke="blue"
      />
    </svg>
  </PluginDebugOverlay>
</template>

<script setup lang="ts">
import { PluginDebugOverlay } from '#blokkli/plugins'
import { useBlokkli } from '#imports'

const { dom } = useBlokkli()

const blockRects = computed(() => Array.from(dom.getAllBlockRects().values()))
const fieldRects = computed(() => Array.from(dom.getAllFieldRects().values()))
</script>
```

### Selection Debug Info

Display information about currently selected blocks:

```vue
<template>
  <PluginDebugOverlay id="selection" title="Show selection info">
    <div class="bk-debug-selection">
      <h3>Selected Blocks: {{ selection.uuids.value.length }}</h3>
      <ul>
        <li v-for="uuid in selection.uuids.value" :key="uuid">
          {{ uuid }}
        </li>
      </ul>
    </div>
  </PluginDebugOverlay>
</template>

<script setup lang="ts">
import { PluginDebugOverlay } from '#blokkli/plugins'
import { useBlokkli } from '#imports'

const { selection } = useBlokkli()
</script>
```

## Enabling Debug Mode

Debug mode can be enabled by:

1. Using the keyboard shortcut (usually `Cmd+D` / `Ctrl+D`)
2. Opening the Debug sidebar
3. Using the command palette: "Toggle Debug Mode"

Once enabled, overlays can be toggled on/off in the Debug sidebar.

## Notes

- Debug overlays are automatically removed in production builds
- Content is teleported to the body element for proper positioning
- Multiple overlays can be active simultaneously
- Overlays persist across page navigation (stored in local storage)
- Use overlays sparingly - they can impact performance if rendering heavy
  content
