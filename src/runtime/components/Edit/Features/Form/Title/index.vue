<template>
  <div class="bk-drupal-modal-header">
    <ItemIcon v-if="bundle" :bundle="bundle" />
    <div v-else class="bk-blokkli-item-icon">
      <Icon name="form" />
    </div>
    <span>{{ title }}</span>
    <button @mousedown.capture.stop="$emit('close')">
      <Icon name="close" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'
import { ItemIcon, Icon } from '#blokkli/components'

const props = defineProps<{
  form: AdapterFormFrameBuilder
}>()

defineEmits<{
  (e: 'close'): void
}>()

const title = computed(() => '')

const bundle = computed(() => {
  if (props.form.id === 'block:add') {
    return props.form.data.type
  } else if (props.form.id === 'block:edit') {
    return props.form.data.bundle
  } else if (props.form.id === 'block:translate') {
    return props.form.data.bundle
  }
})
</script>
