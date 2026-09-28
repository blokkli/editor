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

Define an analyzer with `defineAnalyzer` and return it next to the built-in
ones:

```typescript
import { defineAnalyzer, headingStructureAnalyzer } from '#blokkli/analyzer'

const emptyGridAnalyzer = defineAnalyzer(() => ({
  id: 'project:empty-grid',
  label: (_langcode, $t) => $t('projectEmptyGridLabel', 'Empty grids'),
  continuous: true,
  run(context) {
    const empty = context
      .getAllUuids('grid')
      .filter((uuid) => context.getChildBlocks(uuid).length === 0)

    return {
      id: 'project:empty-grid',
      title: context.$t('projectEmptyGrid', 'Empty grid blocks'),
      category: 'content',
      description: 'Grid blocks should contain at least one block.',
      status: empty.length ? 'violation' : 'pass',
      impact: 'moderate',
      nodes: empty.map((uuid) => ({
        targets: { uuid },
        // Makes the finding ignorable.
        identifier: uuid,
      })),
    }
  },
}))

getAnalyzers: () => [headingStructureAnalyzer(), emptyGridAnalyzer()]
```

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
- `getFieldListItem(uuid)` — the block for a UUID. Its `options` are the saved
  ones, without the edit state's changes: use `getBlockOptions()` for those.
- `getAllUuids(bundle?)` — all block UUIDs, optionally of one bundle
- `getChildBlocks(uuid, fieldName?)` — the blocks directly inside a block or the
  host entity, without grandchildren
- `getBlockOptions(uuid)` — the resolved option values of a block, the same
  values its component receives from `defineBlokkli()`
- `getBlockElement(uuid)` — the rendered root element of a block
- `getBlockUuid(element)` — the UUID of the innermost block rendering an
  element, or undefined if it belongs to the host entity
- `isSkipped(element)` — whether the element is inside a `bk-skip-analyze`
  element
- `querySelectorAll(selector)` — like the DOM method on the root element, but
  without skipped elements
- `$t` — the translation function, in the editor's language. Pass the English
  text as the default, and the other languages through the module's
  [`translations`](/editor/translations) option.
- `signal` — an `AbortSignal` that fires when the run is cancelled

A library an analyzer needs (e.g. for language detection) belongs in a dynamic
`import()` in `run()` or `init()`, so that it only loads when the analyzer runs.
In development, list it in `vite.optimizeDeps.include`: Vite otherwise reloads
the editor when it discovers the import.

## Built-in analyzers

blökkli ships a few analyzers you can return from `getAnalyzers`. They are
exported from `#blokkli/analyzer`:

- `headingStructureAnalyzer` — checks the heading hierarchy (exactly one H1, at
  least one H2, no skipped levels)
- `altTextAnalyzer` — checks that images have alt text
- `readabilityAnalyzer` — scores text readability
- `axeAnalyzer` — runs axe-core accessibility rules

### Result and node fields

Descriptions of results and nodes are rendered as HTML. A result can carry a
`link` to documentation, and a node can carry a `link` that helps resolving the
finding directly, e.g. the edit form of a referenced media entity.

### Excluding content

- Add the class `bk-skip-analyze` to any element to exclude it and its children
  from text and heading analysis.
- Add the class `bk-skip-heading-structure` to the provider root element to
  disable the heading structure analyzer for the whole page.
