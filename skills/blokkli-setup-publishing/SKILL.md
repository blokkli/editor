---
name: blokkli-setup-publishing
description: >-
  Set up publishing in a blökkli 2.x + Drupal project: scheduling hosts and
  single paragraphs with the scheduler module (including the patch that adds
  paragraph support), scheduling an edit state's pending changes, cron,
  revisions with a change description, and preview grants ("Preview (with
  smartphone)"). Use when editors should publish or unpublish pages or
  paragraphs (blocks in the editor) at a set time, publish changes later, or
  share a preview of unpublished changes; or when "Manage schedule" is disabled,
  scheduled content doesn't change, publishing fails after a date, or a preview
  link shows the published page.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (composer, drush, config export) and the
  Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/configuration
---

# Publishing

In the editor:

- **The publish button** reads "Publish" or "Publish & Close", and "Save" or
  "Save & Close" on an unpublished page. Once changes are scheduled, it reads
  "Manage scheduling".
- **Its dialog, "Publish changes",** has the modes "Save", "Publish" and
  "Schedule", and the field "Change description" for the revision log.
- **"Manage schedule"** on selected paragraphs opens "Manage scheduling", with
  "Publish on" and "Unpublish on".
- **"Preview (with smartphone)"** in the toolbar shows a QR code and a link to
  the pending changes.

Four mechanisms are behind this:

| What                             | Who does it                    | Where the date is set                     |
| -------------------------------- | ------------------------------ | ----------------------------------------- |
| Publish or unpublish a host      | contrib `scheduler`            | the host's Drupal form                    |
| Publish or unpublish a paragraph | `scheduler` with a patch       | "Manage schedule"                         |
| Publish pending changes later    | `paragraphs_blokkli_scheduler` | the "Schedule" mode of the publish dialog |
| Revisions, preview grants        | `paragraphs_blokkli`           | the publish dialog, the toolbar           |

