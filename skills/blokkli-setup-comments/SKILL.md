---
name: blokkli-setup-comments
description: >-
  Set up comments, mentions and notifications in a blökkli 2.x + Drupal project:
  the paragraphs_blokkli_comment module, its GraphQL extension and permissions,
  @mentions of other users, and the editor's notifications. Use when editors
  should discuss changes on a page, when a reviewer should comment without
  editing, or when the comments sidebar is missing, a comment fails, the mention
  list is empty or nobody gets notified.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/configuration#paragraphs-blokkli-comment
---

# Comments and notifications

Editors comment on a page while they edit it: on one or more paragraphs, or on
the page. Threads have replies, can be resolved, and can mention other users,
who get a notification in the editor. A reviewer can comment without edit
rights.

## 1. The module

- **Enable `paragraphs_blokkli_comment`.** It has its own comment entity
  (`blokkli_comment`) and doesn't need Drupal's `comment` module. Comments
  belong to the host entity, not to one edit state, so they stay after
  publishing.
- It installs the text format `blokkli_comment` for the comments' rich text.
  Don't grant it to any role; the editor doesn't need it.
- **Notifications** are part of `paragraphs_blokkli` itself: the comment module
  only creates them.

## 2. GraphQL and Nuxt

- Enable the schema extension `paragraphs_blokkli_comment` on the GraphQL
  server, next to blökkli's other extensions.
- Dump the schema for Nuxt again. The Drupal module of `@blokkli/editor` enables
  the comments feature when the schema has the comment types, and the
  notifications when it has the notification queries (always, with
  `paragraphs_blokkli_graphql`).
- No frontend code: the comments sidebar, the "Add comment" action on selected
  paragraphs, the markers next to commented paragraphs and the notification bell
  are the editor's.

## 3. Permissions

Tell the developer which roles need what; don't assign them yourself.

- `view blokkli comments`: see comments (with view access to the page).
- `post blokkli comments`: comment, reply, resolve; edit and delete own
  comments.
- `load id and name of blokkli users`: mention others. Give it to everyone who
  comments.
- **A reviewer** gets these with `view` and
  `review paragraphs blokkli edit state`, and no edit rights: the editor opens
  read-only, with comments.
- `administer blokkli_comment`: edit and delete any comment. Admins only.

More on roles: the `blokkli-setup-permissions` skill.

## 4. Mentions and notifications

- **Mentions:** typing `@` in a comment lists the active users whose roles have
  `edit` or `review paragraphs blokkli edit state` (and admins). It doesn't
  check whether they can see the page.
- **Notifications** appear under the editor's bell, with a count. There's no
  email. They're created for:
  - a mention
  - a reply, for the thread's author
  - a reply, for the others who commented in the thread
  - a resolved thread, for the people in it
- **A new comment without a mention notifies nobody.** Mention whoever should
  read it, e.g. the reviewer.
- A notification opens the page in the editor on the comment
  (`?blokkliEditing=<uuid>&blokkliComment=<uuid>`), at the host entity's URL: it
  has to be the frontend's.
- Cron deletes read notifications after 30 days and unread ones after 90.
- `drush config:set paragraphs_blokkli.settings disable_notifications true`
  turns them off.

## 5. Check it

With two users who can comment, e.g. an editor and a reviewer:

1. The editor selects a paragraph, adds a comment and mentions the reviewer.
2. The reviewer's bell shows 1; the notification opens the page on the comment.
3. The reviewer replies in the comments sidebar; the editor is notified.
4. The editor resolves the thread; the reviewer is notified.

## Traps, by symptom

- **No comments sidebar:** the module or its GraphQL extension isn't enabled,
  Nuxt has the old schema, or the user lacks `view blokkli comments`.
- **A reviewer's comment isn't saved:** nobody has changed the page yet, so
  there's no edit state to comment on; or `post blokkli comments` is missing.
- **The mention list is empty:** `load id and name of blokkli users` is missing,
  or the other users' roles have neither edit nor review permission.
- **Nobody is notified of a new comment:** it has no mention.
- **An edited comment doesn't say "(edited)":** it was edited before the
  module's update 10005, which doesn't know when.
- **A text format has a disabled `blokkli_comment_html` filter,** and depends on
  the comment module: it was saved before the module stopped adding the filter
  to every format. It does nothing; saving the format again removes it.
