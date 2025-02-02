<template>
  <Teleport to="body">
    <div
      class="bk bk-artboard-scrollbar"
      :class="'bk-orientation-' + orientation"
    >
      <div ref="el">
        <button ref="thumb" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { type Artboard, type PluginScrollbar, scrollbar } from 'artboard-deluxe'
import { onBeforeUnmount, onMounted, ref } from '#imports'

const props = defineProps<{
  artboard: Artboard
  orientation: 'x' | 'y'
}>()

const el = ref<HTMLDivElement>()
const thumb = ref<HTMLButtonElement>()
let scrollbarPlugin: PluginScrollbar | null = null

onMounted(() => {
  if (el.value && thumb.value) {
    const plugin = scrollbar({
      element: el.value,
      thumbElement: thumb.value,
      orientation: props.orientation,
    })
    scrollbarPlugin = props.artboard.addPlugin(plugin)
  }
})

onBeforeUnmount(() => {
  if (scrollbarPlugin) {
    props.artboard.removePlugin(scrollbarPlugin)
  }
})

defineOptions({
  name: 'ArtboardScrollbar',
})
</script>
