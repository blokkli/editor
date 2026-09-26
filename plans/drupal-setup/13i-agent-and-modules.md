# 13i: Agent and modules

- **Status:** todo
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
- [ ] **Charts:** a `chart` block (the town in numbers: population, budget,
      recycling rate; election results), and the chart data source methods in
      `app/blokkli.editAdapter.ts` (`getChartDataSources`,
      `getChartDataSourceCapabilities`, `getChartDataSourceData`), moved from
      chunk 06.
- [ ] **Iframes:** an `embed` block with heights per viewport. No maps (14a);
      use it for the playable video embed (moved from chunk 06), or decide
      whether the `video` block uses `BlokkliIframe` directly.
- [ ] **Table of contents:** a fragment for long service pages.
- [ ] **Analyzers:** a custom analyzer next to the built-in ones (see
      winterthur's `frontend/app/blokkli/analyzer/`), e.g. "every service page
      has a contact block". The planted mistakes on the landing page (14b) are
      for the built-in ones.
- [ ] Skills:
  - [ ] review `blokkli-analyze`
  - [ ] new `blokkli-setup-agent`
  - [ ] new `blokkli-setup-charts`
  - [ ] iframes and the table of contents: a skill each, unless the docs
        (`docs/modules/`) already cover the setup. Decide here.

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
