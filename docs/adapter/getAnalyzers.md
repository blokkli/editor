# getAnalyzers

Get content analyzers for the editor.

## Signature

```typescript
getAnalyzers?: () =>
  | Analyzer
  | Analyzer[]
  | Promise<Analyzer>
  | Promise<Analyzer[]>
```

## Returns

An analyzer, array of analyzers, or a promise that resolves to analyzer(s).

## Description

Analyzers are tools that check content for accessibility, SEO, or other quality
issues. This method returns analyzer definitions that the editor will use to
validate content.

Analyzers can be either:

- **Manual**: Run when the user explicitly triggers them
- **Continuous**: Run automatically as content changes

## Example

```typescript
getAnalyzers: () => {
  return [
    {
      id: 'heading-structure',
      title: 'Heading Structure',
      description: 'Check if headings follow a logical hierarchy',
      type: 'manual',
      run: async (provider) => {
        const headings = provider.querySelectorAll('h1, h2, h3, h4, h5, h6')
        const violations = []

        // Check heading hierarchy
        for (let i = 0; i < headings.length; i++) {
          // ... analyze headings
        }

        return {
          status: violations.length > 0 ? 'violation' : 'pass',
          nodes: violations,
        }
      },
    },
  ]
}
```

See the analyzer documentation for more details on creating custom analyzers.

## The analyzer context

`run()` and `init()` receive an `AnalyzerContext` with everything an analyzer
needs about the current state:

- `providerRootElement` — the root element of the rendered page
- `langcode` / `interfaceLangcode` — the content and editor UI language
- `entity` — the edited host entity (`type`, `uuid`, `bundle`)
- `mutatedFields` — the current block tree
- `violations` — backend-reported validation errors
- `getTextElements()` — the lowest block elements that contain text
- `getTextFieldValues()` — the stored (unrendered) values of all text fields.
  The host entity's own fields are listed under `entity.uuid`. Use this when an
  analyzer must know what the editor actually stores, e.g. because backend text
  filters rewrite links or markup while rendering. Pass `{ processed: true }` to
  get the same fields with their rendered values instead.
- `readRawValue(host, fieldName)` — the stored value of a single text field
- `getFieldListItem(uuid)` — the block for a UUID
- `$t` — the translation function
- `signal` — an `AbortSignal` that fires when the run is cancelled

## Built-in analyzers

blökkli ships a few analyzers you can return from `getAnalyzers`. They are
exported from `#blokkli/analyzer`:

- `headingStructureAnalyzer` — checks the heading hierarchy (exactly one H1, at
  least one H2, no skipped levels)
- `altTextAnalyzer` — checks that images have alt text
- `readabilityAnalyzer` — scores text readability
- `axeAnalyzer` — runs axe-core accessibility rules

### Excluding content

- Add the class `bk-skip-analyze` to any element to exclude it and its children
  from text and heading analysis.
- Add the class `bk-skip-heading-structure` to the provider root element to
  disable the heading structure analyzer for the whole page.
