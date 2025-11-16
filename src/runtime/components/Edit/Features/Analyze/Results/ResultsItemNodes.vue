<template>
  <details
    v-if="mappedNodes.length"
    class="bk-analyze-results-item-nodes"
    :open="isSingle || isOpen"
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
                :index="i"
                :target="target"
                :result-id
                v-model="activeId"
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
import type { AnalyzeNode, AnalyzeNodeTarget } from '../analyzers/types'
import ResultsItemNodesTarget from './ResultsItemNodesTarget.vue'
import { Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const props = defineProps<{
  resultId: string
  nodes: AnalyzeNode | AnalyzeNode[]
}>()

const activeId = defineModel<string>({ default: '' })
const shouldRender = ref(false)

const isOpen = ref(false)

const { $t } = useBlokkli()

type MappedAnalyzeNode = Omit<AnalyzeNode, 'targets'> & {
  targets: AnalyzeNodeTarget[]
}

const mappedNodes = computed<MappedAnalyzeNode[]>(() => {
  const nodes = Array.isArray(props.nodes) ? props.nodes : [props.nodes]
  return nodes.map((node) => {
    return {
      ...node,
      targets: Array.isArray(node.targets) ? node.targets : [node.targets],
    }
  })
})

const isSingle = computed(
  () =>
    mappedNodes.value.length === 1 &&
    mappedNodes.value[0]?.targets.length === 1,
)

const grouped = computed(() => {
  const map = mappedNodes.value.reduce<Record<string, MappedAnalyzeNode[]>>(
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

watch(activeId, (id) => {
  const resultId = id.split('_____')[0]
  if (resultId === props.resultId) {
    isOpen.value = true
  }
})
</script>
