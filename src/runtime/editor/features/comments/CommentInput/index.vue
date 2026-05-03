<template>
  <form
    :class="{
      'border border-mono-200 rounded p-10 bg-mono-50': boxed,
    }"
    @submit.prevent="onSubmit"
    @keydown.capture.stop
  >
    <div class="bk-comment-textarea">
      <textarea
        :id
        ref="textarea"
        v-model="value"
        type="text"
        rows="2"
        :placeholder
        required
        :class="{
          'bk-form-input bk-scheme-yellow': boxed,
          'w-full border-0 outline-0 p-15 focus:ring-0! block': !boxed,
        }"
      />
    </div>
    <div
      class="flex items-center justify-end gap-5"
      :class="boxed ? 'mt-10 ' : 'p-5 border-t border-t-mono-300 border-dashed'"
    >
      <button
        v-if="cancellable"
        type="button"
        class="bk-button bk-is-small bk-is-light"
        @click="$emit('cancel')"
      >
        {{ $t('commentCancelEdit', 'Cancel') }}
      </button>
      <button
        type="submit"
        class="bk-button bk-scheme-yellow bk-is-small"
        :disabled="!effectiveCanSubmit"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, useBlokkli, useTemplateRef } from '#imports'

const props = withDefaults(
  defineProps<{
    id: string
    placeholder?: string
    autofocus?: boolean
    submitLabel: string
    cancellable?: boolean
    /**
     * When provided, replaces the default "non-empty" check for enabling the
     * submit button. Used by edit-mode where submit should also require a
     * change relative to the original body.
     */
    canSubmit?: boolean
    boxed?: boolean
  }>(),
  {
    placeholder: undefined,
    autofocus: true,
    cancellable: false,
    canSubmit: undefined,
  },
)

const value = defineModel<string>()

const emit = defineEmits<{
  (e: 'submit', value: string): void
  (e: 'cancel'): void
}>()

const { $t } = useBlokkli()

const effectiveCanSubmit = computed(() => {
  if (props.canSubmit !== undefined) {
    return props.canSubmit
  }
  return (value.value || '').trim().length > 0
})

const el = useTemplateRef('textarea')

onMounted(() => {
  if (el.value && props.autofocus) {
    el.value.focus()
  }
})

function onSubmit() {
  if (!effectiveCanSubmit.value) {
    return
  }
  emit('submit', value.value || '')
}
</script>
