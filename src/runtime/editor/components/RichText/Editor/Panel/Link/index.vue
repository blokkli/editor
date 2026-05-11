<template>
  <Panel :title @close="$emit('cancel')">
    <div>
      <div class="text-base font-medium text-mono-900">{{}}</div>
      <input
        ref="inputRef"
        v-model="href"
        type="url"
        class="bk-form-input bk-is-small"
        placeholder="https://example.com"
        @keydown.enter.prevent="onSave"
        @keydown.esc.prevent="emit('cancel')"
      />
      <div class="flex items-center gap-10 mt-10 justify-between">
        <button
          v-if="isEdit"
          type="button"
          class="bk-button bk-scheme-red bk-is-small"
          @click="emit('remove')"
        >
          {{ $t('remove', 'Remove') }}
        </button>
        <button
          type="button"
          class="bk-button bk-scheme-accent bk-is-small"
          :disabled="!href.trim()"
          @click="onSave"
        >
          {{ $t('save', 'Save') }}
        </button>
      </div>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef, useBlokkli } from '#imports'
import Panel from './../index.vue'

const props = defineProps<{
  initialHref: string
}>()

const emit = defineEmits<{
  save: [{ href: string }]
  cancel: []
  remove: []
}>()

const { $t } = useBlokkli()

const href = ref(props.initialHref)
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const isEdit = computed(() => props.initialHref.length > 0)

const title = computed(() => {
  return isEdit.value
    ? $t('richTextEditLink', 'Edit link')
    : $t('richTextAddLink', 'Add link')
})

function onSave() {
  const trimmed = href.value.trim()
  if (!trimmed) {
    return
  }
  emit('save', { href: trimmed })
}

onMounted(() => {
  inputRef.value?.focus()
  inputRef.value?.select()
})
</script>

<script lang="ts">
export default {
  name: 'LinkEditor',
}
</script>
