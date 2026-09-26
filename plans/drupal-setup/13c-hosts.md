# 13c: Hosts

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13b
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The content types of Blockingen/Bloquens beyond `page` (14a): news, events and
offices, with the structured data on events and offices. Pages get a sidebar and
a header option, config pages hold the footer and a site-wide notice, and blocks
can reference other hosts.

## Tasks

- [ ] **Content types** (fields as in 14a):
  - [ ] `news`: title, lead, image, `field_paragraphs`; its date is the
        publication date
  - [ ] `event`: title, lead, image, date range, place, organiser, category
        (list), price, registration link, `field_paragraphs`
  - [ ] `office`: title, lead, address, phone, email, structured opening hours
        (e.g. the `office_hours` module: decide here), `field_paragraphs`
  - [ ] each one's component in `playground-drupal`, its route, and the
        structured fields rendered from data (not blocks)
- [ ] **Pages:**
  - [ ] `field_aside` (the sidebar), which allows contact, button and downloads
        blocks
  - [ ] host options: a `paragraphs_blokkli_host_options` field and
        `defineBlokkliProvider` with a header variant
- [ ] **Config pages** (`translatable_config_pages`): `footer` with a paragraphs
      field; `site` with the name, the coat of arms and a site-wide notice as a
      paragraphs field.
- [ ] **Blocks that reference hosts:**
  - [ ] `teaser`: a page, news item or event; option card or list
  - [ ] `contact`: an office, rendered from its structured data; option compact
        or full
  - [ ] entity mappings from `node` (page, news, event → teaser; office →
        contact), so that search results can be dropped onto a page (13g)
- [ ] **Import from existing pages** (`import-existing`) and moving blocks
      between hosts (`block-transfer`): find out what they need, and set it up.
- [ ] Skills:
  - [ ] review `blokkli-setup-host-options`
  - [ ] new `blokkli-add-host`: make an entity type or bundle editable
        (`enabled_types`, the paragraphs fields, the GraphQL server, the
        component with `BlokkliProvider`, the route), including config pages

## Acceptance criteria

- Pages, news, events, offices and both config pages can be edited in the
  editor; the page's header option and sidebar work.
- A teaser and a contact block can be added by search or by drag and drop, and
  show the referenced host's current data.
- `import-existing` and `block-transfer` work between pages.
- The skills exist.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Translatable config pages:** the GraphQL extension is
  `translatable_config_pages` (module `graphql_translatable_config_pages`, part
  of graphql_core_schema). `enabled_types` for config pages hits the schema gap
  in F7.
