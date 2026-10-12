# Phase 1: Drupal module (paragraphs_blokkli)

## Workflow

- Make sure there are no pending config changes in the database or on disk
- Update to the latest `2.x` version of `paragraphs_blokkli`
- Run the update hooks
- EXPORT the config

The last step is important: The update hooks **WILL** change config schemas or
install new config! If you run `drush deploy` you would immediately revert these
changes again.

## Custom mutation plugins

- Check if the project has any custom `ParagraphMutation` Drupal plugins
- Check if any of them have an ID that matches a mutation provided by
  `paragraphs_blokkli`

### If there ARE ID collisions

=> You have to get creative. Existing mutations in the database will likely
still work, but they will obviously collide with the corresponding feature in
blökkli that uses this mutation. You'll have to rename ID of the custom plugins
and then rewrite the ID of existing mutations in the database to the new ID.
This is a full day task in itself, so if this is the case, do this SEPARATELY
and let the developer know immediately.

## Updated pb_entity_mapping

Updating the Drupal module will update these to the new structure. It is now
possible to define multiple mappings for the same entity type and bundle. For
example, you can now map a `document` media bundle to several paragraph bundles,
for example `link` or `teaser`. That way, a user that drag and drops a document
from the media library in blökkli is presented with the option to either create
a `link` or `teaser`.

## Search providers for import sources are gone

"Import from an existing page" lists the pages itself. An update hook deletes
the search providers of the type "Import Source Entities": their files
(`paragraphs_blokkli_search.blokkli_search_provider.<id>.yml`) leave the config
export with it. The query `pbGetImportSourceEntities` is gone from the GraphQL
schema; a project that called it itself uses `paragraphsBlokkliEntitiesSearch`.

## A preview link is for the preview only

Who opens a preview link ("Preview (with smartphone)") gets the page with its
pending changes: the query `getParagraphsEditState`. The editor's other queries
and mutations now take the permission to edit or to review an edit state from
them too. A project whose own schema extension uses the data producer
`paragraphs_blokkli_can_use_blokkli` for a field that a preview renders maps
`previewGrant` to `TRUE` there, and checks the access to what the field returns.

The edit state itself comes without its owner and its list of changes
(`ownerName`, `uid`, `mutations`, `currentIndex`) for them: these take
`view paragraphs blokkli edit state`.

## Refactored paragraphs_blokkli_comment module

blökkli comments no longer rely on the `comment` core module and instead
implements a custom entity type. This means:

- An update hook automatically migrates all existing comments
- comments now persist across edit states
- CRUD operations for comments, task lists, mentioning users, and many more
  features

Make sure the `paragraphs_blokkli_comment` GraphQL extension is also enabled. If
not used elsewhere, the `comment` entity type can now be disabled in the GraphQL
server config in Drupal.

### Config, Settings and Permissions

- Updating or installing the module installs `filter.format.blokkli_comment`.
  Make sure this config is actually exported!
- The module provides new permissions:
  - `post blokkli comments`
  - `use text format blokkli_comment`
  - `view blokkli comments`

Let the developer know this; don't assign permissions yourself.

The ability to mention users is disabled by default. Users need the
`load id and name of blokkli users` permission. Users with this permission can
load the ID and name of user entities.

By default, user images for comment avatars are not exposed. This has to be
manually enabled in the blökkli settings, key: `use_user_images`.

The list of all pages ("Switch page" in the toolbar, "Import from an existing
page" in the menu) takes the new permission `view any blokkli entity label`.
Without it the editor has neither feature. The list shows the title of every
entity that is edited with blökkli, also of the ones that the user may not view:
the developer decides which roles get it.

## Let the developer know

None of these require changes during the migration. Add them to the progress
file.

### Paragraph bundle descriptions

If any `paragraphs.paragraphs_type.*` bundle config contains a `description`:
This is now displayed in the editor.

This doesn't mean you have to invent a description now. Just let the developer
know that this is a follow-up task that needs to be done.

### Paragraph types come from the module's own query

The editor used to load the paragraph types as entities, which took a
`hook_paragraphs_type_access()` in a custom module (without it, editors got no
paragraph types to add) and `paragraphs_type` among the GraphQL server's entity
types. It now gets them from `pbGetParagraphTypes`. If the project has such a
hook only for the editor, it can be removed, and so can `paragraphs_type` in the
server's entity types and fields, unless the frontend reads it.

### New `review` mode for edit states

Previously there was no way to grant a role the permission to review blökkli
changes. This is now possible with the `review paragraphs blokkli edit state`
permission.

### New paragraphs_blokkli settings

There are a couple of new settings that might be interesting. Point the
developer to the form in the backend: /admin/config/content/blokkli

- `hide_unpublished_paragraphs`: If enabled, unpublished paragraphs are hidden
  outside the editor. This does NOT bypass entity access. It only feeds a
  `isVisible` GraphQL field that blökkli consults. If it is `false`, blökkli
  will hide it when rendered through `<BlokkliField>`.
- `restrict_fields`: Only enable editing through blökkli for specific paragraph
  fields on host entities. An example might be a node where structured data is
  authored through paragraphs, but they are not editable/rendered through
  blökkli. Disabling this field makes blökkli never touch these paragraphs.

## Done when

- Update hooks ran without errors
- Config is exported (including `filter.format.blokkli_comment`)
- Drupal caches are cleared and the GraphQL schema contains the new V2 types
