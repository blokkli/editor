# 13h: Collaboration and roles

- **Status:** done
- **Milestone:** M1 Local dev site
- **Depends on:** 13b–13g, 13i
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Several people work on the same page: they comment and get notified, and each
role sees and can do what it should. The roles are those of 14a's town hall.
Comes after the other Drupal parts, since per-bundle permissions need every
bundle.

## Tasks

- [x] **Comments and notifications.**
- [x] **Roles** (14a):
  - [x] a department editor
  - [x] the head of the department as reviewer (view, comment, publish).
        Decided: view and comment; the editor publishes.
  - [x] a French translator
  - [x] a restricted editor who can't use some blocks, through
        `paragraphs_type_permissions` (e.g. no sections or charts)
  - [x] media permissions for the editing roles
  - [ ] per-bundle view permissions for anonymous users, for SSR with a preview
        grant (13e). Needs chunk 10's grant code first (F22). Moved to chunk 10.
- [x] Skills:
  - [x] new `blokkli-setup-permissions`: which role needs which permission, for
        blökkli, paragraphs, media and GraphQL
  - [x] comments and notifications: in that skill, or in their own. Decided:
        their own, `blokkli-setup-comments`.

## Acceptance criteria

- Each role can do what it's meant to in the editor, and nothing more. The
  restricted editor doesn't see the denied blocks.
- A mention, a reply or a resolved thread notifies the users concerned (a new
  comment without a mention notifies nobody, F40).
- The skills exist.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **`paragraphs_type_permissions`:** enable it together with the roles. Every
  role then needs per-bundle view (and create/update) permissions, including
  anonymous for SSR with a preview grant.
- **Chunk 05 seeds users** for these roles.

From [13c](13c-hosts.md) (2026-09-26):

- **Config pages:** editors need `manage translatable config pages`, and
  translators `translate translatable_config_pages`.
- **Block transfer** needs `transfer blokkli paragraphs` (only the admin role
  has it).
- **The node bundles** news, event and office need their own create and edit
  permissions per role.

From [13d](13d-reusable-content.md) (2026-09-27):

- **Library:**
  - `create paragraph library item` ("Add to library")
  - `edit paragraph library item` (edit an item)
  - `administer paragraphs library` (delete, unpublished items)
