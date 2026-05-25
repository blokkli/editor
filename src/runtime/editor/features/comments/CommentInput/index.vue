<template>
  <form
    data-test="comment-input"
    :class="{
      'border border-mono-300 rounded bg-white focus-within:border-mono-400':
        boxed,
    }"
    @submit.prevent="onSubmit"
    @keydown.stop
  >
    <RichTextEditor
      ref="richTextRef"
      :initial-value="initialValue"
      :autofocus="autofocus"
      :get-users="canMention ? getUsers : undefined"
      no-border
      @change="onChange"
    />
    <div
      class="flex items-center gap-5 p-5 border-t border-t-mono-300 border-dashed"
    >
      <button
        v-if="cancellable"
        type="button"
        class="bk-button bk-is-small bk-is-light"
        data-test="comment-input-cancel"
        @click="$emit('cancel')"
      >
        {{ $t('cancel', 'Cancel') }}
      </button>
      <button
        type="submit"
        class="bk-button bk-scheme-yellow bk-is-small ml-auto"
        data-test="comment-input-submit"
        :disabled="!effectiveCanSubmit"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  ref,
  useBlokkli,
  useTemplateRef,
} from '#imports'

const RichTextEditor = defineAsyncComponent(
  () => import('#blokkli/editor/components/RichText/Editor/index.vue'),
)

const props = withDefaults(
  defineProps<{
    id: string
    initialValue?: string
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
    initialValue: '',
    autofocus: true,
    cancellable: false,
    canSubmit: undefined,
  },
)

const emit = defineEmits<{
  (e: 'submit' | 'change', value: string): void
  (e: 'cancel'): void
}>()

const { $t, user, permissions } = useBlokkli()

const canMention = permissions.hasPermission('list_users')

function getUsers() {
  return user
    .loadUsers()
    .then((users) => users.map((u) => ({ id: u.id, label: u.name })))
}

const richTextRef = useTemplateRef<{
  getHTML: () => string
  isEmpty: () => boolean
}>('richTextRef')

const isEmpty = ref(!props.initialValue || !props.initialValue.trim())

const effectiveCanSubmit = computed(() => {
  if (props.canSubmit !== undefined) {
    return props.canSubmit
  }
  return !isEmpty.value
})

function onChange(payload: { html: string; isEmpty: boolean }) {
  isEmpty.value = payload.isEmpty
  emit('change', payload.html)
}

function onSubmit() {
  if (!effectiveCanSubmit.value) {
    return
  }
  const html = richTextRef.value?.getHTML() ?? ''
  emit('submit', html)
}
</script>
