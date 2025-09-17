<template>
  <details class="bk-analyze-results-item-nodes" @toggle="shouldRender = true">
    <summary>
      <span>Elements</span>
      <Icon name="caret" />
    </summary>

    <div v-if="shouldRender">
      <ul v-for="group in grouped">
        <li>
          <p v-if="group.description" v-html="group.description" />
          <ul>
            <li v-for="node in group.nodes">
              <ResultsItemNodesTarget
                v-for="target in node.targets"
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
import { computed, ref } from '#imports'
import type { AnalyzeNode } from '../types'
import ResultsItemNodesTarget from './ResultsItemNodesTarget.vue'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  nodes: AnalyzeNode[]
}>()

const shouldRender = ref(false)

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
