# 13d: Reusable content

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 13b, 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can reuse content: library items, fragments and templates, as 14a's
model has them.

## Tasks

- [x] **Library:** `paragraphs_library` and `from_library`, and
      `allow_library_conversion` on the types that may become library items (the
      leaf types; containers stay off, see F12). The library item route exists
      (chunk 06) and now also loads by id. The demo's items (14b writes them):
      emergency numbers, "what goes into which bin", "stay informed".
- [x] **Fragments** (`defineBlokkliFragment`), with `allowed-fragments` on the
      fields that allow them and `editor.previewWidth`:
  - [x] "upcoming events": the next events, from the structured data (13c)
  - [x] "latest news"
  - [ ] the table of contents fragment comes with 13i
- [x] **Templates:**
  - [x] the `blokkli_paragraph_template` entity in the GraphQL server (since
        chunk 03), and its permissions (13h)
  - [x] the template search provider ("Entity Query Templates")
  - [x] a service page template: steps as an accordion, a fees table, downloads,
        a contact block (content: 14b; checked with a throwaway one)
  - [x] a default template for new columns (content: 05/14b; checked)
  - [x] the edit route exists (chunk 06)
- [x] Skills:
  - [x] review `blokkli-setup-templates` (1.1.0)
  - [x] new `blokkli-setup-library`
  - [x] new `blokkli-setup-fragments`: including fragments that query data (the
        events list)

## Acceptance criteria

- A block can be turned into a library item, reused and detached.
- The fragments can be added where they're allowed, and show current data.
- A template can be created, edited on its route, and inserted. New columns get
  their default template.
- The skills exist.

## Notes

- **Fragment components** go in `Paragraph/BlokkliFragment/<Name>/index.vue`
  (chunk 06).
- **The template module** needs "Entity Query Templates" enabled as a search
  provider (chunk 03).

From [13b](13b-block-types.md) (2026-09-26):

- **Containers can't become library items yet.** Gallery, section, accordion and
  columns have no `allow_library_conversion`, because "make reusable" may lose a
  container's unpublished children (F12). The library items here are likely
  sections: reproduce F12 first, then enable it (and add the containers to
  `Paragraph/FromLibrary/fragment.graphql`).
- **Fragments are only allowed on the page's `field_paragraphs`.** Add
  `blokkli_fragment` to nested fields if a fragment should go into a section.
  Since 13c, all four node bundles' `field_paragraphs` allow them, and 13d
  allows the fragments on all four in the frontend.

From [13c](13c-hosts.md) (2026-09-26):

- **Check the library item links.** Drupal builds a library item's canonical URL
  with its id (`/blokkli/library-item/{id}`), but
  `pages/[lang]/blokkli/library-item/[uuid].vue` loads it by uuid. Links that
  Drupal builds (open editing, the language switch) may then 404. Config pages
  avoid this by resolving their path with the route query.
- **Teaser and contact** can become library items (`allow_library_conversion`).
- **Fragments** for "upcoming events" and "latest news" can read `NodeEvent`'s
  `date` (`startDate(format: "c")`) and `NodeNews.created`, as the teaser does.

### The model as built (2026-09-27)

Built by a throwaway script (`tmp/drupal-reusable.php`, as in 13b and 13c), then
`drush cex`. Everything else existed since chunk 03.

**Drupal:**

- **Search providers:** `library_items` (`entity_query_library_items`) for the
  "From library" dialog, `templates` (`entity_query_templates`) for the
  "Template" dialog. Without them both dialogs are empty.
- **Library items are translatable** (`untranslatable_fields_hide: '1'`).
  - The schema doesn't change: library items have no bundle key, and
    graphql_core_schema only marks bundle types as `EntityTranslatable`.
- **`from_library` is allowed** in section, accordion, columns (left, right),
  the page's `field_aside` and the footer, besides the node bundles'
  `field_paragraphs`. Not in the site notice.
- **Library conversion** stays on the leaf types. Containers stay off (F12).
- **`from_library` has no behavior plugin.** Option overrides are stored on it
  and survive Drupal's form.

**Frontend:**

