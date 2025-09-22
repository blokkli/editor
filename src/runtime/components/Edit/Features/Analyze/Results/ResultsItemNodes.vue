<template>
  <details
    class="bk-analyze-results-item-nodes"
    :open="isSingle"
    @toggle="shouldRender = true"
  >
    <summary v-show="!isSingle">
      <span>{{ $t('multipleItemsLabel', 'Items') }}</span>
      <Icon name="caret" />
    </summary>

    <div v-if="shouldRender" class="bk-analyze-results-item-nodes-list">
      <ul v-for="(group, i) in grouped" :key="i">
        <li>
          <p
            v-if="group.description && group.description !== 'NONE'"
            :class="{
              'bk-is-single': isSingle,
            }"
            v-html="group.description"
          />
          <ul>
            <li v-for="(node, j) in group.nodes" :key="i + '_' + j">
              <ResultsItemNodesTarget
                v-for="(target, k) in node.targets"
                :key="i + '_' + j + '_' + k"
                :target="target"
              />
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import type { AnalyzeNode } from '../types'
import ResultsItemNodesTarget from './ResultsItemNodesTarget.vue'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  nodes: AnalyzeNode[]
}>()

const shouldRender = ref(false)

const { $t } = useBlokkli()

const isSingle = computed(
  () => props.nodes.length === 1 && props.nodes[0]?.targets.length === 1,
)

const grouped = computed(() => {
  const map = props.nodes.reduce<Record<string, AnalyzeNode[]>>((acc, node) => {
    const description = node.description ?? 'NONE'
    if (!acc[description]) {
      acc[description] = []
    }

    acc[description]!.push(node)

    return acc
  }, {})

  return Object.entries(map).map(([description, nodes]) => {
    return {
      description: description === 'none' ? '' : description,
      nodes,
    }
  })
})
</script>
