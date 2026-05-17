<template>
  <CommentInput
    :id="`comment_edit_${uuid}`"
    :initial-value="body"
    cancellable
    :submit-label="$t('save', 'Save')"
    :can-submit="hasChange"
    boxed
    @change="onChange"
    @submit="$emit('submit', $event)"
    @cancel="$emit('cancel')"
  />
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import CommentInput from '../../CommentInput/index.vue'

const { $t } = useBlokkli()

const props = defineProps<{
  uuid: string
  body: string
}>()

defineEmits<{
  (e: 'submit', value: string): void
  (e: 'cancel'): void
}>()

const current = ref(props.body)

function onChange(html: string) {
  current.value = html
}

const hasChange = computed(() => {
  const stripped = current.value.replace(/<[^>]*>/g, '').replace(/\s+/g, '')
  return stripped.length > 0 && current.value !== props.body
})
</script>

<script lang="ts">
export default {
  name: 'CommentEditForm',
}
</script>
