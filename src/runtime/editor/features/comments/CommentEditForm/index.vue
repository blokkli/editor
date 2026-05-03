<template>
  <CommentInput
    :id="`comment_edit_${uuid}`"
    v-model="value"
    cancellable
    :submit-label="$t('commentSaveEdit', 'Save')"
    :can-submit="hasChange"
    boxed
    @submit="$emit('submit', $event)"
    @cancel="$emit('cancel')"
  />
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import CommentInput from '../CommentInput/index.vue'

const { $t } = useBlokkli()

const props = defineProps<{
  uuid: string
  body: string
}>()

defineEmits<{
  (e: 'submit', value: string): void
  (e: 'cancel'): void
}>()

const value = ref(props.body)

const hasChange = computed(
  () => value.value.trim().length > 0 && value.value !== props.body,
)
</script>

<script lang="ts">
export default {
  name: 'CommentEditForm',
}
</script>
