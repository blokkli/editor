<template>
  <button class="bk-validation-item" @click.prevent="onClick">
    <div v-if="block" class="bk-validation-item-header">
      <ItemIcon :bundle="block.itemBundle" />
      <div>{{ itemBundle?.label }}</div>
    </div>
    <div v-html="message" />
  </button>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import { ItemIcon } from '#blokkli/components'

const props = defineProps<{
  message: string
  propertyPath?: string
  code?: string
  entityType?: string
  entityUuid?: string
}>()

const { runtimeConfig, eventBus, dom, types } = useBlokkli()

const isBlock = computed(
  () => props.entityType === runtimeConfig.itemEntityType,
)

const block = computed(() => {
  if (isBlock.value && props.entityUuid) {
    return dom.findBlock(props.entityUuid)
  }

  return null
})

const itemBundle = computed(() => {
  if (block.value?.itemBundle) {
    return types.getBlockBundleDefinition(block.value.itemBundle)
  }

  return null
})

function onClick() {
  if (isBlock.value && props.entityUuid) {
    eventBus.emit('scrollIntoView', { uuid: props.entityUuid, center: true })
  }
}
</script>