- **Templates:**
  - `view paragraph templates` (the dialog's previews and the edit route)
  - `create paragraph template`, `edit own/any paragraph template`,
    `delete own/any paragraph template`
  - `manage default paragraph templates`: admins only

From [13e](13e-publishing.md) (2026-09-27):

- **Scheduler:** `schedule publishing of nodes`,
  `schedule publishing of paragraph`, `view scheduled content`,
  `view scheduled paragraph`. "Manage schedule" (`set_paragraph_schedule`)
  checks none of them: editing the edit state is enough.
- **Revisions:** `view/revert {bundle} revisions` for Drupal's revision pages.
- **"publish paragraphs blokkli edit state with validation errors"** skips
  validation, including F23's past unpublish dates. Only the admin should have
  it, and testing needs a role without it.
- **Preview links** work for any user with `access content`, GraphQL access and
  view access to the page.

From [13f](13f-translation.md) (2026-09-27):

- **Translators** (the French translator of 14a) need `translate <bundle> node`
  for each host type, `create content translations` and
  `update content translations`: the editor's switcher opens Drupal's "add
  translation" form. Config pages: `translate translatable_config_pages`.
  Paragraphs only need `edit paragraphs blokkli edit state`.
- **UI strings** (the `texts` module): `access string translation overview`,
  `view string translation`, `create string translation` and
  `edit string translation`, for whoever translates the frontend's texts. Not
  blökkli's.
- **DeepL** has no permission of its own.

## Roles and comments (2026-09-28)

The agent was skipped for now (the user); its permission comes with it.

Decisions:

- **The head of the department only comments** (the user): read-only with
  comments and mentions; the department editor publishes. blökkli has no publish
  permission of its own: publishing needs edit rights and ownership of the edit
  state (F44).
- **Notifications as the module creates them** (the user): mentions, replies and
  resolved threads. A new comment without a mention notifies nobody (F40); the
  acceptance criterion is reworded.
- **The roles,** proposed by Claude, labels as language overrides:

  | Role (id)                 | Label EN / DE / FR                                                      |
  | ------------------------- | ----------------------------------------------------------------------- |
  | `content_editor` (reused) | Editor / Redaktion / Rédaction                                          |
  | `reviewer`                | Head of department / Abteilungsleitung / Direction de service           |
  | `translator`              | Translator (French) / Übersetzung (Französisch) / Traduction (français) |
  | `restricted_editor`       | Restricted editor / Redaktion (eingeschränkt) / Rédaction (restreinte)  |

  None has `transfer blokkli paragraphs`, `publish … with validation errors`,
  `manage default paragraph templates`, masquerade or anything administrative.

- **Per-type permissions** (proposed by Claude): `paragraphs_type_permissions`
  is on. The editor and the translator bypass it; `authenticated` views every
  type; the restricted editor may create, update and delete every type but
  section and chart, which it may only update (texts inside an existing section
  stay editable). Anonymous visitors get theirs with chunk 10's grant.
- **No per-department access:** "department" is the persona; every editor edits
  every page.
- **The translator** needs `edit any <type> content`: editing in blökkli needs
  update access to the page, so they can also change the English page (F43).
- **Media:** editors create and edit their own image, document and video media;
  the translator and the reviewer only view them. blökkli's uploads don't check
  it (F42).
- **Two skills:** `blokkli-setup-permissions` and `blokkli-setup-comments`.

As built:

- **Drupal config:** `paragraphs_type_permissions` enabled; the four roles with
  their permissions and DE/FR labels; `authenticated` gets
  `view paragraph content <type>` for all 17 types. Script:
  `tmp/13h-roles-config.php` (not committed, can be run again).
- **`blokkli_playground`:** `Hook/ParagraphsTypeHooks.php` lets users with
  `view paragraphs blokkli edit state` view paragraph types. Without it, no
  editor but the admin got any paragraph type to add (F38).
- **Test users** (content, `tmp/13h-users.php`, not committed; chunk 05 seeds
  them): Anna Keller (editor), Marc Brunner (head of department), Élodie Favre
  (translator), Jonas Weber (restricted editor). Log in with
  `ddev drush uli --name="Anna Keller"`.
- **Docs:** the permissions reference (review doesn't publish; comments,
  mentions, transfer and notifications; the paragraph type access hook;
  `paragraphs_type_permissions`) and the editor overview (the editor opens for
  any edit permission, read-only without `edit`).
- **Skills:** new `blokkli-setup-permissions` and `blokkli-setup-comments`
  (1.0.0); `blokkli-setup-drupal` 1.0.7 (review doesn't publish, the paragraph
  type access, both new skills listed).
- **Findings:** F38–F44.

Verification (page 13, logged in per user in its own browser context):

- **Anna (editor):** took over the edit state from admin ("Assign to me"), got
  the 15 addable types, added a title through the Drupal form, commented on it
  mentioning "@Marc Brunner", resolved the thread and published. Her permissions
  in the editor: library yes, default templates no, agent no, block transfer no.
  Drupal's media form 200, the UI strings 403.
- **Marc (head of department):** the page read-only with "You are in review
  mode" and Anna's pending title; no add list. The bell showed 1 ("Anna Keller
  mentioned you in a comment"); he replied in the sidebar, and Anna got the
  reply notification; Anna's resolve notified him. Publishing and deleting
  through the API returned `success: false`; the node form and the permissions
  page are 403. The published German page shows every paragraph with only the
  view permissions of `authenticated`.
- **Jonas (restricted editor):** no Section and Chart in the add list (both
  "edit" only). Through the API: adding a section is refused ("Access denied:
  cannot create paragraph of type 'section'"), deleting one fails, editing the
  title inside a section and adding a text work. Reverted.
- **Élodie (translator):** in French the editor is in translation mode (no add
  list), a title translated and published. In English she edits everything
  (F43). Drupal's translation overview and "add translation" 200, the UI strings
  200, the media form 403, yet pasting an image created a media entity (F42;
  deleted).
- Not checked: templates with a denied type (no templates locally; F16 covers
  them), anonymous access (chunk 10).
