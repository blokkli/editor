<template>
  <Teleport to="body">
    <div
      class="bk bk-artboard-scrollbar"
      :class="'bk-orientation-' + orientation"
    >
      <div ref="el">
        <button class="dragboard-thumb" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { type DragboardDom, Scrollbar } from 'dragboard'
import { onBeforeUnmount, onMounted, ref } from '#imports'

const props = defineProps<{
  dragboard: DragboardDom
  orientation: 'x' | 'y'
}>()

const el = ref<HTMLDivElement>()
let scrollbar: Scrollbar | null = null

onMounted(() => {
  if (el.value) {
    scrollbar = new Scrollbar(el.value, {
      orientation: props.orientation,
    })
    props.dragboard.addPlugin(scrollbar)
  }
})

onBeforeUnmount(() => {
  if (scrollbar) {
    props.dragboard.removePlugin(scrollbar)
  }
})
</script>
