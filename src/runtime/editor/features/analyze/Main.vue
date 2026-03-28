<template>
  <div class="bk bk-analyze">
    <div class="bk-analyze-button">
      <button
        v-if="hasManualAnalyzers"
        class="bk-button bk-is-primary"
        :disabled="buttonDisabled"
        @click.prevent="onClick"
      >
        {{ $t('analyzeButtonLabel', 'Analyze Page') }}
      </button>

      <p v-if="lastRun" class="bk-analyze-last-run">
        <RelativeTime v-slot="{ formatted }" :timestamp="lastRun">
          {{
            $t('analyzeLastRun', 'Last run: @time').replace(
              '@time',
              formatted ?? 'never',
            )
          }}
        </RelativeTime>
      </p>

      <FormToggle
        v-model="keepVisible"
        :label="$t('analyzeKeepVisible', 'Keep results visible')"
        :description="
          $t(
            'analyzeKeepVisibleDescription',
            'When enabled, analysis results remain highlighted on the page even when the analyze panel is closed.',
          )
        "
      />

      <div v-if="analyzerStatuses.length > 1" class="bk-analyze-statuses">
        <div
          v-for="analyzer in analyzerStatuses"
          :key="analyzer.id"
          class="bk-analyze-status-item"
        >
          <span class="bk-analyze-status-title">{{ analyzer.title }}</span>
          <span
            class="bk-analyze-status-label"
            :class="{ 'bk-is-stale': analyzer.isStale }"
          >
            {{ analyzer.status }}
          </span>
        </div>
      </div>

      <p v-if="staleMessage" class="bk-message-info">
        {{ staleMessage }}
      </p>
    </div>

    <div v-if="results.length" class="bk-analyze-wrapper">
      <div v-if="categoryOptions.length > 2" class="bk-analyze-form">
        <FormSelect
          id="category"
          v-model="selectedCategory"
          :label="$t('analyzeCategory', 'Category')"
          :options="categoryOptions"
        />
      </div>
      <AnalyzeSummary :results="results" />
      <Results v-model="activeId" :results="results" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  useBlokkli,
  useState,
  onMounted,
  onUnmounted,
  watch,
} from '#imports'
import type {
  AnalyzeCategory,
  AnalyzeNodeMapped,
  AnalyzeNodeTargetMapped,
  AnalyzeResult,
  AnalyzeResultMapped,
} from './analyzers/types'
import type { AnalyzeProvider } from '#blokkli/editor/providers/analyze'
import Results from './Results/Results.vue'
import AnalyzeSummary from './Summary/index.vue'
import { useAnalyzeHelper } from './helper'
import {
  FormSelect,
  FormToggle,
  RelativeTime,
} from '#blokkli/editor/components'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import { defineHighlight } from '#blokkli/editor/composables'

const props = defineProps<{
  langcode: string
  analyze: AnalyzeProvider
  isShown: boolean
}>()

const ALL = 'ALL'

const {
  $t,
  ui,
  state,
  directive,
  dom,
  storage,
  element,
  blocks,
  eventBus,
  readability,
} = useBlokkli()
const { getCategoryLabel } = useAnalyzeHelper()

const refreshKey = computed(() => {
  return `dom:${dom.settleKey.value}_directive:${directive.settleKey.value}_state:${state.refreshKey.value}`
})

const isRunning = defineModel<boolean>({ default: false })
const issueCount = defineModel<number>('issueCount', { default: 0 })
const hasViolation = defineModel<boolean>('hasViolation', { default: false })

let currentAbortController: AbortController | null = null

type AnalyzeResultWithPluginId = AnalyzeResult & { pluginId: string }

const hasRunOnce = useState(() => false)
const continuousResults = useState<AnalyzeResultWithPluginId[]>(
  'blokkli:analyze:continuous',
  () => [],
)
const manualResults = useState<AnalyzeResultWithPluginId[]>(
  'blokkli:analyze:manual',
  () => [],
)
const activeId = useState(() => '')
const lastRun = useState(() => 0)
const lastRunKey = useState(() => '')
const selectedCategory = useState(() => ALL)
const keepVisible = storage.use('analyze:keepVisible', true)
const providerRootElement = ui.providerElement

