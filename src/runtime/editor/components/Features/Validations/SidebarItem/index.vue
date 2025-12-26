<template>
  <button class="bk-validation-item" @click.prevent="onClick">
    <div v-if="block" class="bk-validation-item-header">
      <ItemIcon :bundle="block.bundle" />
      <div>{{ itemBundle?.label }}</div>
    </div>
    <div v-html="message" />
  </button>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import { ItemIcon } from '#blokkli/editor/components'
import { itemEntityType } from '#blokkli-build/config'

const props = defineProps<{
  message: string
  propertyPath?: string
  code?: string
  entityType?: string
  entityUuid?: string
}>()

const { eventBus, types, blocks } = useBlokkli()

const isBlock = computed(() => props.entityType === itemEntityType)

const block = computed(() => {
  if (isBlock.value && props.entityUuid) {
    return blocks.getBlock(props.entityUuid)
  }

  return null
})

const itemBundle = computed(() => {
  if (block.value?.bundle) {
    return types.getBlockBundleDefinition(block.value.bundle)
  }

  return null
})

function onClick() {
  if (isBlock.value && props.entityUuid) {
    eventBus.emit('scrollIntoView', { uuid: props.entityUuid, center: true })
  }
}
</script>
