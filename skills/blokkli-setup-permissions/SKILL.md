---
name: blokkli-setup-permissions
description: >-
  Set up roles and permissions for blökkli in a Drupal project: who may open the
  editor, edit and publish, review and comment, translate, and use which
  paragraph types (paragraphs_type_permissions), plus the library, templates,
  scheduling, media, config pages and GraphQL. Use when giving editors,
  reviewers or translators access, when a role must not use some paragraph
  types, or when an editor sees no paragraph types, sees the editor read-only,
  can't publish or comment, or paragraphs vanish from pages.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export).
metadata:
  author: blokkli
  version: '1.0.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/configuration#drupal-permissions-reference
---

# Permissions

Work out which roles need what, and tell the developer. Don't assign permissions
yourself: roles are the site owner's decision.

The full list of blökkli's permissions is in the
[configuration docs](https://docs.blokk.li/modules/drupal/configuration#drupal-permissions-reference).
This skill is about how they combine.

## 1. What the editor shows

A page's `blokkliProps` returns the user's edit permissions (`view`, `review`,
`edit`, `delete`). The editor opens for any of them; what it allows depends on
which:

| Drupal permissions                                                                  | Editor                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `view` + `edit paragraphs blokkli edit state`, and update access to the host entity | edits and publishes, as the edit state's owner           |
| `view` + `review paragraphs blokkli edit state`                                     | read-only, with comments ("review mode")                 |
| `view paragraphs blokkli edit state` alone                                          | nothing useful: the GraphQL API needs `edit` or `review` |

- **Publishing has no permission of its own.** It needs `edit`, update access to
  the host and ownership of the edit state. A reviewer who publishes needs edit
  rights too; "review" doesn't publish.
- **One edit state per page, one owner.** Others see it read-only ("This page is
  currently being edited by …") and take over with
  `take ownership of paragraphs blokkli edit state`.
- **The first user to open a page with changes creates the edit state**
  (`create paragraphs blokkli edit state`). A reviewer can't, so they can only
  comment on pages with pending changes.

## 2. Paragraph types

**Let blökkli's users view paragraph types.** The editor loads them through
GraphQL, which only returns the types a user may view, and Paragraphs allows
that only with `administer paragraphs types`. Without a hook, editors get no
paragraph types at all. In a custom module:

```php
#[Hook('paragraphs_type_access')]
public function access(ParagraphsTypeInterface $type, string $operation, AccountInterface $account): AccessResultInterface {
  if ($operation !== 'view') {
    return AccessResult::neutral();
  }
  return AccessResult::allowedIfHasPermission($account, 'view paragraphs blokkli edit state');
}
```

**Per paragraph type,** with Paragraphs' `paragraphs_type_permissions` module
(part of `drupal/paragraphs`):

- `create paragraph content <type>`: the editor hides types without it, and the
  mutations refuse them.
- `update paragraph content <type>`: without it, the paragraph and everything
  nested in it is read-only. To keep a role from adding sections but let it edit
  texts inside existing ones, grant update, not create.
- `delete paragraph content <type>`.
- `view paragraph content <type>`: for **everyone who sees pages**, including
  anonymous visitors when pages are rendered for them. Without it, paragraphs
  disappear from pages.
- `bypass paragraphs type content access` for the roles without limits.
- **Every new paragraph type needs its permissions,** or it's invisible.

Templates and library items can contain types a role may not create: adding one
doesn't check each paragraph inside. Don't rely on per-type permissions where
templates or library items contain the denied types.

## 3. A proposal per role

Adapt it to the project. "Host types" means every entity bundle that's edited
with blökkli (e.g. `page`, `news`).

**Everyone who works in the editor:**

- `view paragraphs blokkli edit state`
- comments: `view blokkli comments`, `post blokkli comments`,
  `load id and name of blokkli users` (mentions), see the
  `blokkli-setup-comments` skill
- `view unpublished paragraphs`, and scheduler's `view scheduled content` and
  `view scheduled paragraph` if scheduling is used
- `view the administration theme`: blökkli opens Drupal's forms (add, edit,
  translate)
- the AI agent, if it's set up: `use paragraphs blokkli agent` (see the
  `blokkli-setup-agent` skill). The agent can't do more than its user.
- GraphQL access (`execute <server id> arbitrary graphql requests`)

**Editor** (edits and publishes):

- `create`, `edit` and `delete paragraphs blokkli edit state`,
  `take ownership of paragraphs blokkli edit state`
- per host type: `create <type> content`, `edit any <type> content`, and delete
  and revision permissions as the site needs
- `bypass paragraphs type content access`, or per-type permissions
- media: `create <media type> media`, `edit own <media type> media`,
  `access media overview`
- library: `create paragraph library item`, `edit paragraph library item`
- templates: `view paragraph templates`, `create paragraph template`,
  `edit own paragraph template`, `delete own paragraph template`
- scheduling: `schedule publishing of nodes`, `schedule publishing of paragraph`
- config pages edited with blökkli: their module's edit permission (e.g.
  `manage translatable config pages`)

**Reviewer** (reads and comments): the permissions everyone needs, plus
`review paragraphs blokkli edit state` and revision viewing.

**Translator:**

- the editor's edit state permissions (translation happens in the edit state)
- `translate <type> node` per host type, `create content translations`,
  `update content translations`, `translate paragraph`
- `edit any <type> content`: editing in blökkli needs update access to the host.
  So a translator can also change the source language; Drupal core can't limit
  that to translations.
- `bypass paragraphs type content access` (or update per type)

**Admins only:** `administer …`, `manage default paragraph templates`,
`manage all blokkli agent conversations`,
`publish paragraphs blokkli edit state with validation errors` (it skips
validation), `transfer blokkli paragraphs` (copy and paste between pages) unless
editors should have it.

## 4. Media

- The media permissions control Drupal's media forms and library.
- blökkli's paste and drop of images and files creates media without checking
  `create <media type> media`: any user who may edit the page can upload. Don't
  rely on media permissions to prevent uploads.

## 5. Check it

Log in as a user of each role (`drush uli --name="<user>"`) and open a page in
the editor:

1. **Editor:** the add list shows the allowed paragraph types; adding, editing
   and publishing work.
2. **Restricted role:** the denied types are missing from the add list, and
   texts inside an existing paragraph of such a type are still editable.
3. **Reviewer:** "You are in review mode", comments work, Publish is disabled.
4. **Translator:** in their language the editor is in translation mode (texts
   only).
5. **A logged-in user without a role:** the published page shows all its
   paragraphs.
6. The permissions page (`/admin/people/permissions`) is 403 for all of them.

## Traps, by symptom

- **An editor gets no paragraph types to add (admins do):** no view access to
  paragraph types (section 2).
- **One paragraph type is missing from the add list:** no
  `create paragraph content <type>`, e.g. for a new type.
- **Paragraphs vanish from pages for some users:** no
  `view paragraph content <type>`.
- **"You are in review mode" for an editor:** no `edit … edit state`, or no
  update access to the host entity.
- **"This page is currently being edited by …":** another user owns the edit
  state; take it over.
- **Publish is disabled:** not the owner, or no edit rights.
- **A reviewer can't comment:** nobody has changed the page yet, so there's no
  edit state; or `post blokkli comments` is missing.
- **Nested paragraphs are read-only:** the parent's type has no update
  permission.
- **A translator can edit the source language:** expected (section 3).
