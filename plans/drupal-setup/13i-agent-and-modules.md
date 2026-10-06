# 13i: Agent and modules

- **Status:** done (2026-10-06; the agent was postponed on 2026-09-28, the user)
- **Milestone:** M1 Local dev site
- **Depends on:** 13b
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The blökkli modules that `sandbox/frontend` loads (chunk 06) all have something
to work on in the demo (14a): the agent, charts, iframes, the table of contents
and the analyzers.

## Tasks

- [x] **Agent:** `paragraphs_blokkli_agent` (the `auth_secret` from the
      environment is wired in chunk 03). Example skills, tools and prompts under
      `sandbox/frontend/blokkli/` (see winterthur's `frontend/blokkli/`),
      fitting a town's website.
- [x] **`colorOptions`** in `sandbox/frontend/nuxt.config.ts`, for the chart
      colours (moved from 13b: only the charts module uses them).
- [x] **Charts:** a `chart` block (the town in numbers: population, budget,
      recycling rate; election results), and the chart data source methods in
      `app/blokkli.editAdapter.ts` (`getChartDataSources`,
      `getChartDataSourceCapabilities`, `getChartDataSourceData`), moved from
      chunk 06.
- [x] **Iframes:** an `embed` block with heights per viewport. No maps (14a);
      use it for the playable video embed (moved from chunk 06), or decide
      whether the `video` block uses `BlokkliIframe` directly. Decided: the fee
      calculator, a page of the Nuxt app; the video stays a link.
- [x] **Table of contents:** a fragment for long service pages.
- [x] **Analyzers:** a custom analyzer next to the built-in ones (see
      winterthur's `frontend/app/blokkli/analyzer/`), e.g. "every service page
      has a contact block". The planted mistakes on the landing page (14b) are
      for the built-in ones.
- [x] Skills:
  - [x] review `blokkli-analyze`
  - [x] new `blokkli-setup-agent`
  - [x] new `blokkli-setup-charts`
  - [x] iframes: a skill, unless the docs (`docs/modules/`) already cover the
        setup. Decided: no skill. The docs cover the module; the rest is a
        paragraph type (`blokkli-add-paragraph-type`).
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

- **The agent's API key:** without it, the agent only replays scripts (the mock
  provider, for E2E tests); typing to it needs the key. See "The agent" below.

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
- **sandbox/frontend:**
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

- `sandbox/frontend/app/blokkli/analyzers/wrongLanguage.ts`, registered in
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

## The embed (2026-09-28)

Decisions:

- **A page of the site, not another site** (the user): external pages can't be
  framed, so the Nuxt app hosts what's embedded. The video stays a link to the
  video (chunk 06).
- **The fee calculator** (the user, from four proposals by Claude: a waste
  calendar, the fee calculator, the lake pool's status, a room booking): water,
  sewage and waste fees of a household, with fictional rates. Its layout changes
  with the width (a form beside the fees, or stacked), so the heights per
  viewport matter.
- **A link field** (the user), not a list of the site's widgets:
  - Internal links only: Drupal rejects other sites.
  - Untranslatable, like every link. The embed shows the page in the language of
    the page it's placed on: the component sets the language prefix, the way
    Drupal renders internal links. The prefix also keeps it on the site.
- **A title field,** translatable and required: the frame's name for screen
  readers. Not shown. Proposed by Claude.
- **The calculator is a box as high as the frame,** like the contact box
  (`border-line`, white): its edge lines up with the column, and its padding
  keeps focus outlines inside the frame. Proposed by Claude, after a first
  version with an 8 px inset.

As built:

- **Drupal:** the paragraph type `embed` (translatable, library conversion,
  labels "Einbettung" / "Intégration"), with `field_link` (internal, no link
  text, untranslatable) and `field_title` (translatable), both required, labels
  and descriptions in DE and FR. Allowed wherever charts are, and on the GraphQL
  server. Script: `tmp/13i-embed-config.php` (not committed).
- **Nuxt:**
  - `components/Paragraph/Embed`: `BlokkliIframe` with the option `heights`
    (`iframe_heights`), the global width option (content or wide) and "Visible
    languages".
  - `components/FeeCalculator`: the calculator; `rates.ts` has the rates (2026,
    CHF with VAT) and 50 m³ of water per person and year.
  - `pages/[lang]/embed/fee-calculator.vue`: the calculator alone, `noindex`.
  - The texts `fee_calculator.*` (21, EN/DE/FR).
- **blökkli:**
  - A json option without a stored value got its default as a string (`"{}"`),
    not parsed: `getRuntimeOptionValue()` returned the raw default, and
    `defineBlokkli()`, `defineBlokkliProvider()` and `getRuntimeOptions()` read
    it without the function. Charts had the same bug, hidden because `"{}".type`
    is undefined. Test in `runtimeHelpers.spec.ts`.
  - `BlokkliIframe` without heights (a new block) is 400 px tall, the height
    editor's starting height (`DEFAULT_IFRAME_HEIGHT`), instead of the browser's
    150 px.
  - Docs: the frame's title, the default height, and how to choose heights.
- **Not needed:** stopping pointer events on the frame while editing. The
  editor's overlay catches the clicks, so a click on the frame selects the
  block. The video block's comment said otherwise; corrected.
- F37: the height editor's own strings are English in every language.

Verification:

- The calculator alone at 360 and 790 px, in EN, DE and FR: the layouts, the
  numbers in Swiss format (`CHF 80.00`, `80.00 CHF`), no console errors.
- Page 13 (throwaway), now also in DE and FR (`/de/f12-de`, `/fr/f12-fr`):
  - Added in the editor through the Drupal form (`/embed/fee-calculator`), 400
    px tall until heights are set.
  - The height editor: the presets, a drag of the handle, saved on "Go back".
  - Heights 1420 / 1320 / 800 (up to 375, 768 and wider), measured at the
    narrowest width of each range, in the longest language, with every row
    shown. At 390, 768, 1024 and 1440 px the calculator fits, with no horizontal
    overflow. At 1024 px the column is 598 px wide, so it's stacked.
  - The title translated in the editor's translation mode (the Drupal form in DE
    and FR); each page's frame has its title and its language
    (`/de/embed/fee-calculator`).
- Not checked: the server render (anonymous visitors get a 403 locally).

## The agent (2026-10-06)

Decisions (the user, from Claude's proposals):

- **The demo's own tool: the town's data** (`get_town_data`), so the agent
  writes with the town's numbers instead of inventing them. The other option was
  a tool that finds untranslated texts, reusing the analyzer.
- **Three ready-made prompts:** "Write a service page", "Check the style guide",
  "Link related pages". Not taken: "Translate leftover texts".
- **All four test users** can use the agent. Drupal still checks every change
  against the user's role, which Jonas shows.
- **Sonnet 5.5** is the default model (the current Sonnet, the same price as
  Sonnet 5), Haiku 4.5 the routing model. Proposed by Claude.

As built:

- **Drupal:** `use paragraphs blokkli agent` for `content_editor`, `reviewer`,
  `translator` and `restricted_editor`.
- **`sandbox/frontend/blokkli/`** (in Nuxt's root directory: the agent module
  doesn't look in `app/`):
  - `tools/get_town_data`: a lazy query tool. `fees` comes from the fee
    calculator's `RATES`, with the calculator's path for an embed. `population`,
    `budget` and `languages` come from the charts' data sources
    (`/api/chart-data`), in the page's language.
  - `skills/pages.ts` (`blockingen-pages`): how the town's pages are built:
    - the content types;
    - the service page from its template;
    - title paragraphs as headings;
    - link lists;
    - teasers in "Related topics";
    - facts from `get_town_data` or from the editor, never invented.

    It loads `get_town_data`.

  - `skills/style.ts` (`blockingen-style-guide`): 14b's writing rules in DE, FR
    and EN, taken from the content:
    - amounts ("Fr. 45.–" in DE and FR, "CHF 45" in EN);
    - times ("8.00 Uhr", "8 h 15", "8:00");
    - numbers;
    - quotation marks;
    - paired gender forms.

    Through `streamTemplates`, every rewrite, readability fix, generated text
    and translation gets it, in place of the templates' defaults (it says what
    those said).

  - `prompts/`:
    - `servicePage.ts` (welcome screen);
    - `styleGuide.ts` (welcome screen and a paragraph's menu; the selection or
      the page);
    - `relatedPages.ts` (welcome screen, only on hosts with `field_related`).

    Each prompt is a sentence an editor could type, in their language. The agent
    answers in the language of the first message, so an English instruction
    would get English answers. The instructions are in the skills the prompts
    load.

  - The DE and FR strings in the module's `translations` (`nuxt.config.ts`),
    with formal Sie and vous.
- **`nuxt.config.ts`:** Sonnet 5.5, prices in USD from Anthropic's pricing page,
  and a comment that `enableMock` is local only (12 turns it off).
- **Skill:** `blokkli-setup-agent` (1.0.0), listed in `blokkli-setup-drupal`
  (1.0.8). The agent's permissions are in `blokkli-setup-permissions` (1.0.1).
- **Docs** (`docs/modules/agent/`), which were out of date:
  - **Quick start:** the secret in Drupal's `settings.php`, the permission's
    real title, the SDK, and a step for the web server.
  - **Configuration:** `routing`, `agentName`, `routes` and `enableMock`.
  - **Custom skills:** `load_skills`, `tools` and `streamTemplates`.
  - **`blokkli/`:** in the Nuxt app's root directory.
  - **Architecture:** the tools' current names, the server tools and the skills.
  - **Adapter:** `swapBlocks` and `rearrangeBlocks` depend on their own
    mutations, not the token.
  - **The repo's `agent` skill:** the current options.
- **Found:**
  - F51: two agent tokens of the same second are the same, and the second
    connection is rejected.
  - `drush role:perm:add` takes one role. With several separated by commas, it
    reports success and changes nothing.
  - A session needs at least one tool that isn't lazy (the editor always sends
    some).

Verification:

- **The build:** `.nuxt/blokkli/agent-server.js` imports both skills and the
  tool; `AgentSkillName` lists the skills; no collector warnings.
  `typecheck:sandbox-frontend` covers the tool and the prompts. The skills are
  only in the server's tsconfig, which no script checks for this app.
- **GraphQL, as each of the four users** (dev site and a1): `use_agent` is true,
  and the token mutation returns a token. Anonymous: 403.
- **The WebSocket** (`wss://blokkli.ddev.site/api/blokkli/agent`, a throwaway
  bun script, `tmp/13i-agent-ws.ts`):
  - A made-up token is rejected.
  - With Anna's token, a mock script makes the server ask for `get_town_data`
    (`topic: fees`), then finishes.
  - A real message gets Sonnet 5.5's answer.
- **The bakes:** EN and DE. a1 is recreated with the limits.
- **The user, in the browser:** the agent works. "Verwandte Seiten verlinken"
  (German) worked well.
