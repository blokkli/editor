# 13i: Agent and modules

- **Status:** in progress (the table of contents and the charts are done)
- **Milestone:** M1 Local dev site
- **Depends on:** 13b
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The blökkli modules that `playground-drupal` loads (chunk 06) all have something
to work on in the demo (14a): the agent, charts, iframes, the table of contents
and the analyzers.

## Tasks

- [ ] **Agent:** `paragraphs_blokkli_agent` (the `auth_secret` from the
      environment is wired in chunk 03). Example skills, tools and prompts under
      `playground-drupal/blokkli/` (see winterthur's `frontend/blokkli/`),
      fitting a town's website.
- [x] **`colorOptions`** in `playground-drupal/nuxt.config.ts`, for the chart
      colours (moved from 13b: only the charts module uses them).
- [x] **Charts:** a `chart` block (the town in numbers: population, budget,
      recycling rate; election results), and the chart data source methods in
      `app/blokkli.editAdapter.ts` (`getChartDataSources`,
      `getChartDataSourceCapabilities`, `getChartDataSourceData`), moved from
      chunk 06.
- [ ] **Iframes:** an `embed` block with heights per viewport. No maps (14a);
      use it for the playable video embed (moved from chunk 06), or decide
      whether the `video` block uses `BlokkliIframe` directly.
- [x] **Table of contents:** a fragment for long service pages.
- [x] **Analyzers:** a custom analyzer next to the built-in ones (see
      winterthur's `frontend/app/blokkli/analyzer/`), e.g. "every service page
      has a contact block". The planted mistakes on the landing page (14b) are
      for the built-in ones.
- [ ] Skills:
  - [x] review `blokkli-analyze`
  - [ ] new `blokkli-setup-agent`
  - [x] new `blokkli-setup-charts`
  - [ ] iframes: a skill, unless the docs (`docs/modules/`) already cover the
        setup. Decide here.
  - [x] the table of contents: no skill. The docs cover the module
        (`docs/modules/table-of-contents`, with the new `list` prop); the rest
        is the host template (`blokkli-add-host`). Revisit with the module's
        TODO.

## Acceptance criteria

- The agent can edit a page, with the mock provider and with a real key.
- A chart block renders data from a data source.
- An embed's height can be set per viewport.
- The table of contents lists the page's headings.
- The custom analyzer reports what it should.
- The skills exist.

## Notes

- **The agent's API key** is optional: the mock provider works without it (chunk
  06).

From [13d](13d-reusable-content.md) (2026-09-27):

- **The table of contents** joins `allowed-fragments` on the four node bundles'
  main field (`Node/*/index.vue`).
- **The agent adding columns** gets the default template's texts plus its own
  children (F20).

## The table of contents (2026-09-27)

Decisions:

- **Only in the detail page's sidebar, rendered by the template** (the user,
  after a first version as a fragment that editors placed in the main field).
  Only `page` has a sidebar. Below lg it comes after the header, the rest of the
  sidebar after the blocks, as in the detail mockup.
- **The saved headings** (the user): `<BlokkliTableOfContents>` only sees the
  field it's placed in, and the sidebar is another field. The page passes its
  saved `paragraphs` through the new `list` prop, so while editing the sidebar
  shows the saved headings until the page is published. The proper fix, a TODO
  in the component: resolve a root field of the provider by name, the way
  `<BlokkliField>` does, edit state included.
- **Links to title paragraphs and section headings,** nested ones included,
  shown from two headings. Proposed by Claude.
- **The ids are slugs of the heading** (`app/helpers/anchor.ts`: "Gebühren" →
  `gebuhren`): readable in a shared link. Two equal headings share an id, and
  both links go to the first. Proposed by Claude.

As built:

- **blökkli:**
  - `BlokkliTableOfContents` has an optional `list` prop, with the TODO.
  - `queryBlocks()` takes a ref or getter as the list, so that a new `list`
    (e.g. after publishing) updates the links.
  - Docs: the module's page ("Outside the field") and `queryBlocks()`.
- **playground-drupal:**
  - `components/TableOfContents/index.vue`: the mockup's "Auf dieser Seite" nav
    (a label heading over an ink rule, then the links).
  - `Host/Layout`: a `toc` slot, the sidebar's first part.
  - `main.css`:
    - the panel is a flex column with `gap-10`
    - below lg, the sidebar is `display: contents`: the table of contents after
      the header, the rest after the blocks (`order`)
    - parts of the sidebar with nothing visible are hidden, so they leave no gap
  - `Node/Page` passes `paragraphs`.
  - `Paragraph/Title` and `Paragraph/Section`: `:id="anchorId(title)"`.
  - The text `table_of_contents.label` (EN/DE/FR).
