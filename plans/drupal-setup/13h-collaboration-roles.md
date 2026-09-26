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
        grant (13e)
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
