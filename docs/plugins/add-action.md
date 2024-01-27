# Add Action Plugin

This plugin allows you to implement your own add action. This action will appear
in the [Add List](/features/add-list) and can be drag and dropped anywhere into
the page.

## Example usage

```vue
<template>
  <PluginAddAction
    type="customAction"
    title="My custom action"
    icon="file"
    @placed="onPlaced"
  />
</template>

<script lang="ts" setup>
import type { ActionPlacedEvent } from '#blokkli/types'
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginAddAction } from '#blokkli/plugins'

const { adapter } = defineBlokkliFeature({
  id: 'custom-feature',
  icon: 'file',
  label: 'Custom Feature',
})

const { state, $t, eventBus } = useBlokkli()

const onPlaced = async (e: ActionPlacedEvent) => {
  // Do something when the action was placed into the page.
}
</script>
```