- F34: a hidden nested heading still gets a link, and so does a top-level one
  with a passed list.

Verification:

- Page 13 ("F12 (throwaway)") now has three titles, a section with a heading and
  a nested title, and a text in the sidebar, all published.
  - The sidebar lists all five headings in the page's order.
  - At 1440 px: the white panel, with the text below the table of contents.
  - At 390 px: the table of contents after the header, and the text after the
    blocks.
  - No horizontal overflow, and a link scrolls to its heading.
- While editing page 13, the sidebar shows the saved headings, not the new ones.
- Pages 5 and 14 (EN, DE), with one heading or none: no table of contents, and
  the rest of the sidebar is where it was (at lg in the panel, below lg after
  the blocks).
- Not checked: the server render. Locally, anonymous visitors get a 403, and
  granting `access content` wasn't enough.

## Charts (2026-09-28)

Decisions:

- **A paragraph type without fields** (the user): the chart, including its title
  and translations, is the charts module's block option. A first idea, the title
  as a Drupal field, would have competed with the chart editor's own title.
- **Styled like the site, not like winterthur** (the user). Proposed by Claude,
  in `components/Chart/transform.ts`:
  - The fonts and colours come from the design tokens, read from CSS.
  - The title is the figure's caption (`text-h3`); the chart draws none.
  - Axes and labels: the category axis is the ink baseline, the value axis
    carries thin `line` gridlines, no ticks, labels 14 px in `muted`.
  - Legend: top left, square swatches (a line for line charts), none for a
    single series.
  - Tooltip: white, a `line` border, square corners.
  - Bars and lines: square bars at most 40 px wide, a white gap between stacked
    segments; lines 2.5 px with ringed points.
  - Pies: white gaps between slices, the legend below. When narrow (below 520
    px, measured by the component): a smaller pie, the legend as a list, labels
    at the edges.
  - Line charts fit their value axis to the data unless the editor set a
    minimum; bars and areas start at zero.
  - Horizontal bars read from the top; with value labels on, the value axis
    goes.
  - SVG instead of canvas: the web font, sharp print.
  - A description for screen readers from the resolved data, in the page's
    language: ECharts' own is English and garbles stacks.