defineHighlight(() => {
  if (!keepVisible.value && !props.isShown) {
    return
  }

  if (ui.isApproving.value) {
    return
  }

  const highlights: import('#blokkli/editor/providers/plugin').HighlightItem[] =
    []

  for (const result of results.value) {
    if (result.status !== 'incomplete' && result.status !== 'violation') {
      continue
    }

    for (const node of result.nodes) {
      if (!node) {
        continue
      }

      for (const target of node.targets) {
        if (!target) {
          continue
        }

        let targetElement: HTMLElement | null = null
        let targetUuid: string | undefined = node.uuid

        if (typeof target.target === 'string') {
          targetElement = element.query(
            ui.providerElement,
            target.target,
            'Find analyze highlight target element.',
          )
        } else if (target.target instanceof HTMLElement) {
          targetElement = target.target
        } else if ('uuid' in target.target) {
          targetUuid = target.target.uuid
          const item = blocks.getBlock(target.target.uuid)
          if (item) {
            targetElement = dom.getDragElement(item) ?? null
          }
        }

        if (targetElement) {
          const id = result.id + '_____' + target.globalIndex
          let label = result.title
          if (node.score != null) {
            const scoreLabel = readability.analyzer.value.scoreLabel
            label += ` · ${scoreLabel} ${readability.formatScore(node.score)}`
          }
          highlights.push({
            element: targetElement,
            uuid: targetUuid,
            color: result.status === 'violation' ? 'red' : 'yellow',
            icon: 'bk_mdi_speed',
            label,
            description: $t('analyzeShowDetails', 'Show details'),
            onClick: () => {
              activeId.value = id
              eventBus.emit('sidebar:open', 'analyze')
            },
          })
        }
      }
    }
  }

  return highlights
})

// Split analyzers into continuous and manual
const continuousAnalyzers = computed(() =>
  props.analyze.analyzers.value.filter((a) => a.continuous),
)
const manualAnalyzers = computed(() =>
  props.analyze.analyzers.value.filter((a) => !a.continuous),
)

const hasContinuousAnalyzers = computed(
  () => continuousAnalyzers.value.length > 0,
)
const hasManualAnalyzers = computed(() => manualAnalyzers.value.length > 0)

const allResults = computed<AnalyzeResultMapped[]>(() => {
  const merged = [...continuousResults.value, ...manualResults.value]

  const mappedResults: AnalyzeResultMapped[] = []
  let currentIndex = 0

  for (let i = 0; i < merged.length; i++) {
    const result = merged[i]
    if (!result) {
      continue
    }

    const nodes = Array.isArray(result.nodes) ? result.nodes : [result.nodes]
    const mappedNodes: AnalyzeNodeMapped[] = []

    for (let j = 0; j < nodes.length; j++) {
      const node = nodes[j]
      if (!node) {
        continue
      }

      const targets = Array.isArray(node.targets)
        ? node.targets
        : [node.targets]
      const mappedTargets: AnalyzeNodeTargetMapped[] = []

      for (let k = 0; k < targets.length; k++) {
        const target = targets[k]
        if (!target) {
          continue
        }

        mappedTargets.push({ target, globalIndex: currentIndex })
        currentIndex++
      }

      mappedNodes.push({
        ...node,
        targets: mappedTargets,
      })
    }

    mappedResults.push({
      ...result,
      plugin: result.pluginId,
      nodes: mappedNodes,
    })
  }

  return mappedResults
})

const results = computed(() => {
  // Apply category filter
  if (selectedCategory.value === ALL) {
    return allResults.value
  }

  return allResults.value.filter((v) => v.category === selectedCategory.value)
})

watch(
  allResults,
  (v) => {
    let count = 0
    for (const r of v) {
      if (r.status === 'violation' || r.status === 'incomplete') {
        for (const node of r.nodes) {
          count += node.targets.length
        }
      }
    }
    issueCount.value = count
    hasViolation.value = v.some((r) => r.status === 'violation')
  },
  { immediate: true },
)

const isStale = computed(() => lastRunKey.value !== state.refreshKey.value)

const buttonDisabled = computed(() => {
  if (isRunning.value) {
    return true
  }

  if (!isStale.value) {
    return false
  }

  return false
})

const staleMessage = computed(() => {
  // If we have manual analyzers but they haven't run yet
  if (hasManualAnalyzers.value && manualResults.value.length === 0) {
    return $t(
      'analyzeClickButton',
      'Click the button above to run the analysis.',
    )
  }

  // If manual analyzers have run but results are now stale
  if (hasManualAnalyzers.value && isStale.value) {
    return $t(
      'analyzeResultsOutdated',
      'Results are outdated. Click the button to update.',
    )
  }

  return ''
})

const analyzerStatuses = computed(() => {
  if (!hasRunOnce.value) {
    return []
  }

  return props.analyze.analyzers.value.map((analyzer) => {
    const status = analyzer.continuous
      ? $t('analyzeStatusUpToDate', 'Up-to-date')
      : isStale.value
        ? $t('analyzeStatusStale', 'Stale')
        : $t('analyzeStatusUpToDate', 'Up-to-date')

    const title =
      typeof analyzer.label === 'function'
        ? analyzer.label(ui.interfaceLanguage.value, $t)
        : analyzer.label

    return {
      id: analyzer.id,
      title: title ?? analyzer.id,
      status,
      isStale: !analyzer.continuous && isStale.value,
    }
  })
})

let refreshTimeout: number | null = null

