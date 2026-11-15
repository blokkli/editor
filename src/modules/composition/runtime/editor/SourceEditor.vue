<template>
  <div class="flex flex-col h-full p-20 gap-10">
    <p class="text-sm text-mono-700">
      The composition's markup and its &lt;style&gt; blocks.
    </p>
    <textarea
      v-model="text"
      class="flex-1 font-mono text-sm p-10 border border-mono-300 rounded"
      spellcheck="false"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import type { CompositionDocument } from '../types'
import { parseDocument } from '../helpers'

const props = defineProps<{
  data: CompositionDocument | null
  uuid: string
  optionKey: string
}>()

const text = ref(parseDocument(props.data).source)

defineExpose({
  getData(): CompositionDocument {
    return { version: 2, source: text.value }
  },
})
</script>