The docs:
[the scheduler module](https://docs.blokk.li/modules/drupal/configuration#paragraphs-blokkli-scheduler),
[scheduling options don't appear](https://docs.blokk.li/modules/drupal/faq#scheduling-options-don-t-appear-on-paragraphs),
[preview links don't open for others](https://docs.blokk.li/modules/drupal/faq#preview-links-don-t-open-for-others).
This skill is the procedure and the traps.

## Before you start

Decide, or ask:

- **Which host types get dates** (e.g. pages and news, not offices). Config
  pages have no status and can't be scheduled by scheduler.
- **Which paragraph types can be scheduled:** the ones editors time, e.g. a
  notice, a text, a section. Not every type needs it.
- **Who opens preview links:** logged-in users, or anonymous visitors too. The
  second needs custom code (section 7).

## 1. Modules and the patch

scheduler has no paragraph support. The patch from
[scheduler#3312200](https://www.drupal.org/project/scheduler/issues/3312200)
adds it. Apply it with composer-patches 1.x:

```bash
composer config allow-plugins.cweagans/composer-patches true
composer require cweagans/composer-patches:^1.7
```

Put the plugin in `require`, not `require-dev`: a `--no-dev` build doesn't
patch. Then in `composer.json`:

```json
"extra": {
  "composer-exit-on-patch-failure": true,
  "patches": {
    "drupal/scheduler": {
      "scheduler#3312200: Paragraph scheduler plugin": "https://www.drupal.org/files/issues/2026-06-15/3312200-paragraph-scheduler.diff"
    }
  }
}
```

- **The patch file** is written for scheduler 2.3.0. It's an attachment, so it
  doesn't change. Without `composer-exit-on-patch-failure`, a patch that no
  longer applies is skipped silently.
- **Projects on composer-patches 2.x** add the same entry, then run
  `composer patches-relock` and commit `patches.lock.json`.
- **Apply it:** `composer update drupal/scheduler`, which reinstalls and patches
  it. Check that `src/Plugin/Scheduler/ParagraphScheduler.php` exists.
- **The fields:** the patch adds `publish_on` and `unpublish_on` to paragraphs.
  Run `drush cr`, **then** `drush sch-ent-upd`. Run before the cache rebuild, it
  finds nothing to do. A site installed from config
  (`drush si --existing-config`) gets the fields without it.
- **Enable** `scheduler` first, then `paragraphs_blokkli_scheduler`: the second
  uses the first, but doesn't declare it.
- **GraphQL server:** enable the extension `paragraphs_blokkli_scheduler`. It
  provides the paragraphs' dates to the editor, so no `fields` entries are
  needed for them.
- Export the config (`drush cex`), and update the schema in Nuxt.

## 2. Scheduling hosts

Scheduler's settings live on the host's bundle (`third_party_settings.scheduler`
in e.g. `node.type.news.yml`). Set them in the bundle's form, or in config with
all 12 keys:

```yaml
third_party_settings:
  scheduler:
    expand_fieldset: when_required
    fields_display_mode: vertical_tab
    publish_enable: true
    publish_past_date: error
    publish_past_date_created: false
    publish_required: false
    publish_revision: false
    publish_touch: false
    show_message_after_update: false
    unpublish_enable: true
    unpublish_required: false
    unpublish_revision: false
```

- **The form display** needs the fields, or the form doesn't show them. The
  bundle form adds them; in config, add them yourself, together with the extra
  field `scheduler_settings`. Otherwise saving the display puts
  `scheduler_settings` in `content` anyway.

  ```yaml
  content:
    scheduler_settings:
      weight: 50
      region: content
      settings: {}
      third_party_settings: {}
    publish_on:
      type: datetime_timestamp_no_default
      weight: 52
      region: content
      settings: {}
      third_party_settings: {}
  ```

  They appear in the host's form under "Scheduling options". blökkli opens the
  same form.

- **`publish_touch: true`** when the host shows its creation date (e.g. news):
  scheduler then sets `created` to the publish date.
- **`show_message_after_update: false`:** otherwise every publish from blökkli
  queues a message.
- **Two ways to schedule a host:**
  - scheduler's "Publish on" in the form publishes the host itself
  - blökkli's "Schedule" mode publishes pending changes (section 4)

  While the host has a future "Publish on", scheduler keeps it unpublished on
  every save, so blökkli can't publish it earlier. blökkli's "Schedule" mode
  doesn't change `created`.

- **Dates set by code**, e.g. unpublishing an event after its date: set
  `unpublish_on` in a `hook_node_presave`, and only to a future date.
  Scheduler's cron unpublishes one translation at a time and clears its date, so
  a hook that clears past dates breaks the other translations.

## 3. Scheduling paragraphs

The same settings on the paragraph type (`paragraphs.paragraphs_type.*.yml`),
with these values:

- **`publish_past_date: publish`.** Otherwise a paragraph whose date has passed
  before cron ran fails validation.
- **`publish_revision` and `unpublish_revision`: false.** The host points at a
  fixed revision of the paragraph; a new revision from cron would never show.
- **`publish_touch` and `publish_past_date_created`: false.** Paragraphs have no
  creation date to set, and cron would fail.
- **`show_message_after_update: false`** and
  **`fields_display_mode: fieldset`.**

On the paragraph's form display, put `publish_on`, `unpublish_on` and
`scheduler_settings` under `hidden`. blökkli sets the dates; a Drupal form that
shows them loses them (a known problem of the patch).

**What editors see:** "Manage schedule" is disabled on types without the
settings: "Scheduling is not available for this block type." A paragraph that
isn't published yet is muted while editing. Visitors don't see it, and with
"Hide unpublished paragraphs" (blökkli's settings form) neither do logged-in
users.

**The traps:**

- **A schedule applies to one language.** The dates and the status are
  translatable, and "Manage schedule" sets them on the translation being edited.
  A paragraph scheduled in English stays published in its German translation.
  Schedule it in each language.
- **A past "Unpublish on" blocks publishing.** Scheduler rejects any past
  unpublish date, and blökkli validates the paragraphs when publishing. Between
  the date and the next cron run, publishing the host fails with the message
  "The 'unpublish on' date must be in the future." Users with "publish
  paragraphs blokkli edit state with validation errors" aren't affected. Run
  cron often (section 5).

## 4. Scheduling pending changes

The "Schedule" mode of the publish dialog stores a date on the edit state. Cron
publishes it then.

- **The date** must be at least 2 minutes ahead.
- **Publishing on schedule skips validation,** and publishes an unpublished
  host.
- **The revision** gets the change description. Its author is the edit state's
  owner, not whoever scheduled it.
- **Config pages** also offer "Schedule". They're saved at the date.
- **Until then,** editors can keep changing the page. The publish button reads
  "Manage scheduling", and the dialog can remove the schedule.

## 5. Cron

- **`drush cron`** runs both jobs: scheduler's (hosts and paragraphs) and
  `paragraphs_blokkli_scheduler`'s (pending changes). `drush sch-cron` and
  scheduler's cron URL only run scheduler's.
- **`automated_cron`** only runs after a page request, at most once per its
  interval (3 hours by default). Timed content needs a system cron that runs
  `drush cron` every few minutes.

## 6. Revisions

- **Every publish** of a revisionable host creates one revision, covering all
  languages. Its log is the "Change description".
- **An empty change description** keeps the log of the previous revision. Ask
  editors to fill it in, or don't rely on the log.
- **Config pages** have no revisions, so the dialog doesn't show the field.
- **No blökkli feature lists revisions.** "History" is the undo list of the edit
  state. Revisions are in Drupal (`/node/{nid}/revisions`). Drupal's overview
  hides revisions that didn't change the language it shows.

## 7. Preview grants

Nothing to enable: the feature is on when the schema has
`ParagraphsBlokkliEditState.previewUrl`.

- **The flow:**
  - The link is a path:
    `/{langcode}/paragraphs_blokkli/preview_grant/{id}/{hash}`. The editor
    prepends its own origin, so a link from `localhost` only works on the same
    machine.
  - Drupal adds a grant to the viewer's session and redirects to the host's URL
    with `?blokkliPreview=<host uuid>`.
  - blökkli then shows the pending changes, read-only.
- **In a decoupled setup:**
  - the grant route must reach Drupal, and the host's URL must reach Nuxt
  - the GraphQL proxy must forward the session cookie both ways
  - pages rendered for a session must bypass the Nuxt and CDN caches
- **What the viewer needs:** GraphQL access and view access to the host. The
  grant route needs no permission: the hash is the credential. That's usually
  any logged-in user, and only for a published host.
  - **The grant itself adds no permissions.** For anonymous visitors without
    them, or for an unpublished host, the site adds them while the grant is
    valid (below).
- **The link opens the language the editor was in.**

The module leaves access to the site. For a site whose anonymous visitors can't
view content, or to preview unpublished hosts:

- **Permissions:** an access policy (`AccessPolicyBase`, implementing
  `CacheOptionalInterface`, tagged `access_policy`) that gives the anonymous
  account `access content` and GraphQL access while
  `paragraphs_blokkli.preview_grant_checker`'s `hasValidGrant()` is true. It
  adds the `paragraphs_blokkli_session` cache context to its result.
- **Unpublished hosts:** a `hook_entity_access()` that allows `view` when
  `isEntityPreviewable($entity)` is true, with the same cache context. Limit it
  to unpublished entities, so that caches of published ones don't vary by the
  grant.
- **Paragraph type permissions:** with `paragraphs_type_permissions`, the viewer
  also needs `view paragraph content <type>` or
  `bypass paragraphs type content access`.

## 8. Permissions

Tell the developer who needs which; don't assign them:

- `schedule publishing of nodes` (and of other host types),
  `schedule publishing of paragraph`, and `view scheduled content` /
  `view scheduled paragraph` for the scheduler lists.
- **Paragraph schedules:** "Manage schedule" doesn't check the scheduler
  permissions; editing the edit state is enough.
- **Scheduling pending changes and publishing:** the blökkli edit state
  permissions.
- `publish paragraphs blokkli edit state with validation errors` skips
  validation (section 3).
- `view {bundle} revisions`, `revert {bundle} revisions` for Drupal's revision
  pages.

## 9. Check the result

1. **The patch applied:** `ParagraphScheduler.php` exists. After `drush cr`,
   `drush sch-ent-upd` has nothing left to do.
2. **The schema** has `hasPublishOn` on `ParagraphsType`, and the mutations
   `set_paragraph_schedule` and `schedule`.
3. **The Nuxt dev server's log** doesn't list `block-scheduler` or
   `preview-grant` among the disabled features.
4. **In the browser, as an editor** (not user 1, who skips validation):
   - "Manage schedule" works on a scheduled type, and is disabled on others
   - the host's form shows "Scheduling options"
   - "Schedule" in the publish dialog, then `drush cron` after the date
   - a paragraph with "Publish on" in the past, then `drush cron`: it shows on
     the page without a cache clear
   - the "Preview (with smartphone)" link, opened by another logged-in user,
     shows the pending changes; without the link, the published page

## Symptoms and causes

| Symptom                                                                | Cause                                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| "Scheduling is not available for this block type."                     | The paragraph type has no scheduler settings, or the patch isn't applied (`getEnabledTypes` is empty) |
| `sch-ent-upd` reports nothing, the paragraph fields are missing        | It ran before `drush cr`                                                                              |
| The host's form has no "Scheduling options"                            | `publish_on`/`unpublish_on` aren't in the form display                                                |
| Scheduled content doesn't change at its date                           | Cron didn't run (`automated_cron` needs a page request), or only `sch-cron` ran                       |
| A scheduled paragraph shows in another language                        | The schedule was set in one language only                                                             |
| Publishing fails with "The 'unpublish on' date must be in the future." | A paragraph's unpublish date passed before cron ran                                                   |
| A news item's date doesn't match when it was published                 | `publish_touch` is off, or it was published with blökkli's "Schedule" mode                            |
| A host can't be published early                                        | It has a future "Publish on" in its form                                                              |
| A revision has the previous revision's log                             | The change description was empty                                                                      |
| The preview link returns "Access denied"                               | The hash doesn't match: a link from another site, whose edit state has the same id                    |
| The preview link shows the published page                              | The viewer lacks GraphQL access or view access to the host                                            |
| The preview link opens a broken URL                                    | The editor runs on another origin than visitors use                                                   |
