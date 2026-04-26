<template>
  <Teleport :to="ui.mainLayoutElement.value" defer>
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
import {
  onBeforeUnmount,
  onMounted,
  useBlokkli,
  useTemplateRef,
} from '#imports'

const props = defineProps<{
  artboard: Artboard
  orientation: 'x' | 'y'
}>()

const { ui } = useBlokkli()

const el = useTemplateRef('el')
const thumb = useTemplateRef('thumb')
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

<style lang="postcss">
.bk-html-root {
  --bk-artboard-scrollbar-size: 4px;
  @variant md {
    --bk-artboard-scrollbar-size: 10px;
  }

  @variant lg {
    --bk-artboard-scrollbar-size: 16px;
  }
}

.bk.bk-artboard-scrollbar {
  @apply bg-mono-300 z-artboard-scrollbar transition overflow-hidden pointer-events-auto;
  contain: strict;
  grid-area: scrollbar-y;

  button {
    @apply bg-mono-500/50 block;
  }

  @apply py-5;

  &.bk-orientation-y {
    width: var(--bk-artboard-scrollbar-size);

    > div {
      @apply h-full;
    }

    button {
      @apply w-full;
    }
  }

  &.bk-orientation-x {
    height: var(--bk-artboard-scrollbar-size);
    left: calc(var(--bk-root-offset-left));
    right: calc(var(--bk-root-offset-right));
    bottom: calc(var(--bk-root-offset-bottom) - 1px);
    button {
      @apply h-full;
    }
    > div {
      @apply w-full;
    }
  }

  &.bk-is-active,
  &:hover {
    @apply bg-mono-300;
    button {
      @apply bg-mono-600;
    }
  }

  &.bk-is-active button,
  button:hover {
    @apply bg-mono-500;
  }
}
</style>
