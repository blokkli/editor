<template>
  <div :data-bk-iframe-id="scopeId" style="container-type: inline-size">
    <div class="bk-iframe-slot">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onBeforeUnmount, watch } from 'vue'
import { useBlokkli, useHead } from '#imports'
import type { IframeHeightMap } from '../../types'
import { INJECT_BLOCK_ITEM } from '#blokkli/helpers/injections'

const props = defineProps<{
  src: string
  heights: IframeHeightMap
}>()

const item = inject(INJECT_BLOCK_ITEM, null)
const uuid = computed(() => item?.value.uuid || '')
const scopeId = computed(() => uuid.value || 'unknown')

const app = useBlokkli(true)

onMounted(() => {
  if (app && uuid.value) {
    app.directive.registerValueElement(uuid.value, 'iframe', props.src)
  }
})

onBeforeUnmount(() => {
  if (app && uuid.value) {
    app.directive.unregisterValueElement(uuid.value, 'iframe')
  }
})

watch(
  () => props.src,
  (src) => {
    if (app && uuid.value) {
      app.directive.registerValueElement(uuid.value, 'iframe', src)
    }
  },
)

// Generate container query CSS rules from the heights map.
// Sort entries descending by width. The largest width becomes the default.
// Each smaller width gets a container max-width rule.
const generatedCSS = computed(() => {
  const entries = Object.entries(props.heights)
    .map(([w, h]) => ({ width: Number(w), height: h }))
    .filter((e) => !Number.isNaN(e.width) && e.height > 0)
    .sort((a, b) => b.width - a.width)

  if (!entries.length) return ''

  const sel = `[data-bk-iframe-id="${scopeId.value}"]`
  const lines: string[] = []

  // Default: largest width's height.
  lines.push(`${sel} .bk-iframe-slot { height: ${entries[0]!.height}px; }`)

  // Remaining breakpoints as container queries.
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]!
    lines.push(
      `@container (max-width: ${entry.width}px) { ${sel} .bk-iframe-slot { height: ${entry.height}px; } }`,
    )
  }

  return lines.join('\n')
})

useHead({
  style: [
    {
      key: computed(() => `bk-iframe-${scopeId.value}`),
      innerHTML: generatedCSS,
    },
  ],
})
</script>
