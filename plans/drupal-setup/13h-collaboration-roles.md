# 13h: Collaboration and roles

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13b–13g, 13i
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Several people work on the same page: they comment and get notified, and each
role sees and can do what it should. The roles are those of 14a's town hall.
Comes after the other Drupal parts, since per-bundle permissions need every
bundle.

## Tasks

- [ ] **Comments and notifications.**
- [ ] **Roles** (14a):
  - [ ] a department editor
  - [ ] the head of the department as reviewer (view, comment, publish)
  - [ ] a French translator
  - [ ] a restricted editor who can't use some blocks, through
        `paragraphs_type_permissions` (e.g. no sections or charts)
  - [ ] media permissions for the editing roles
  - [ ] per-bundle view permissions for anonymous users, for SSR with a preview
        grant (13e). Needs chunk 10's grant code first (F22).
- [ ] Skills:
  - [ ] new `blokkli-setup-permissions`: which role needs which permission, for
        blökkli, paragraphs, media and GraphQL
  - [ ] comments and notifications: in that skill, or in their own. Decide here.

## Acceptance criteria

- Each role can do what it's meant to in the editor, and nothing more. The
  restricted editor doesn't see the denied blocks.
- A comment notifies the other users of the page.
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
