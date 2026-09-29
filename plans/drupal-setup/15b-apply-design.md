# 15b: Apply the design

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 15a

## Goal

The real pages in the design of [15a](15a-design-system.md): the paragraph and
host components, and the site shell (header, notice, footer) from the `site` and
`footer` config pages. Nuxt only, as in 15a.

## Tasks

- [x] The content column: blocks aligned to the left of the 12-column grid.
- [x] The sidebar layout of the detail mockup for hosts with a sidebar.
- [x] The hosts' header on the band, with an eyebrow and meta.
- [x] Page, news, event and office in the new layout; the event's and the
      office's facts in the sidebar.
- [x] The blocks restyled after the mockups.
- [x] The site shell: `PageHeader` and `PageFooter` around every route, with the
      config pages' content.
- [x] Field list types for the sidebar, the footer and the notice.
- [x] The broken `text-smallall` class from 15a fixed.

## Acceptance criteria

- The real pages look like the mockups, at 390, 768, 1024 and 1440 px, without
  horizontal scrolling.
- The columns line up with the header's logo, on the site and in the editor.
- Editing works: the blocks, the sidebar, the header option, the config pages.

## Decisions (the user, 2026-09-27)

1. Nuxt only: no Drupal config, content types or paragraph types.
2. **Editorial pages are their own content type** (15d), not a variant of
   `page`. The canvas's editorial mockup is for that type; `page` follows the
   detail mockup.
3. All of the canvas's mockups align content to the left of the 12-column grid,
   so the real pages do too.

## As built

### Layout (`playground-drupal/app/assets/css/main.css`)

- **`container-content` is the content column:**
  - The wide container's left 8 of 12 columns from lg: about 790 px at 1440,
    about 80 characters a line. Below lg it takes the full width.
  - The right padding is a gutter plus a third of the inner width plus a gap, so
    it stays on the grid at every width.
  - The width option: `content` is this column, `wide` the wide container,
    `full` the page.
- **`Host/Layout`:** a host's header, blocks and sidebar.
  - **The sidebar layout** (from lg) is on while the sidebar contains
    `.has-aside`:
    - the header in columns 1–8
    - the sidebar as a white panel cutting into the header's band in columns
      9–12
    - the blocks below the header
  - **The grid:** the 12 columns plus a track on each side, so that a title on
    an image spans the page without `100vw`. `100vw` would break in the editor,
    whose canvas is narrower than the window.
  - **The containers** inside the sidebar layout reset to the column: a rule
    nested in both container utilities, in the utilities layer.
  - **Below lg**, the event's and the office's facts come right after the header
    (`aside-first`); the page's sidebar comes after its blocks.
  - **While editing,** an empty `field_aside` is a drop zone below the blocks.
    The field's `non-empty-class` switches the layout.
- **`Host/Header`:**
  - The band, with an eyebrow (a red label), h1, lead and meta.
  - `image` puts the hero image in the band below the lead. The option is
    labelled "Image below the title".
  - `overlay` puts the title on the image, which is as wide as the page. With a
    sidebar, the sidebar then starts below it.

### Hosts (`components/Node/*`)

| Host   | Eyebrow  | Meta                               | Sidebar                                            |
| ------ | -------- | ---------------------------------- | -------------------------------------------------- |
| Page   | –        | "Updated on …" (`changedRawField`) | `field_aside`                                      |
| News   | "News"   | the date                           | –                                                  |
| Event  | category | –                                  | date, place, organiser, price, the register button |
| Office | "Office" | –                                  | the contact details and opening hours              |

The page's eyebrow waits for the menus (15c).

### Blocks

- **Field list types** (`nuxt.config.ts`): `sidebar`, `footer` and `notice`
  replace `secondary`. Only blocks in `default` fields get a container.
  - **Sidebar:** contact and downloads get a label heading with an ink rule;
    buttons take the panel's width.
  - **Footer:** the contact is a column with its name as the heading; buttons
    are `is-on-dark`.
