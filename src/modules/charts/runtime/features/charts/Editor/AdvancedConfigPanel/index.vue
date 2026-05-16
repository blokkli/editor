<template>
  <PanelSection
    :title="$t('chartsAdvancedConfigTitle', 'ECharts configuration')"
  >
    <div class="p-panel-gap flex flex-col gap-10">
      <p class="text-mono-700 leading-snug">
        {{
          $t(
            'chartsAdvancedConfigHelp',
            'Paste any ECharts option object. Keys without quotes, single quotes and trailing commas are allowed. Functions (e.g. custom formatters) are not supported.',
          )
        }}
      </p>
      <FlexTextarea
        :model-value="displayedSource"
        textarea-class
        class="bk-is-mono"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        :min-height="320"
        :on-before-paste="onBeforePaste"
        @update:model-value="onSourceChange"
      />
      <div
        v-if="parseError"
        class="bk-advanced-config-error font-mono text-mono-900"
      >
        <div class="font-sans font-semibold mb-3 text-red-normal">
          {{ $t('chartsAdvancedParseError', 'Parse error') }}
        </div>
        <div class="whitespace-pre-wrap break-words">{{ parseError }}</div>
      </div>
    </div>
    <template #actions>
      <PanelAction
        :title="$t('chartsAdvancedOpenExamples', 'Open examples')"
        icon="bk_mdi_open_in_new"
        @click="openExamples"
      />
    </template>
  </PanelSection>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import JSON5 from 'json5'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import FlexTextarea from '#blokkli/editor/components/FlexTextarea/index.vue'
import type { ClipboardData } from '#blokkli/editor/helpers/clipboardData'
import type { ChartAdvancedConfig } from '../../../../types'

const { $t } = useBlokkli()

const config = defineModel<ChartAdvancedConfig>({ required: true })

/** Reformat a parsed object as pretty-printed JSON for the textarea. */
function formatParsed(parsed: Record<string, unknown>): string {
  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return ''
  }
}

// The textarea text. Prefers the user's draft `source` (preserves their
// JSON5 formatting), falls back to the canonical pretty-printed JSON.
const displayedSource = computed(() => {
  if (typeof config.value.source === 'string') return config.value.source
  return formatParsed(config.value.parsed)
})

const parseError = ref('')

function parseSource(
  raw: string,
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true, value: {} }
  }
  try {
    const value = JSON5.parse(trimmed)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        ok: false,
        error: $t(
          'chartsAdvancedParseErrorNotObject',
          'Configuration must be an object.',
        ),
      }
    }
    return { ok: true, value: value as Record<string, unknown> }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

function onSourceChange(next: string) {
  const result = parseSource(next)
  if (result.ok) {
    parseError.value = ''
    config.value = { source: next, parsed: result.value }
  } else {
    parseError.value = result.error
    // Keep the previous canonical `parsed` so the chart preview doesn't
    // break while the user is mid-edit.
    config.value = { source: next, parsed: config.value.parsed }
  }
}

/**
 * Strip the `option = …;` wrapper that ECharts examples wrap their config in,
 * so users can paste examples verbatim from echarts.apache.org/examples.
 * Returns `null` when nothing to clean.
 */
function cleanPastedConfig(raw: string): string | null {
  const trimmed = raw.trim()
  const text = trimmed
    .replace(/^(?:var|let|const)\s+option\s*=\s*/, '')
    .replace(/^option\s*=\s*/, '')
    .replace(/;\s*$/, '')
    .trim()
  return text === trimmed ? null : text
}

function onBeforePaste(data: ClipboardData): boolean {
  const pasted = data.toText()
  if (!pasted) return false
  const cleaned = cleanPastedConfig(pasted)
  if (cleaned === null) return false // Nothing to strip — let the browser paste.

  // Try to canonicalize the cleaned blob so the textarea shows pretty JSON.
  // Falls back to the cleaned text if it doesn't parse — the parse-error
  // panel will surface the problem.
  const result = parseSource(cleaned)
  if (result.ok) {
    parseError.value = ''
    config.value = {
      source: JSON.stringify(result.value, null, 2),
      parsed: result.value,
    }
  } else {
    parseError.value = result.error
    config.value = { source: cleaned, parsed: config.value.parsed }
  }
  return true
}

function openExamples() {
  window
    .open('https://echarts.apache.org/examples/en/index.html', '_blank')
    ?.focus()
}
</script>

<style lang="postcss">
.bk-advanced-config-error {
  @apply p-10 border-2 border-red-normal/40 bg-red-light/20 rounded text-sm;
}
</style>
