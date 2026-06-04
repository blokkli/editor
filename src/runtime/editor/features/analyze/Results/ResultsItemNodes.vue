<template>
  <details
    v-if="nodes.length"
    class="bg-mono-100 mt-10 overflow-hidden group/nodes"
    :open="isSingle || isOpen"
    data-test="analyze-result-nodes"
    @toggle="shouldRender = true"
  >
    <summary
      v-show="!isSingle"
      class="group-open/nodes:text-mono-950 text-sm font-semibold p-10 cursor-pointer appearance-none list-none flex justify-between items-center text-mono-600 hover:bg-mono-200 hover:text-mono-950"
      data-test="analyze-result-nodes-summary"
    >
      <span>{{ $t('multipleItemsLabel', 'Items') }}</span>
      <Icon
        name="bk_mdi_arrow_drop_down"
        class="group-open/nodes:rotate-180 size-15"
      />
    </summary>

    <div v-if="shouldRender" class="bk-analyze-results-item-nodes-list">
      <ul
        v-for="(group, i) in grouped"
        :key="i"
        :class="{
          'border-t border-t-mono-300 pt-10': i > 0,
        }"
      >
        <li>
          <p
            v-if="group.description && group.description !== 'NONE'"
            class="text-xs text-mono-700 px-10 mb-3"
            :class="{
              'pt-10': isSingle,
            }"
            v-html="group.description"
          />
          <ul>
            <li
              v-for="(node, j) in group.nodes"
              :key="i + '_' + j"
              class="text-xs"
            >
              <ResultsItemNodesTarget
                v-for="(target, k) in node.targets"
                :key="i + '_' + j + '_' + k"
                :node
                :target
                :result-id
              />
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli, watch } from '#imports'
import type { AnalyzeNodeMapped } from '../analyzers/types'
import ResultsItemNodesTarget from './ResultsItemNodesTarget.vue'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  resultId: string
  nodes: AnalyzeNodeMapped[]
}>()

const shouldRender = ref(false)

const isOpen = ref(false)

const { $t, ui } = useBlokkli()

const isSingle = computed(
  () => props.nodes.length === 1 && props.nodes[0]?.targets.length === 1,
)

const grouped = computed(() => {
  const map = props.nodes.reduce<Record<string, AnalyzeNodeMapped[]>>(
    (acc, node) => {
      const description = node.description ?? 'NONE'
      if (!acc[description]) {
        acc[description] = []
      }

      acc[description]!.push(node)

      return acc
    },
    {},
  )

  return Object.entries(map).map(([description, nodes]) => {
    return {
      description: description === 'none' ? '' : description,
      nodes,
    }
  })
})

watch(
  () => ui.activeHighlightId.value,
  (id) => {
    const resultId = id.split('_____')[0]
    if (resultId === props.resultId) {
      shouldRender.value = true
      isOpen.value = true
    }
  },
  // Immediate so a panel mounting AFTER a highlight click (e.g. cold-load
  // sidebar open) still sees the already-set `activeHighlightId` and expands.
  { immediate: true },
)
</script>
