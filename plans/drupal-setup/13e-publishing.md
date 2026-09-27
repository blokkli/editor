# 13e: Publishing

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can publish now or later, with revisions, and share an unpublished
preview. In the demo (14a): news set to publish later, events that unpublish
themselves after their date, and a "pool closed" notice block scheduled to
disappear.

## Tasks

- [ ] **Scheduling:**
  - [ ] scheduler on `page`, `news` and `event` (`publish_on` / `unpublish_on`)
  - [ ] block scheduling, which needs scheduler's paragraph plugin (a patch, see
        Notes), on the types that make sense for it (e.g. text, section)
  - [ ] scheduling an edit state's changes (cron)
- [ ] **Revisions** with log messages.
- [ ] **Preview grants:** the "preview on smartphone" link, and the page it
      opens. Anonymous rendering with a grant depends on per-bundle view
      permissions (13h) and on chunk 10.
- [ ] Skills:
  - [ ] review `blokkli-setup-scheduling`: it lacks the scheduler patch and the
        GraphQL exposure of the fields
  - [ ] preview grants and revisions: in that skill, or in a new
        `blokkli-setup-publishing`. Decide here.

## Acceptance criteria

- A news item, a single block and an edit state's changes can each be scheduled,
  and cron publishes or unpublishes them.
- Publishing asks for a revision log message.
- A preview grant opens the unpublished changes on another device.
- The skills exist.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Block scheduling** needs scheduler's paragraph plugin: the starterkit
  patches scheduler with #3312200 (needs `cweagans/composer-patches`). Without
  it, `getEnabledTypes('paragraph')` returns nothing.
- **Seeded dates** are relative to the bake (14a, chunk 05), so scheduled items
  stay in the future.

From [13c](13c-hosts.md) (2026-09-26):

- **The news date is `created`.** Scheduled news should get the publish date as
  its `created` (scheduler's "change content creation time to match the
  scheduled publish time").
- **News, event and office have no scheduler settings yet,** and their form
  displays hide `publish_on`/`unpublish_on`, as the page's does.
- **Config pages have no revisions and no status:** publishing an edit state
  saves them directly, and they can't be scheduled or unpublished.
