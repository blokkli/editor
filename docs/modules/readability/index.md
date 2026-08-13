# Readability

The readability module adds **text readability analysis** to the editor. It
scores text content and flags passages that are harder to read than they should
be, both as inline indicators on text fields and in the
[Analyze](/editor/features) sidebar.

The module is **zero-config** — enable it and the built-in analyzer works.

## Enable the module

```typescript
import readability from '@blokkli/editor/readability'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [readability()],
  },
})
```

This registers the `@blokkli/readability` adapter extension, which supplies the
built-in readability analyzer. English readability needs syllable counting, so
the module lazily loads the `syllable` package only when needed — it costs
nothing for other languages.

## Two pieces

Readability involves two distinct, cooperating parts:

1. **The scoring engine** — an object implementing the `ReadabilityAnalyzer`
   contract, supplied through the adapter's `getReadabilityAnalyzer` method. It
   computes a score per chunk of text, classifies it into a band (`easy` / `ok`
   / `hard`), and reports an impact. This drives the inline readability
   indicators on text fields. The readability module provides the default
   implementation; you can
   [provide your own](/modules/readability/custom-analyzer).

2. **The sidebar analyzer** — `readabilityAnalyzer()` from `#blokkli/analyzer`,
   added to the adapter's `getAnalyzers`. It surfaces the engine's results in
   the Analyze sidebar. It is a thin wrapper that delegates scoring to the
   engine, so it works with whichever analyzer (built-in or custom) is active:

   ```typescript
   import { readabilityAnalyzer } from '#blokkli/analyzer'

   // in your edit adapter:
   getAnalyzers: () => [readabilityAnalyzer()],
   ```

## Built-in languages & metrics

The built-in analyzer picks a language-appropriate formula based on the
content's language code:

| Language | Metric                           | Notes                                           |
| -------- | -------------------------------- | ----------------------------------------------- |
| `en`     | Flesch Reading Ease → **CEFR**   | Raw FRE score is mapped to a CEFR band (A1–C2). |
| `de`     | Wiener Sachtextformel (**WSTF**) | German-specific readability formula.            |
| `fr`     | **LIX**                          | Läsbarhetsindex.                                |
| `it`     | **Gulpease**                     | Italian-specific readability index.             |

Each metric defines bands (easy / ok / hard) and a reference table. For example,
the English (CEFR) scale maps:

- FRE 90–100 → A1 (beginners)
- FRE 70–80 → B1 (intermediate)
- FRE 60–70 → B2 (upper intermediate, the target)
- FRE below 50 → C2 (mastery — this is what gets flagged)

Very short passages (below a per-metric minimum word count) are skipped, since
readability scores are unreliable on tiny samples.

## See also

- [Custom Analyzer](/modules/readability/custom-analyzer) — replace the built-in
  scoring engine with your own.
- [Editor — Features](/editor/features) — how the Analyze sidebar presents
  results.