watch(refreshKey, () => {
  if (!hasContinuousAnalyzers.value) {
    return
  }

  // Abort any currently running analysis
  if (currentAbortController) {
    currentAbortController.abort('refreshKey updated')
  }

  if (refreshTimeout) {
    window.clearTimeout(refreshTimeout)
  }

  // Show updating and running state immediately
  isRunning.value = true

  refreshTimeout = window.setTimeout(() => {
    runContinuous()
  }, 100)
})

onUnmounted(() => {
  if (currentAbortController) {
    currentAbortController.abort('refreshKey updated')
    currentAbortController = null
  }
})

async function runContinuous() {
  if (!continuousAnalyzers.value.length) {
    return
  }

  // Abort previous run if still active
  if (currentAbortController) {
    currentAbortController.abort('refreshKey updated')
  }

  // Create new abort controller for this run
  const abortController = new AbortController()
  currentAbortController = abortController

  isRunning.value = true

  let wasAborted = false

  try {
    // Ensure analyzers are fetched and initialized.
    await props.analyze.ensureInitialized()

    // Check if aborted before running analyzers
    if (abortController.signal.aborted) {
      wasAborted = true
      return
    }

    const context = props.analyze.createContext(
      providerRootElement,
      abortController.signal,
    )

    const newResults: AnalyzeResultWithPluginId[] = []

    // Run only continuous analyzers
    for (let i = 0; i < continuousAnalyzers.value.length; i++) {
      // Check if aborted between analyzers
      if (abortController.signal.aborted) {
        wasAborted = true
        return
      }

      const analyzer = continuousAnalyzers.value[i]!
      const result = (await props.analyze.runAnalyzer(analyzer, context)).map(
        (v) => {
          return {
            ...v,
            pluginId: analyzer.id,
          }
        },
      )
      newResults.push(...result)
    }

    // Check if aborted before updating results
    if (abortController.signal.aborted) {
      wasAborted = true
      return
    }

    // Update continuous results
    continuousResults.value = newResults

    hasRunOnce.value = true
    lastRun.value = Date.now() / 1000
  } catch (error) {
    // If the error is an abort error, silently ignore it
    if (error instanceof Error && error.name === 'AbortError') {
      wasAborted = true
      return
    }
    // Re-throw other errors
    throw error
  } finally {
    // Clean up only if this is still the current controller
    if (currentAbortController === abortController) {
      currentAbortController = null
      // Only set isRunning to false if we weren't aborted
      // (if aborted, a new run is about to start)
      if (!wasAborted) {
        isRunning.value = false
      }
    }
  }
}

async function onClick() {
  if (isRunning.value) {
    return
  }

  const requiresRawPage = manualAnalyzers.value.some(
    (analyzer) => analyzer.requireRawPage,
  )

  if (requiresRawPage) {
    ui.isAnalyzing.value = true
  }
  isRunning.value = true
  await renderCycle()

  // Capture the refresh key after renderCycle to ensure we're analyzing
  // the current state and can mark it as up-to-date
  const currentRefreshKey = state.refreshKey.value

  try {
    await props.analyze.ensureInitialized()

    const context = props.analyze.createContext(providerRootElement)

    const newManualResults: AnalyzeResultWithPluginId[] = []

    // Run only manual analyzers (continuous ones have already run automatically)
    for (let i = 0; i < manualAnalyzers.value.length; i++) {
      const analyzer = manualAnalyzers.value[i]!
      const result = (await props.analyze.runAnalyzer(analyzer, context)).map(
        (v) => {
          return {
            ...v,
            pluginId: analyzer.id,
          }
        },
      )
      newManualResults.push(...result)
    }

    // Update only manual results (keep existing continuous results)
    manualResults.value = newManualResults

    hasRunOnce.value = true
    lastRun.value = Date.now() / 1000

    // Only update lastRunKey if the refresh key hasn't changed during analysis
    if (state.refreshKey.value === currentRefreshKey) {
      lastRunKey.value = currentRefreshKey
    }
  } catch (error) {
    // If the error is an abort error, silently ignore it
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }
    // Re-throw other errors
    throw error
  } finally {
    isRunning.value = false

    if (requiresRawPage) {
      ui.isAnalyzing.value = false
    }
  }
}

const categoryOptions = computed<{ value: string; label: string }[]>(() => {
  const set = allResults.value.reduce<Set<AnalyzeCategory>>((acc, v) => {
    acc.add(v.category)
    return acc
  }, new Set())

  const categories = [...set.values()].map((value) => {
    return {
      value,
      label: getCategoryLabel(value),
    }
  })
  return [
    {
      value: ALL,
      label: $t('all', 'All'),
    },
    ...categories,
  ]
})

// Fetch and init analyzers on mount, then auto-run continuous ones.
onMounted(async () => {
  await props.analyze.ensureInitialized()
  if (hasContinuousAnalyzers.value) {
    await runContinuous()
  }
})
</script>
