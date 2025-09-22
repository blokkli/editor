<template>
  <Teleport v-if="enabled" to="#bk-blokkli-item-actions-dropdown">
    <div>
      <h3>{{ title }}</h3>
      <ol>
        <li v-for="item in items" :key="item.id">
          <button @click="$emit('select', item)">
            <Icon v-if="icon" :name="icon" />
            <div>
              <div>{{ item.label }}</div>
              <div v-if="item.description" class="bk-description">
                {{ item.description }}
              </div>
            </div>
          </button>
        </li>
      </ol>
    </div>
  </Teleport>
</template>

<script lang="ts" setup generic="T extends Item">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/components'
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
const props = defineProps<{
  id: string
  title: string
  enabled: boolean
  items: T[]
  icon?: BlokkliIcon
}>()

defineEmits<{
  (e: 'select', item: T): void
}>()

const { eventBus } = useBlokkli()

const isRendering = computed(() => props.enabled)

onMounted(() => {
  eventBus.emit('plugin:mount', {
    type: 'ItemDropdown',
    id: props.id,
    isRendering,
  })
})

onBeforeUnmount(() => {
  eventBus.emit('plugin:unmount', {
    type: 'ItemDropdown',
    id: props.id,
  })
})
</script>

<script lang="ts">
export default {
  name: 'PluginItemDropdown',
}

type Item = {
  id: string
  label: string
  description?: string
}
</script>