- **`on-dark`** flips `ink`, `muted` and `line` for everything inside. That's
  how `OfficeDetails`, rich text and teasers work on the ink footer without
  props. Rich-text links there are white.
- **Teasers:**
  - A card is the mockup's news card: 3:2 image, meta, serif title, lead.
  - A list row has a date badge for an event (`badgeDay`/`badgeMonth` in
    `fragment.dateRange.graphql`, month names translated by Drupal) and the
    image for the others.
  - Latest news as cards uses `container-wide`; upcoming events is a list under
    an ink rule.
- **Contact:**
  - main column: a bordered white box
  - sidebar: the mockup's contact, without a box
  - footer: a column
- **Downloads** use `LinkList`.
- **Accordion:** the FAQ list: `plus`/`minus`, an ink rule above the first item
  of a run. The rules live in `main.css`, since the run's override must beat
  them in the same layer.
- **Section:**
  - `py-section` only with a background
  - `gap-grid` columns
  - one column in `container-content`, more in `container-wide`
- **Video:** a play button over the thumbnail. **Gallery:** the slider's buttons
  are square, with `arrow-left`/`arrow-right`.
- **New symbols:** `play` and `arrow-left`.

### Site shell

- **`PageHeader`:**
  - slots `name`, `logo` (the `Logo` by default) and `search`
  - Navigation, service links, search and the menu button only render when they
    have content.
  - No link while editing.
- **`ConfigPage/Site`** (the header):
  - the droppable coat of arms, falling back to the `Logo` (since 2026-09-29
    always the `Logo`, with editable service links: see 15c)
  - the editable site name
  - the language switch as a prop (hidden while editing and previewing)
  - **The notice:** a `warning-light` band with the warning icon.
- **`ConfigPage/Footer`:** `PageFooter` with the footer's blocks as columns, and
  the site name from `siteConfig`.
- **`[...slug].vue`:** the shell around every route, with
  `<main id="main" class="overflow-x-clip">`. On a config page's own route, that
  config page is the one rendered (and edited).
- **UI strings** (EN, DE, FR in `drupal/content/texts.csv`):
  - new: `contact.label`, `downloads.label`, `event.details`, `news.label`,
    `office.label`, `page.updated`
  - `event.registration` is gone

## Verification (2026-09-27)

- **Gates:** `bun run verify` passes in the container (all 8 gates).
- **Contrast:** the new pairs pass AA; the lowest is the warning icon on
  `warning-light` (5.28:1).
- **Browser, logged in:**
  - **Pages:**
    - pages 1, 5 and 12
    - news 3 and 6
    - events 4 and 9
    - office 2
    - both config pages' routes
    - the design system's mockups
  - **Widths:** 390, 768, 1024 and 1440 px.
  - **Languages:** EN, DE and FR. The eyebrows, the meta and the sidebar
    headings are translated.
  - **Checks:**
    - no horizontal overflow
    - no console errors
  - **At 1440, 1024 and in the editor's 1280 px canvas,** the h1, the blocks and
    the logo share their left edge, and the sidebar ends at the container's
    right edge.
- **The editor:**
  - Page 5 loads with the sidebar layout.
  - On page 1, the empty aside is a drop zone below the blocks. Moving the
    downloads block into it switches to the sidebar layout; undoing switches
    back. The change was then discarded.
  - The site config page has the editable name and the droppable coat of arms,
    and the logo isn't a link while editing.

## Left for later

- **15c:**
  - the main navigation and the search
  - the breadcrumb
  - the page's eyebrow from the menu
  - a front page for the logo's link (`/<lang>`, today Drupal's `/node`)
- **15d:** the editorial content type, with the canvas's editorial mockup.
- **14b:**
  - the coat-of-arms media is still a placeholder
  - the home page's content
  - The mockups' parts that aren't paragraph types (callouts, steps, quick
    links, the "Heute" row) need a decision on new paragraph types. Done: the
    home page's in 15f, the detail page's in 15g.
