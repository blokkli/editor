# 13d: Reusable content

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13b, 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can reuse content: library items, fragments and templates, as 14a's
model has them.

## Tasks

- [ ] **Library:** `paragraphs_library` and `from_library`, and
      `allow_library_conversion` on the types that may become library items. The
      library item route exists (chunk 06). The demo's items (14b writes them):
      emergency numbers, "what goes into which bin", "stay informed".
- [ ] **Fragments** (`defineBlokkliFragment`), with `allowed-fragments` on the
      fields that allow them and `editor.previewWidth`:
  - [ ] "upcoming events": the next events, from the structured data (13c)
  - [ ] "latest news"
  - [ ] the table of contents fragment comes with 13i
- [ ] **Templates:**
  - [ ] the `blokkli_paragraph_template` entity in the GraphQL server, and its
        permissions
  - [ ] the template search provider ("Entity Query Templates")
  - [ ] a service page template: lead, steps as an accordion, a fees table,
        downloads, a contact block
  - [ ] a default template for new columns
  - [ ] the edit route exists (chunk 06)
- [ ] Skills:
  - [ ] review `blokkli-setup-templates`. Its route sets `layout: 'library'`,
        which most projects don't have.
  - [ ] new `blokkli-setup-library`
  - [ ] new `blokkli-setup-fragments`: including fragments that query data (the
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

From [13c](13c-hosts.md) (2026-09-26):

- **Check the library item links.** Drupal builds a library item's canonical URL
  with its id (`/blokkli/library-item/{id}`), but
  `pages/[lang]/blokkli/library-item/[uuid].vue` loads it by uuid. Links that
  Drupal builds (open editing, the language switch) may then 404. Config pages
  avoid this by resolving their path with the route query.
- **Teaser and contact** can become library items (`allow_library_conversion`).
- **Fragments** for "upcoming events" and "latest news" can read `NodeEvent`'s
  `date` (`startDate(format: "c")`) and `NodeNews.created`, as the teaser does.
