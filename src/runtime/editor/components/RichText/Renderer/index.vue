<template>
  <div
    class="bk-rich-content break-words select-text"
    :class="{ 'bk-tasks-togglable': taskTogglable }"
    @click="onClick"
    v-html="enriched"
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
  if (!(e.target instanceof Element)) return
  // Match any click inside a task-item label. The hidden input has
  // pointer-events:none (CSS), so mouse clicks always land on the span/label,
  // never directly on the input — checking the click target alone misses them.
  const label = e.target.closest('li[data-type="taskItem"] > label')
  if (!label) return
  const li = label.parentElement
  if (!li) return
  const root = e.currentTarget as HTMLElement
  const items = root.querySelectorAll('li[data-type="taskItem"]')
  const index = Array.from(items).indexOf(li)
  if (index < 0) return
  // Prevent the label's default delegation to the input so the checkbox
  // doesn't visually flip until the server confirms the toggle and the
  // re-render lands.
  e.preventDefault()
  emit('toggleTask', index)
}
</script>

<script lang="ts">
export default {
  name: 'RichTextRenderer',
}
</script>
