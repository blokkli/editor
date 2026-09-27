# Drupal Configuration

## Nuxt Module Options

The Drupal module is imported and configured in your `nuxt.config.ts`:

```typescript
import drupal from '@blokkli/editor/drupal'

export default defineNuxtConfig({
  blokkli: {
    modules: [
      drupal({
        templateEditRouteName: 'blokkli-template',
      }),
    ],
  },
})
```

### templateEditRouteName

**Type:** `string`

The name of the Nuxt route used for editing template entities. The route must
have a `uuid` param. Only needed if you use the templates feature.

### Automatic Defaults

The Drupal module sets the following defaults for you:

| Option                   | Default Value                  |
| ------------------------ | ------------------------------ |
| `itemEntityType`         | `'paragraph'`                  |
| `templateEntityType`     | `'blokkli_paragraph_template'` |
| `fromLibraryBlockBundle` | `'from_library'`               |

It also configures `getBundlePropsType` to generate type names like
`ParagraphTextFragment` from the bundle name and look for them in
`#graphql-operations`.

### Feature Detection

At build time, the Drupal module introspects your GraphQL schema to determine
which features are available. If a required GraphQL type or mutation is missing,
the corresponding editor feature is automatically disabled.

For example:

- If `ParagraphsBlokkliComment` doesn't exist in the schema → comments feature
  disabled
- If the `duplicate` mutation isn't available → duplication feature disabled
- If `ParagraphFromLibrary` doesn't exist → library feature disabled
- If `ParagraphBlokkliFragment` doesn't exist → fragments feature disabled
- If `BlokkliParagraphTemplate` or one of its fields `uuid`, `label`,
  `description`, `isDefault` and `paragraphs` doesn't exist → templates feature
  disabled

This means you only need to enable Drupal submodules — the Nuxt side adapts
automatically.

## GraphQL Middleware

The Drupal adapter uses `nuxt-graphql-middleware` for all GraphQL communication.
Configure it to point at your Drupal GraphQL endpoint:

```typescript
export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint: process.env.DRUPAL_GRAPHQL_ENDPOINT,
    downloadSchema: process.env.NODE_ENV === 'development',
    autoImportPatterns: ['graphql/**/*.graphql', 'app/**/*.graphql'],
  },
})
```

::: tip Schema Download

During development, set `downloadSchema: true` so the GraphQL schema is fetched
from Drupal on each build. This ensures type generation stays in sync with your
Drupal configuration.

:::

## Drupal Module Settings

### Main Settings

Configure at `/admin/config/content/blokkli`:

- **Enabled entity types** — Which content types/bundles are editable with
  blökkli
- **Media bundle for images** — Which media type to use for pasted images
- **Media bundle for remote video** — Which media type for YouTube/Vimeo links
- **Clipboard text paragraph** — Which paragraph type to create when pasting
  plain text
- **Hide unpublished paragraphs** — Whether to hide unpublished paragraphs in
  view mode

### Host Options Field

If you use `defineBlokkliProvider()` to define page-level options, the host
entity must have a field of type `paragraphs_blokkli_host_options`. This field
stores the option key-value pairs. Add it to your content type via the Drupal
field UI or programmatically.

The field machine name is flexible — the module automatically discovers the
first field of this type on the host entity.

See [Page Components — Host Options](/modules/drupal/pages#host-options) for the
full setup.

### Entity Mappings

Configure at `/admin/config/content/blokkli/entity-mapping`:

Entity mappings define how external entities (media, nodes) map to paragraph
types. This powers drag-and-drop from the media library and content search.

For example, mapping `media:image` to `paragraph:image` means that when a user
drags an image from the media library, blökkli knows to create an `image`
paragraph and set its media reference field.

### Options Schema

blökkli generates an `options-schema.json` file containing all block option
definitions. Drupal uses it to show the options in its own paragraphs widget
(for example on the node edit form), for users with the
`edit behavior plugin settings` permission. blökkli's own edit forms don't need
it. Drupal doesn't validate option values against it: the editor's mutations
store options as they're sent.

To sync the schema to Drupal, set `schemaOptionsPath` in your Nuxt config to a
path accessible by Drupal. An absolute path is safest: a relative one is
resolved against Nuxt's source directory (`app/` in Nuxt 4).

```typescript
import { fileURLToPath } from 'node:url'

blokkli: {
  schemaOptionsPath: fileURLToPath(
    new URL('../drupal/blokkli-options-schema.json', import.meta.url),
  ),
}
```

Then set the `schema_file` setting in Drupal to the same file. Drupal uses the
path as it is, so a relative path is relative to the web root (e.g.
`../blokkli-options-schema.json`). If the file doesn't exist, Drupal silently
shows no options. Nuxt writes the file whenever it starts or builds. Commit it,
so that Drupal has it where Nuxt doesn't run.

## Drupal Permissions Reference

### Edit State Permissions

| Permission                                                     | Description                                 |
| -------------------------------------------------------------- | ------------------------------------------- |
| `view paragraphs blokkli edit state`                           | View edit states (required for all users)   |
| `create paragraphs blokkli edit state`                         | Create new edit states                      |
| `edit paragraphs blokkli edit state`                           | Perform mutations (add, move, delete, etc.) |
| `review paragraphs blokkli edit state`                         | Review and publish changes                  |
| `take ownership of paragraphs blokkli edit state`              | Transfer edit state ownership               |
| `delete paragraphs blokkli edit state`                         | Delete edit states                          |
| `publish paragraphs blokkli edit state with validation errors` | Publish despite validation errors           |

### Admin Permissions

| Permission                                 | Description                      |
| ------------------------------------------ | -------------------------------- |
| `administer blokkli settings`              | Configure module settings        |
| `administer paragraphs blokkli edit state` | Full admin access to edit states |

## Drupal Submodules

### paragraphs_blokkli_graphql (Required)

Provides the complete GraphQL API. Must always be enabled.

**Depends on:** `graphql_core_schema`

### paragraphs_blokkli_library

For the reusable paragraph library, which comes from Paragraphs'
`paragraphs_library`. It adds the form that sets which paragraph types may
become library items (`/admin/config/content/blokkli/library`), and moves the
library item's canonical URL to `/blokkli/library-item/{id}`, a path the
frontend serves. The editor's "From library" dialog also needs a search provider
of the type "Paragraphs library items".

### paragraphs_blokkli_comment

Adds commenting to edit states. Reviewers can leave comments on changes without
needing edit access. It has its own comment entity type and doesn't need
Drupal's `comment` module.

### paragraphs_blokkli_search

Pluggable content search in the editor. Users can search for and insert existing
content.

### paragraphs_blokkli_conversion

Allows converting between paragraph types (e.g., text to accordion). Requires
field mapping configuration.

### paragraphs_blokkli_transform

Batch transform plugins for applying operations to multiple paragraphs at once.

### paragraphs_blokkli_template

Template system for creating and managing paragraph templates. The editor's
template dialog needs a search provider of the type "Paragraph Templates".

### paragraphs_blokkli_scheduler

Schedule edit states for future publishing. Adds a `publish_on` timestamp to
edit states.

### paragraphs_blokkli_fragments

Support for frontend-defined fragments (see
[Fragments](/define-blokkli/fragments)).

### paragraphs_blokkli_agent

Conversation persistence for the AI agent feature. Stores conversation state in
Drupal.
