# Readability Refactor: Master Plan

## Problem

Readability analysis operates on DOM nodes, which shows processed markup (e.g.,
Drupal filter-rewritten URLs), not raw field values. The system also lacks typed
scores, configurable thresholds, and a formal interface for custom analyzers.

## Design Decisions

- **Single readability analyzer**: One active analyzer at a time. Built-in
  default (LIX/CLI/ARI/Gulpease) can be overridden by the adapter.
- **Batch analysis**: `analyze(texts[], langcode)` processes all chunks in one
  call (efficient for API-based analyzers like CEFR).
- **Raw field values**: New adapter method `getTextFieldValues()` provides
  unprocessed markup. Fallback to directive/DOM reading.
- **Scoring is numeric**: Even categorical systems (CEFR) map to numbers.
  `formatScore()` handles display conversion.
- **Agent-aware**: Each analyzer provides `getAgentContext()` for dynamic prompt
  generation.

## Phases

### Phase 1: Core Readability System

New readability types, adapter method, built-in analyzer extraction, readability
provider, and integration into existing analyze feature UI.

**Files:**

- `src/runtime/editor/features/analyze/readability/types.ts` — new types
- `src/runtime/editor/features/analyze/readability/adapterTypes.ts` — adapter
  augmentation
- `src/runtime/editor/features/analyze/readability/chunkHtml.ts` — HTML chunking
- `src/runtime/editor/features/analyze/readability/builtinAnalyzer.ts` — default
  analyzer
- `src/runtime/editor/providers/readability.ts` — new provider
- Modify `src/runtime/editor/types/app.ts` — add to BlokkliApp
- Modify `src/runtime/editor/components/EditProvider.vue` — initialize provider
- Modify `src/runtime/editor/features/analyze/analyzers/readability.ts` — thin
  wrapper
- Modify `src/runtime/editor/features/analyze/analyzers/helpers/Context.ts` —
  add readability ref
- Modify `playground/app/blokkli.editAdapter.ts` — implement
  `getTextFieldValues()`

### Phase 2: Agent Integration

Refactor agent tools to use the readability provider instead of DOM-based
analysis.

**Files:**

- Modify `src/modules/agent/runtime/app/tools/helpers.ts` — use
  `app.readability`
- Modify `src/modules/agent/runtime/app/tools/check_readability/index.ts`
- Modify `src/modules/agent/runtime/app/tools/get_readability_issues/index.ts`
- Modify `src/modules/agent/runtime/app/tools/stream_text_fields/Component.vue`
  — use `analyzeFieldValues()` for verification

### Phase 3: Dynamic Agent Prompts

Make the `fix_readability` template use dynamic scoring context from the
analyzer.

**Files:**

- Modify `src/modules/agent/runtime/server/templates.ts` — dynamic
  `scoreReference`
- Modify `src/modules/agent/runtime/app/tools/stream_text_fields/Component.vue`
  — pass `scoreReference`, use `formatScore()` in UI

## Key Interfaces

### ReadabilityAnalyzer

```typescript
type ReadabilityAnalyzer = {
  id: string
  label?: string | ((langcode: string) => string)
  description?: string
  supportedLanguages?: string[]
  minWordsForConfidence?: number // default: 5
  init?(langcode: string): void | Promise<void>
  analyze(
    texts: string[],
    langcode: string,
  ): Promise<(ReadabilityScores | null)[]>
  classifyBand(scores: ReadabilityScores, langcode: string): ReadabilityBand
  impactForScores(scores: ReadabilityScores): AnalyzeImpact
  getAgentContext(): string
  formatScore?(key: string, value: number): string
}
```

### ReadabilityProvider

```typescript
type ReadabilityProvider = {
  analyzer: Ref<ReadabilityAnalyzer>
  isInitialized: Ref<boolean>
  ensureInitialized(): Promise<void>
  getTextFieldValues(): Promise<TextFieldValue[]>
  analyzeAllFields(): Promise<ReadabilityAnalysisResult>
  analyzeText(
    text: string,
    langcode: string,
    fieldType?: 'plain' | 'markup',
  ): Promise<ReadabilityChunkResult[]>
  analyzeFieldValues(
    fields: TextFieldValue[],
  ): Promise<ReadabilityAnalysisResult>
  getAgentContext(): string
  formatScore(key: string, value: number): string
}
```

### Custom Analyzer Example (CEFR via API)

```typescript
getReadabilityAnalyzer() {
  return {
    id: 'cefr',
    label: 'CEFR Level',
    async analyze(texts, langcode) {
      const res = await fetch('/api/cefr', {
        method: 'POST',
        body: JSON.stringify({ texts, langcode }),
      })
      const { levels } = await res.json()
      const map = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
      return levels.map((l) => ({ cefr: map[l] ?? 4 }))
    },
    classifyBand(scores) {
      if (scores.cefr <= 3) return 'easy'
      if (scores.cefr <= 4) return 'ok'
      return 'hard'
    },
    impactForScores(scores) {
      if (scores.cefr >= 6) return 'critical'
      if (scores.cefr >= 5) return 'serious'
      return 'moderate'
    },
    getAgentContext() {
      return '## CEFR Reference\nA1-B1: easy\nB2: medium\nC1-C2: hard'
    },
    formatScore(key, value) {
      if (key === 'cefr')
        return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][value - 1] || String(value)
      return String(value)
    },
  }
}
```
