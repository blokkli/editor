<template>
  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <FormOverlay
        v-if="isVisible"
        :id="id"
        :title="title"
        :icon="icon"
        @close="onClose"
      >
        <slot></slot>
        <template #footer>
          <button class="bk-button bk-is-primary" @click="onSubmit">
            {{ $t('droppableEditFormSave', 'Save') }}
          </button>
        </template>
      </FormOverlay>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { BlokkliIcon } from '#blokkli/icons'
import type { DroppableEntityField, DroppableFieldConfig } from '#blokkli/types'
import { ref, useBlokkli } from '#imports'

const props = defineProps<{
  id: string
  title: string
  icon: BlokkliIcon
  entityType: string
}>()

const emit = defineEmits<{
  (e: 'save', data: DroppableEntityField): void
}>()

const { $t, types } = useBlokkli()

type DroppableField = {
  field: DroppableEntityField
  config: DroppableFieldConfig
}

const droppable = ref<DroppableField | null>(null)

const isVisible = ref(false)

const onClose = () => {
  isVisible.value = false
}

const onSubmit = () => {
  if (droppable.value) {
    emit('save', droppable.value.field)
  }
  isVisible.value = false
  droppable.value = null
}

onBlokkliEvent('droppable:focus', (field) => {
  const config = types.getDroppableFieldConfig(field.fieldName, field.host)
  if (config.allowedEntityType === props.entityType) {
    isVisible.value = true
    droppable.value = { field, config }
  }
})
</script>
