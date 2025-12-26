# PluginBlockIndicator

Displays a small indicator button on the left or right side of a block. Used for
quick actions or status indicators that should be visible when hovering over
blocks.

## Usage

```vue
<template>
  <PluginBlockIndicator
    id="anchor"
    :uuid="block.uuid"
    label="#intro"
    icon="anchor"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import { PluginBlockIndicator } from '#blokkli/editor/plugins'

function onClick() {
  // Handle click...
}
</script>
```

## Props

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this indicator. Should be unique per block instance.

### uuid

- **Type:** `string`
- **Required:** Yes

The UUID of the block this indicator is attached to.

### label

- **Type:** `string`
- **Required:** No

Optional text label to display in the indicator.

### position

- **Type:** `'left' | 'right'`
- **Required:** No
- **Default:** `'left'`

Which side of the block to display the indicator.

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

Optional icon to display in the indicator.

## Events

### @click

Emitted when the indicator is clicked.

## Slots

### default

You can provide custom content instead of using the `label` and `icon` props.

```vue
<PluginBlockIndicator id="custom" :uuid="block.uuid">
  <div class="custom-indicator">
    <span class="badge">3</span>
  </div>
</PluginBlockIndicator>
```

## Real-World Examples

### Anchor Link Indicator

Display anchor IDs for blocks that have them:

```vue
<template>
  <PluginBlockIndicator
    v-for="item in anchors"
    id="anchor"
    :key="item.uuid"
    :uuid="item.uuid"
    :label="'#' + item.id"
    icon="anchor"
    @click="copyAnchorLink(item)"
  />
</template>

<script setup lang="ts">
import { PluginBlockIndicator } from '#blokkli/editor/plugins'

type Anchor = {
  id: string
  uuid: string
}

defineProps<{
  anchors: Anchor[]
}>()

function copyAnchorLink(anchor: Anchor) {
  const link = buildAnchorLink(anchor.id, anchor.uuid)
  navigator.clipboard.writeText(link)
}
</script>
```

### Schedule Indicator

Show when blocks are scheduled to publish/unpublish:

```vue
<template>
  <PluginBlockIndicator
    v-for="block in scheduledBlocks"
    id="schedule"
    :key="block.uuid"
    :uuid="block.uuid"
    icon="schedule"
    @click="editSchedule(block)"
  >
    <div class="schedule-indicator">
      <Icon name="schedule" />
      <span>{{ formatDate(block.scheduleDate) }}</span>
    </div>
  </PluginBlockIndicator>
</template>
```

## Notes

- Indicators are teleported to `#bk-indicators-left` or `#bk-indicators-right`
- They appear on hover over the block
- When hovering an indicator, the block is highlighted
- Multiple indicators can be displayed on the same block
- Indicators are only visible during editing