- **The library item page** loads by id when the parameter is numeric (Drupal's
  links, F18) and by uuid otherwise (the editor's): one query with
  `@include`/`@skip`.
- **Library blocks in containers:** `...paragraphFromLibrary` in the Section,
  Accordion and Columns fragments.
- **`components/NodeTeaser`** (`fragment nodeTeaser on Node`) renders a page,
  news item or event as a card or a list item, for the teaser block and both
  fragments.
- **Fragments** in `Paragraph/BlokkliFragment/<Name>/`:
  - `UpcomingEvents` (`upcoming_events`): the next three events that haven't
    ended, as a list. `field_date.end_value` is compared with today at 00:00
    UTC, which keeps the cache key stable for a day.
  - `LatestNews` (`latest_news`): the three latest news items, with the option
    `display` (cards or list).
  - Both:
    - query `entityQuery` with `status` in the page's language
    - drop `null` items with a type guard
    - use `container-content` and `previewWidth: 800`
    - have no heading, and show a placeholder while editing when empty
- **`allowed-fragments`** on the main field of all four node bundles, matching
  Drupal.

**Dates, formatted by Drupal** (added after the first browser check: the DE page
crashed with "Invalid time value", because `created` is an ISO string and the
frontend treated it as a Unix timestamp):

- **`locale`** is enabled, and the DE and FR interface translations are imported
  with `drush locale:check && drush locale:update`. They aren't config, so every
  install needs this step (CONTRIBUTING). Locale also translated 155 objects of
  shipped config (`config/sync/language/{de,fr}`).
- **The date format `day`** (`j F Y`; German `j. F Y` as a config translation),
  `DAY` in `DrupalDateFormat`.
- **`fragment dateRange`** (`app/graphql`): `startDay`/`endDay` with `DAY`,
  `startTime`/`endTime` with `format: "H:i"`, and `start` (`format: "c"`) for
  `<time datetime>`. `helpers/date.ts` only composes the range, with the day
  once if start and end share it.
- **The news date:**
  `createdRawField { first { formatted(drupalDateFormat: DAY) } }`.
- **Not moved:** the office hours' weekday names still come from `Intl`: the
  field gives the day as a number.

### Decisions (2026-09-27)

- **Containers stay out of the library** until F12 is fixed separately (the
  user). 14a's library items are single blocks (a table, a text).
- **Library items are translatable** (the user). The editor translates them as
  it does pages; each translation starts with the source label.
- **Dates are formatted by Drupal** (the user), with `locale` enabled now rather
  than in 13f.
- **Templates stay untranslated.** Their route has no language, and inserted
  blocks are translated on the page.
- **Fragments render no heading:** editors put a title block above. The
  placeholders are English, like the category labels (13c).
- **Not done:**
  - spacing between blocks on the template page; it would need a class on
    `BlokkliDrupalEditTemplate`'s field
  - a canonical route the frontend serves for templates (F18)

### Verification (2026-09-27)

- **Config:** `drush si --existing-config -y`, and `config:status` is clean. The
  schema dump doesn't change.
- **`pbGetFieldConfig`:**
  - `from_library` is in the new fields.
  - The library item's `paragraphs` has the leaf types.
  - The template's `paragraphs` has every type.
- **Mutations as admin** (`tmp/drupal-reusable-mutations.sh`; content from
  `tmp/drupal-reusable-content.php`):
  - **Templates:**
    - `createTemplate` created the service page and the default columns
    - the template search lists both
    - `add_from_template` inserted the service page into a news item
    - `add` of columns got the default's two texts
    - `add_multiple` with a child got both (F20)
  - **Library:**
    - `make_reusable` on a text, a contact and a table. The items exist only
      after publishing.
    - `add_reusable` into a section, the aside, and the footer
    - a text into the aside is accepted (F16), and then the node form refuses to
      save
    - an option override on a library block survives publishing and the node
      form
    - `detach_reusable` keeps the block's options
    - a DE label on the item is stored as the DE translation
  - **Fragments:** `add_fragment` for both, one with `display: list`. The option
    survives publishing and the node form: F11 doesn't apply to fragments.
  - **F12 reproduced** (see findings), and F17's three bugs reproduced.
- **Through the Nuxt proxy:**
  - `libraryItem` by id and by uuid, EN and DE (label `Notfallnummern`,
    `blokkliProps.language` `de`)
  - open editing of a library item redirects to
    `/en/blokkli/library-item/3?blokkliEditing=…`, which the page now serves
  - `upcomingEvents` and `latestNews`: EN has three each; DE leaves out the
    event and the news item without a German translation; the past event is
    never listed
  - the dates: EN "2 October 2026", DE "2. Oktober 2026", times `08:00`–`12:00`;
    a news item's route in DE has `27. September 2026`
- **The build:** the daemon reports "supports all features". The fragments are
  collected (`BlokkliFragmentName = 'latest_news' | 'upcoming_events'`), and
  `typecheck:playground-drupal` passes.
- **In the browser** (Playwright, as admin; after the date fix):
  - **Views:** every node (1–12), library item 3 and both config pages render in
    EN, DE and FR without an error page or console errors.
  - **Fragments:**
    - the fragment dialog lists both fragments, with live previews
    - adding "Latest news" and switching its option to "List" works
  - **Library:**
    - "From library" offers all three items in the main content, and only the
      contact in the sidebar
    - placing an item works
    - "Add to library" on the fees table works, but needs two clicks (F21)
    - detaching before publishing works
    - "Edit" on a placed item opens its page (by uuid) in the nested editor
    - its DE switch follows Drupal's id link and edits the translation
  - **Templates:**
    - the template dialog shows both templates, and inserting the service page
      adds its 8 blocks
    - a new columns block gets the default template's texts
    - "Manage templates", then "Edit", opens `/blokkli/template/<uuid>`
  - **Publishing** from the menu works.
  - **The analyzer** reports "H1 → H3" for teasers or fragments placed right
    after the page title: a content warning, since a title block belongs above
    them.
  - Full coverage is left to E2E tests (the user).
