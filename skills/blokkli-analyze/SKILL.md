---
name: blokkli-analyze
description: >-
  Work with blökkli analyzers: content checks for accessibility, SEO,
  readability and project-specific rules, shown in the editor's Analyze sidebar.
  Use when the user asks to create an analyzer or content check ("create an
  analyzer for …", "warn editors when …", "check that every … has …"), add or
  configure the built-in analyzers (heading structure, alt text, readability,
  axe-core), make findings ignorable, or exclude content from analysis.
license: MIT
compatibility: >-
  Requires @blokkli/editor 2.x and a project-level edit adapter
  (blokkli.editAdapter.ts).
metadata:
  author: blokkli
  version: '1.0.2'
  targets: '@blokkli/editor 2.x'
  docs: https://docs.blokk.li
---

# Analyze

## Purpose

Analyzers check the content of the page being edited and report findings in the
**Analyze** sidebar of the editor. Typical checks are accessibility (missing alt
texts, axe-core rules), SEO (heading structure), readability, or any
project-specific content rule ("don't use empty grid blocks").

Each finding is highlighted on the page, so editors can jump to the paragraph or
element that caused it. A finding has a status (`pass`, `violation`,
`incomplete`, `inapplicable`), a category (`accessibility`, `seo`, `text`,
`content`) and an optional impact (`minor` to `critical`). Editors can
**ignore** individual findings they consider acceptable; ignored findings are
stored per edit state.

There are two kinds of analyzers:

- **Continuous**: run automatically whenever the content changes. Must be cheap
  and non-blocking.
- **Manual**: only run when the editor clicks "Analyze Page" in the sidebar.
  Used for expensive checks like axe-core.

## Where analyzers come from

The Analyze feature is part of the core editor and always available. It shows
whatever analyzers the edit adapter returns from `getAnalyzers`. On top of that,
blökkli always registers a built-in **Validations** analyzer that lists
backend-reported validation errors. Nothing to configure for that one.

So using analyzers in a project means:

1. Enable the `readability` module, if readability analysis is wanted.
2. Install `axe-core`, if the axe analyzer is wanted.
3. Return the analyzers from `getAnalyzers` in the edit adapter.

### 1. Readability module (optional)

The readability analyzer needs a scoring engine. The `readability` module
provides the built-in one (Flesch/CEFR for `en`, WSTF for `de`, LIX for `fr`,
Gulpease for `it`):

```typescript
import drupal from '@blokkli/editor/drupal'
import readability from '@blokkli/editor/readability'

export default defineNuxtConfig({
  blokkli: {
    modules: [drupal(), readability()],
  },
})
```

The engine also powers the inline readability indicators on text fields, not
just the sidebar. English scoring needs the `syllable` package; it's an optional
peer dependency, so install it if the site has English content.

If the project needs its own scoring (e.g. a backend service), don't enable the
module. Implement `getReadabilityAnalyzer` in the adapter instead; see
https://docs.blokk.li/modules/readability/custom-analyzer. Do **not** write a
custom `Analyzer` for readability: it would miss the inline indicators and the
agent integration.

### 2. axe-core (optional)

`axe-core` is an optional peer dependency. Install it in the project if the axe
analyzer is used:

```bash
npm install axe-core
```

## Using the built-in analyzers

All built-in analyzers are exported from `#blokkli/analyzer`. Each one is a
factory function; call it to get the analyzer.

| Analyzer                     | Checks                                                    | Type       |
| ---------------------------- | --------------------------------------------------------- | ---------- |
| `headingStructureAnalyzer()` | Exactly one H1, at least one H2, no skipped levels        | Continuous |
| `altTextAnalyzer()`          | Images without alt text                                   | Continuous |
| `readabilityAnalyzer()`      | Hard-to-read text (needs a readability engine, see above) | Continuous |
| `axeAnalyzer(options?)`      | axe-core accessibility rules on the raw page              | Manual     |

With the Drupal adapter, extend the adapter it returns:

```typescript
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import drupalAdapter from '#blokkli/drupal/adapter'
import {
  altTextAnalyzer,
  axeAnalyzer,
  headingStructureAnalyzer,
  readabilityAnalyzer,
} from '#blokkli/analyzer'

export default defineBlokkliEditAdapter(async (ctx) => {
  const adapter = await drupalAdapter(ctx)

  adapter.getAnalyzers = () => [
    headingStructureAnalyzer(),
    altTextAnalyzer(),
    readabilityAnalyzer(),
    axeAnalyzer({
      // Selectors to exclude, in addition to the editor UI.
      exclude: ['.cookie-banner'],
      // Passed to axe.run().
      runOptions: {
        rules: {
          region: { enabled: false },
        },
      },
    }),
  ]

  return adapter
})
```

Only add the analyzers the developer actually wants. Ask if unclear; e.g. the
heading structure analyzer makes no sense if the page layout renders the H1
outside of blökkli.

### Ignoring findings

Findings that carry an identifier can be ignored by the editor. The Drupal
adapter supports this out of the box (`ignoreAnalyzeIdentifiers` /
`unignoreAnalyzeIdentifiers`, stored on the edit state). A custom adapter must
implement both methods, and return the stored identifiers as
`ignoredAnalyzeIdentifiers` in the mapped state so ignored findings stay hidden.

### Excluding content

- Add the class `bk-skip-analyze` to an element to exclude it and its children
  from text and heading analysis (e.g. a teaser that repeats another page's
  heading).
- Add the class `bk-skip-heading-structure` to the provider root element to
  disable the heading structure analyzer for the whole page.

## Creating a custom analyzer

Use `defineAnalyzer` for project-specific rules. Workflow:

1. Decide what counts as a finding, and whether the check is cheap enough to run
   on every change (continuous) or should only run on demand (manual).
2. Put the analyzer in its own file next to the edit adapter, e.g.
   `app/blokkli/analyzers/emptyGrid.ts`, unless the project already has a
   convention for this.
3. Register it in `getAnalyzers` of the edit adapter (see above), next to any
   analyzers that are already returned there. Don't drop existing ones.

`run` receives an `AnalyzerContext` and returns one or more results (or `null`
for nothing to report):

```typescript
import { defineAnalyzer } from '#blokkli/analyzer'

export const emptyGridAnalyzer = defineAnalyzer(() => {
  return {
    id: 'project:empty-grid',
    label: 'Empty grids',
    continuous: true,
    run(context) {
      const empty = context
        .getAllUuids('grid')
        .filter((uuid) => context.getChildBlocks(uuid).length === 0)

      return {
        id: 'project:empty-grid',
        title: 'Empty grid blocks',
        category: 'content',
        description: 'Grid blocks should contain at least one block.',
        status: empty.length ? 'violation' : 'pass',
        impact: 'moderate',
        nodes: empty.map((uuid) => ({
          targets: { uuid },
          // Makes the finding ignorable. Must be stable for the same content.
          identifier: uuid,
        })),
      }
    },
  }
})
```

Then add `emptyGridAnalyzer()` to `getAnalyzers`. The same analyzer can also be
shipped from an adapter extension (`defineBlokkliAdapterExtension`), since
`getAnalyzers` results from the adapter and all extensions are merged.

Key points:

- **Targets** can be a CSS selector, an `HTMLElement`, or `{ uuid }` for a whole
  paragraph. They're used to highlight the finding on the page.
- **Prefer the context helpers** over raw DOM queries:
  `context.querySelectorAll()` already filters out `bk-skip-analyze` elements;
  `getTextElements()`, `getTextFieldValues()`, `getChildBlocks()`,
  `getBlockOptions()`, `getBlockElement()` and `getBlockUuid()` give access to
  content and the paragraph tree. `context.$t` translates, `context.langcode` is
  the content language.
- **`identifier`** on a node makes it ignorable. Derive it from the content
  (e.g. `hashString(text)` from `#blokkli/analyzer/helpers/hashString`) so the
  finding reappears when the content changes.
- **Continuous analyzers** run on every change: keep them fast. Pass
  `context.signal` to `fetch()` calls so outdated runs get cancelled. Anything
  slow or network-heavy should be manual (`continuous: false`).
- **`requireRawPage: true`** runs the analyzer on the page without editor UI,
  like the axe analyzer does.
- **`init(context)`** runs once before the first run, e.g. to lazily import a
  library.
- **Options**: `defineAnalyzer<{ minWords?: number }>((options) => ...)` makes
  the factory accept options, like `axeAnalyzer({ exclude })`.
- **Strings**: `label: (_langcode, $t) => $t('projectKey', 'English text')`, and
  `context.$t(...)` in `run`. The English text is the default in the code; the
  other languages go into the module's `translations` option
  (`blokkli.translations.de.projectKey`). The editor's language is
  `context.interfaceLangcode`, the page's `context.langcode`. Prefix the keys
  with the project, so that they never collide with blökkli's.
- **Current option values**: `getBlockOptions(uuid)`. The `options` of
  `getFieldListItem(uuid)` are the saved ones, without the edit state's changes.
- **Hidden paragraphs**: while editing, paragraphs hidden in the page's language
  ("Visible languages", `bkVisibleLanguages`) are rendered too. A check of what
  readers see skips them, and what's inside them.
- **Libraries** (e.g. language detection): a dynamic `import()` in `run` or
  `init`, so that they only load in the editor. In development, list them in
  `vite.optimizeDeps.include`, or Vite reloads the editor on the first run.

## Check it

1. Open the editor, open the Analyze sidebar: the analyzer is listed under its
   label, in the editor's language.
2. Plant a finding: it's listed, highlighted on the page, and "Ignore" moves it
   to the ignored ones (with an `identifier`). Fix it: it goes away.
3. **Run it on the site's content, in every language,** before shipping. A check
   that reports what isn't wrong is soon ignored: collect the findings of every
   page and read them. Tune the rule until nothing false is left, even if some
   true findings go with it.
