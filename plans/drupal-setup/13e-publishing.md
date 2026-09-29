# 13e: Publishing

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can publish now or later, with revisions, and share an unpublished
preview. In the demo (14a): news set to publish later, events that unpublish
themselves after their date, and a "pool closed" notice block scheduled to
disappear.

## Tasks

- [x] **Scheduling:**
  - [x] scheduler on `page`, `news` and `event` (`publish_on` / `unpublish_on`)
  - [x] paragraph scheduling, which needs scheduler's paragraph plugin (a patch,
        see Notes), on text, button and section
  - [x] scheduling an edit state's changes (cron)
  - [x] events unpublish themselves after their date (a hook, the user's
        decision)
- [x] **Revisions** with log messages.
- [x] **Preview grants:** the "preview on smartphone" link, and the page it
      opens. Anonymous rendering with a grant needs code (chunk 10, F22) and
      per-bundle view permissions (13h).
- [x] Skills:
  - [x] `blokkli-setup-scheduling` became `blokkli-setup-publishing` 1.0.0:
        scheduling, revisions and preview grants (the user's decision)
  - [x] `blokkli-setup-drupal` 1.0.3: a pointer

## Acceptance criteria

- A news item, a single paragraph and an edit state's changes can each be
  scheduled, and cron publishes or unpublishes them.
- Publishing asks for a revision log message.
- A preview grant opens the unpublished changes for a logged-in user in another
  session. Anonymous visitors: chunk 10.
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

### The model as built (2026-09-27)

- **Composer:** `cweagans/composer-patches` ^1.7 in `require`, with
  `composer-exit-on-patch-failure`. `drupal/scheduler` is patched with
  [scheduler#3312200](https://www.drupal.org/project/scheduler/issues/3312200)
  "Paragraph scheduler plugin", comment #36
  (`3312200-paragraph-scheduler.diff`), the starterkit's file. After the patch:
  `drush cr`, then `drush sch-ent-upd`. A `si --existing-config` installs the
  paragraph fields by itself.
- **Hosts** (`third_party_settings.scheduler`, all 12 keys):

  | Type   | Publish | Unpublish | Other                 | Form ("Scheduling options")            |
  | ------ | ------- | --------- | --------------------- | -------------------------------------- |
  | page   | on      | on        |                       | `publish_on`, `unpublish_on`           |
  | news   | on      | on        | `publish_touch: true` | `publish_on`, `unpublish_on`           |
  | event  | on      | on        |                       | `publish_on` (the hook sets the other) |
  | office | –       | –         |                       | –                                      |
  - All: `show_message_after_update: false`, `publish_past_date: error`,
    `fields_display_mode: vertical_tab`.
  - Form displays: `scheduler_settings` (weight 50), `publish_on` (52) and
    `unpublish_on` (54) with `datetime_timestamp_no_default`.

- **Paragraphs:** text, button and section.
  - Settings: `publish_past_date: publish`, `fields_display_mode: fieldset`, and
    no revisions, `publish_touch` or messages.
  - `publish_on`, `unpublish_on` and `scheduler_settings` are hidden on their
    form displays.
  - On a fresh install, scheduler adds `publish_on`/`unpublish_on` as hidden to
    every paragraph form display. That's exported too.
- **The event hook:** `blokkli_playground/src/Hook/EventHooks.php`
  (`node_presave`).
  - If the event ends in the future, it sets `unpublish_on` to the end on every
    translation (`field_date` is untranslatable, `unpublish_on` isn't).
  - Past dates are left alone: cron unpublishes one translation at a time.
  - The module now depends on `scheduler`.
- **No change** to GraphQL (no schema diff), the frontend, cron
  (`automated_cron`, 3 hours) or permissions.

### Decisions (2026-09-27)

- The user: patch scheduler with composer-patches; rename the skill to
  `blokkli-setup-publishing`; a hook for the events.
- **composer-patches 1.x,** as the starterkit: no lock file to maintain.
- **Paragraph types:** only the notice's types and section. Every scheduled type
  adds settings and a trap (F23, F24).
- **The hook never clears a date.** A hook that cleared past dates would stop
  cron from unpublishing the other translations, and would drop a due date on
  any save between the end and the cron run.
- **Preview grants are tested with a logged-in user.** Anonymous previews need
  code, which is chunk 10's (F22).

### Verification (2026-09-27)

- **Config:** `si --existing-config -y` twice, `config:status` clean. The
  paragraph fields exist and `needsUpdates()` is false. `drupal:schema`: no
  diff. The daemon: "supports all features".
- **`tmp/drupal-publishing-check.sh`** (due dates moved into the past in the
  database, then `drush cron`):
  - **Hook:** the upcoming events have `unpublish_on` = their end in EN and DE;
    the past one has none. Moving the date moves it. A due event is unpublished
    in EN and DE.
  - **News:** a news item with a due `publish_on` is published by cron, with
    `created` = the publish date.
  - **The notice** (site config page):
    - scheduled to disappear, then published
    - gone in EN, DE and FR after cron, without a cache clear
    - publishing with the date past before cron: validation fails for editors
      without the bypass permission (F23; admin skips validation)
  - **Translations:** a text scheduled in EN stays published in DE (F24). In EN
    it shows after cron without a cache clear, so
    [paragraphs#3311024](https://www.drupal.org/project/paragraphs/issues/3311024)
    didn't show here.
  - **Pending changes:**
    - a date 1 minute ahead is refused
    - after the date and cron: the change is published, the revision has the log
      message, and the edit state is gone
    - an unpublished news item is published, `created` unchanged
  - **Revisions:** one per publish; an empty description keeps the old log
    (F25). Drupal's overview hides revisions that didn't change its language, as
    designed.
  - **Preview grant:** the link redirects to `?blokkliPreview=`. A plain user's
    session gets the grant. A user who queried before the grant keeps a cached
    `null` (F22).
- **Browser** (as admin, then as the plain user):
  - event, news and pages in EN, DE and FR: no error, no console errors
  - "Manage schedule": enabled on a text, disabled on a table. A "Publish on"
    date mutes the text.
  - the publish dialog shows "Save", "Publish", "Schedule", "Change description"
    and the scheduled paragraph
  - the news form has "Scheduling options" with both dates; the event form only
    "Publish on"
  - "Preview (with smartphone)" shows the link. Opened by the plain user, it
    shows the pending change; without it, the published page.
- **Not tested:** a phone. `blokkli.ddev.site` resolves to 127.0.0.1.

## Changed after 13e (2026-09-29)

The notice only takes the new `banner` paragraph type (15c), which has the
scheduler settings of the link it was copied from. Text and link keep theirs,
though the notice no longer uses them.
