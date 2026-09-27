# 14b: Demo content

- **Status:** todo
- **Milestone:** M3 Hosted
- **Depends on:** 05, 13, [14a](14a-demo-concept.md)

## Goal

The content every sandbox starts with: realistic pages a visitor can relate to
and edit, not a page about blökkli. It replaces chunk 05's placeholder pages.
The topic and the content model are decided in 14a, and built in chunk 13's
sub-chunks; this chunk writes the content.

Until 2026-09-26 this was chunk 14, including the topic and the bespoke
paragraph types. Those moved to 14a, so the model is settled before chunk 13
adds types.

## Tasks

- [ ] The content from 14a's concept, in EN with DE and FR translations:
  - [ ] about 20 pages, 6 offices, 6 news items and 10 events (14a's page list);
        the lighter ones can be trimmed
  - [ ] the landing page "The lakeside pool" at its best, with the planted
        mistakes for the analyzer (an image without alt text, a table without a
        header row, an outdated French translation)
  - [ ] the library items (single blocks: containers stay out of the library
        until F12 is fixed), the service page template, and the default template
        for new columns
  - [ ] one deliberately outdated French page: the paragraphs' FR translations
        flagged `content_translation_outdated` (chunk 05, 13f)
  - [ ] dates relative to the bake (chunk 05)
  - [ ] scheduled content (13e): a news item that publishes later (the lakeside
        pool's opening), and the "pool closed" text in the site notice with an
        unpublish date, set in every language it has (F24). Events get their
        unpublish date from the hook when they're saved.
- [ ] Images and other media: openly licensed (CC0, public domain, CC BY, CC
      BY-SA; no NC or ND), without recognisable real landmarks or place names.
      Record every file's source and licence, and fill the media credit field.
- [ ] The coat of arms of Blockingen/Bloquens (invented). A raster image (PNG or
      WebP): image styles can't process SVG (13c).
- [ ] Suggested tasks for the sandbox's welcome panel (chunk 09).

## Acceptance criteria

- `ddev bake` builds the template from this content.
- Every page renders in all three languages.
