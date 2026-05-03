<template>
  <div
    class="bk-rich-content break-words select-text"
    :class="{ 'bk-tasks-togglable': taskTogglable }"
    v-html="enriched"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { enrichRichContent } from './enrichRichContent'

const props = withDefaults(
  defineProps<{
    body: string
    /**
     * When true, checkboxes inside task lists are interactive and emit
     * `toggleTask` with the index of the clicked task item.
     */
    taskTogglable?: boolean
  }>(),
  { taskTogglable: false },
)

const emit = defineEmits<{
  (e: 'toggleTask', taskIndex: number): void
}>()

const enriched = computed(() => enrichRichContent(props.body))

function onClick(e: MouseEvent) {
  if (!props.taskTogglable) return
  const target = e.target
  if (
    !(target instanceof HTMLInputElement) ||
    target.type !== 'checkbox'
  ) {
    return
  }
  const li = target.closest('li[data-type="taskItem"]')
  const root = e.currentTarget as HTMLElement
  if (!li) return
  const items = root.querySelectorAll('li[data-type="taskItem"]')
  const index = Array.from(items).indexOf(li)
  if (index < 0) return
  e.preventDefault()
  emit('toggleTask', index)
}
</script>

<script lang="ts">
export default {
  name: 'RichTextRenderer',
}
</script>
