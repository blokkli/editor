<template>
  <Teleport v-if="enabled" to="#bk-blokkli-item-actions-dropdown">
    <div
      v-show="items.length"
      :style="{
        order: weight,
      }"
    >
      <ol>
        <li v-for="item in itemsMapped" :key="item.id">
          <button
            class="bk-blokkli-item-actions-type-dropdown-button"
            :disabled="!item.enabled"
            @click.prevent="onClick(item)"
          >
            <div class="bk-blokkli-item-actions-type-dropdown-icon">
              <Icon v-if="item.icon" :name="item.icon" />
            </div>
            <div>
              <div>{{ item.label }}</div>
            </div>
            <div v-if="item.description" class="bk-tooltip">
              {{ item.description }}
            </div>
          </button>
        </li>
      </ol>
    </div>
  </Teleport>
</template>

<script lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/components'
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

type Item = {
  id: string
  label: string
  description?: string
  enabled?: boolean
  icon?: BlokkliIcon
}
</script>

<script setup lang="ts" generic="T extends Item">
const props = defineProps<{
  id: string
  title: string
  enabled: boolean
  items: T[]
  icon?: BlokkliIcon
  weight?: string | number
}>()

const emit = defineEmits<{
  (e: 'select', item: T): void
}>()

const itemsMapped = computed<T[]>(() => {
  return props.items.map((item) => {
    return {
      ...item,
      icon: item.icon ?? props.icon,
      enabled: item.enabled !== false,
    }
  })
})

const { eventBus } = useBlokkli()

const isRendering = computed(() => props.enabled)

function onClick(item: T) {
  emit('select', item)
  eventBus.emit('action:selected')
}

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
