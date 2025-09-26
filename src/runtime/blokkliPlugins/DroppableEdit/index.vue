<template>
  <Teleport to="body">
    <BlokkliTransition name="slide-in">
      <FormOverlay
        v-if="isVisible"
        :id="id"
        :title="title"
        :icon="icon"
        @close="onClose"
      >
        <slot />
        <template #footer>
          <button class="bk-button bk-is-primary" @click="onSubmit">
            {{ $t('droppableEditFormSave', 'Save') }}
          </button>
        </template>
      </FormOverlay>
    </BlokkliTransition>
  </Teleport>
</template>

<script setup lang="ts">
import { FormOverlay, BlokkliTransition } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { BlokkliIcon } from '#blokkli-build/icons'
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

const { $t, types, state } = useBlokkli()

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
  if (state.editMode.value !== 'editing') {
    return
  }
  const config = types.getDroppableFieldConfig(field.fieldName, field.host)
  if (config.allowedEntityType === props.entityType) {
    isVisible.value = true
    droppable.value = { field, config }
  }
})
</script>
