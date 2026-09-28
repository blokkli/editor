# 13i: Agent and modules

- **Status:** in progress (the table of contents is done)
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
- [ ] **`colorOptions`** in `playground-drupal/nuxt.config.ts`, for the chart
      colours (moved from 13b: only the charts module uses them).
- [ ] **Charts:** a `chart` block (the town in numbers: population, budget,
      recycling rate; election results), and the chart data source methods in
      `app/blokkli.editAdapter.ts` (`getChartDataSources`,
      `getChartDataSourceCapabilities`, `getChartDataSourceData`), moved from
      chunk 06.
- [ ] **Iframes:** an `embed` block with heights per viewport. No maps (14a);
      use it for the playable video embed (moved from chunk 06), or decide
      whether the `video` block uses `BlokkliIframe` directly.
- [x] **Table of contents:** a fragment for long service pages.
- [ ] **Analyzers:** a custom analyzer next to the built-in ones (see
      winterthur's `frontend/app/blokkli/analyzer/`), e.g. "every service page
      has a contact block". The planted mistakes on the landing page (14b) are
      for the built-in ones.
- [ ] Skills:
  - [ ] review `blokkli-analyze`
  - [ ] new `blokkli-setup-agent`
  - [ ] new `blokkli-setup-charts`
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