- **The colours** (`colorOptions`, from `shared/chartColors.ts`, also shown in
  the design system's Colours section): a family per colour of the design system
  (lake, ochre, forest, plum, red, stone), each a ramp in OKLCH with the token
  as its 600. The palette alternates lightness for red-green colour blindness;
  every main shade has at least 3.8:1 on white; red comes fifth.
- **Where:** wherever tables are allowed. The global width option (content or
  wide; "full" is treated as wide).
- **Data sources in this slice** (the user): three sources of the town,
  fictional numbers in EN/DE/FR, from a Nuxt server route
  (`server/api/chart-data`). A real site would read them from its statistics.
  The budget has six slices: the palette has six colours, and data sources'
  colour overrides only work in one language (F35).

As built:

- **Drupal:** the paragraph type `chart` (no fields, library conversion, not
  translatable, labels "Diagramm" / "Graphique"), allowed in the nine fields
  that allow `table`, and the bundle on the GraphQL server. Script:
  `tmp/13i-chart-config.php` (not committed).
- **Nuxt:**
  - `components/Paragraph/Chart`: the block (chunk `chart`), the data of a bound
    source (`useLazyAsyncData`, browser only, keyed by source and language), a
    placeholder while editing.
  - `components/Chart`: the figure, the SVG renderer, the width measurement, and
    `transform.ts`.
  - `server/chartData.ts` and `server/api/chart-data`: the sources.
  - `app/blokkli.editAdapter.ts`: the three data source methods.
  - `main.css`: the footnotes and the category filter.
  - `shared/chartColors.ts`: the colours, imported by `nuxt.config.ts` and the
    design system page.
  - The design system page: the colour ramps in "Colours", and a "Charts"
    section with four sample charts.
  - The text `chart.empty` (EN/DE/FR).
- **blökkli's charts module:**
  - `containLabel` (deprecated in ECharts 6, which only warns without a legacy
    module) replaced by `outerBoundsMode: 'same'` and
    `outerBoundsContain: 'axisLabel'`, its documented equivalent, in the five
    cartesian types.
  - The classes of the footnotes and the category filter are now `bk-chart-*`:
    the build mangled `blokkli-chart-*`, so integrators couldn't style them.
    Documented in the setup docs.
  - The chart editor opened a chart bound to a data source without inline data
    as a new default chart, dropping the binding (e.g. charts from the agent).
  - The docs' `v-bind="chartData!"` examples: `ChartRenderer` takes `:data`.
  - The data source docs: overrides and localized names (F35).
- **Skill:** `blokkli-setup-charts` (1.0.0), listed in `blokkli-setup-drupal`
  (1.0.6). F28 now also lists the colours' labels.

Verification:

- Page 13 ("F12 (throwaway)"), published: a stacked bar chart and a donut bound
  to data sources, a line chart with inline data, translations and a footnote
  marker in its title.
- Page 14 (EN/DE/FR, reverted): the same charts in German and French: the
  captions, the sources' data, the inline translations and the footnotes; the
  screen reader descriptions in each language.
- At 1440 and 390 px: no horizontal overflow, nothing clipped, no console
  errors; the narrow donut with its total.
- The editor: the chart type in the sidebar with its icon, selecting a chart,
  the chart editor with the bound source, its series in the palette's colours,
  and a preview in the site's style. The adapter lists the three sources and
  returns localized data.
- The design system page's charts section at 1440 px.
- `verify`: all 10 gates. Not run: the E2E suite (the mock playground wasn't
  running), including `test/e2e/features/charts/colors.test.ts`, which covers
  the chart editor's loading that changed.
- Not tested: adding a chart through the editor's sidebar (drag and drop);
  `addBehaviour` opening the chart editor is the module's.

## The custom analyzer (2026-09-28)

Decisions:

- **Text in a language other than the page's** (the user, from four proposals by
  Claude; the others: teasers to past events, checks of charts, a contact on
  service pages). A translation starts as a copy of the source's paragraphs, and
  a teaser shows an untranslated page in its source language: text nobody
  translated is the most common mistake of a trilingual site, and none of the
  built-in analyzers checks it.
- **The rendered text** (`getTextElements()`), not the stored field values: it
  includes teasers and the host's header, and a finding highlights one paragraph
  of text. Proposed by Claude.
- **Skipped:** text marked with another language (`lang`, WCAG 3.1.2),
  paragraphs hidden in the page's language and what's inside them, and texts of
  fewer than four words (numbers and dates don't count).
- **eld (Efficient Language Detector),** its smallest database (about 1 MB,
  loaded on the first run), only its reliable results. Proposed by Claude, after
  franc-min: that one took short English texts for French ("When do you need a
  permit?"), and a minimum of eight words, which removed that, lost the real
  findings. Over the rendered texts of all 33 page translations, eld reports
  only English left in German and French translations.
- **Ignorable,** e.g. for a quote: the identifier is a hash of the text. A
  finding names the detected language.

As built:

- `playground-drupal/app/blokkli/analyzers/wrongLanguage.ts`, registered in
  `app/blokkli.editAdapter.ts`. Its German and French strings in the module's
  `translations` (`nuxt.config.ts`), the English ones in the code.
- `eld` as a dev dependency, pre-bundled (`vite.optimizeDeps.include`): Vite
  would otherwise reload the editor on the analyzer's first run.
- **blökkli:**
  - `getRuntimeOptionValue()`: for checkboxes, an empty string is no value (so
    the default), not `['']`. An empty "Visible languages" made a paragraph
    hidden in every language for `getBlockOptions()`. With a test.
  - `AnalyzerContext.getFieldListItem()`: the doc says that its options are the
    saved ones.
  - `docs/adapter/getAnalyzers.md`: an example that works (the old one used
    fields `Analyzer` doesn't have), the strings, and libraries.
  - Found, not fixed: the `translations` option ignores English (F36).
- **Skill:** `blokkli-analyze` reviewed (1.0.2): strings, current option values,
  hidden paragraphs, libraries, and a "Check it" section.

Verification:

- Page 14 in French (edit state, reverted): a German paragraph planted in a text
  is found ("En allemand"); the French one and a quote marked `lang="de"`
  aren't. Hidden in French ("Visible languages": DE), it's skipped; visible
  again, it's found. "Ignore" and "Restore".
- Real leftovers: the office in French (2 English texts), the 13d page in German
  (5). Page 13 in English, with charts and the table of contents: passes.
- The strings in EN, DE and FR; no console errors.
