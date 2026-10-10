---
name: blokkli-setup-drupal
description: >-
  Set up blökkli on a Drupal backend with a decoupled Nuxt frontend: the
  paragraphs_blokkli modules and settings, the graphql_core_schema server,
  permissions, nuxt-graphql-middleware, the Drupal module of @blokkli/editor,
  the required fragments and the page components. Use when adding blökkli to a
  Drupal + Nuxt project, making another project's setup match it, or when the
  editor doesn't start, offers no paragraph types, or features are missing
  because the GraphQL schema lacks them.
license: MIT
compatibility: >-
  Requires @blokkli/editor 2.x with the drupal module, paragraphs_blokkli 2.x,
  graphql_core_schema and nuxt-graphql-middleware, plus access to the Drupal
  backend (composer, drush) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.8'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/overview
---

# blökkli with Drupal

The Drupal module of `@blokkli/editor` reads the Drupal GraphQL schema at build
time and enables only the features the schema supports. So the order is always:
Drupal first, then the schema, then Nuxt. A Nuxt change can't make up for a
missing type in the schema.

blökkli's editor and API call paragraphs "blocks", but in Drupal a block is
something else, so these skills say paragraph, paragraph type and paragraphs
field.

The [blökkli starterkit](https://www.drupal.org/project/blokkli_starterkit) has
all of this set up. If the project is based on it, compare against it instead of
building from scratch.

The docs cover fragments, page and paragraph components in more detail:
[Getting started](https://docs.blokk.li/modules/drupal/getting-started),
[GraphQL fragments](https://docs.blokk.li/modules/drupal/graphql),
[page components](https://docs.blokk.li/modules/drupal/pages),
[configuration](https://docs.blokk.li/modules/drupal/configuration) and the
[FAQ](https://docs.blokk.li/modules/drupal/faq). This skill is the procedure and
the parts the docs don't cover.

## Before you start

Find out, from the code and config or by asking:

- which entity types and bundles become editable (usually node bundles), and
  which paragraphs fields they have
- the languages, and how Drupal negotiates them (a URL prefix per language is
  common)
- whether Drupal and Nuxt already share one origin, and how requests are routed
- where the Nuxt project gets its GraphQL schema from (download or a file)

## 1. One origin for Drupal and Nuxt

The editor opens Drupal's forms in iframes (`/paragraphs_blokkli/…`, the entity
forms) and works with them directly, so Drupal and Nuxt must be served from the
same origin. A reverse proxy sends Drupal's paths to Drupal and everything else
to Nuxt.

Drupal needs at least, with an optional language prefix: `graphql`,
`paragraphs_blokkli`, `admin`, `user`, `media`, `media-library`, `system`,
`batch`, `core`, `modules`, `themes`, `libraries`, `sites`, `ckeditor5`,
`editor`, `filter`, `entity_reference_autocomplete`, `big_pipe`, `*.php`, and
the entity forms (`/node/add/…`, `/node/<id>/edit`, …). The canonical entity
pages (`/node/<id>`) and `/blokkli/…` go to Nuxt.

Anchor the rules at a path segment, so that `/users` or `/media-kit` stay with
Nuxt. The starterkit's route list
(`scripts/nginx-conf-generator/config/base.yml`) is a complete example.

## 2. Drupal modules

```bash
composer require drupal/paragraphs_blokkli drupal/graphql_core_schema
drush en paragraphs_blokkli paragraphs_blokkli_graphql
```

- `paragraphs_blokkli` depends on core `media`, which `drush en` installs with
  it.
- Feature submodules (library, comments, search, templates, …) have their own
  skills and docs: `blokkli-setup-library`, `blokkli-setup-fragments`,
  `blokkli-setup-templates`, `blokkli-setup-publishing` (scheduling, revisions,
  preview grants), `blokkli-setup-translations` (content translation, DeepL,
  outdated translations), `blokkli-setup-search` (the editor's content search),
  `blokkli-setup-charts` (charts and their data sources), `blokkli-setup-agent`
  (the AI agent, its skills, tools and prompts), `blokkli-setup-comments`
  (comments, mentions, notifications) and `blokkli-setup-permissions` (roles,
  per-type permissions). Custom transforms and conversions:
  `blokkli-write-drupal-plugin`. Start with the base; add features once the
  editor works.

## 3. Paragraphs fields

- Set up paragraphs as usual: the host's paragraphs field
  (`entity_reference_revisions`) isn't translatable, the paragraph types' fields
  are.
- **List the allowed paragraph types explicitly on every paragraphs field**,
  nested ones included. A field that allows "all types" (no `target_bundles`) is
  reported to the editor as allowing none, so it offers no paragraph types.
- Add `blokkli_fragment` (from `paragraphs_blokkli_fragments`) and
  `from_library` (from `paragraphs_library`) to the allowed types where those
  features should work.

## 4. blökkli settings

At `/admin/config/content/blokkli` (config `paragraphs_blokkli.settings`):

- **Enabled types:** the entity types and bundles blökkli edits. The editor
  doesn't start for anything else.
- **Media bundles** for pasted images, remote videos and files, and the image
  style for previews.
- **Clipboard text paragraph:** the paragraph type and field for pasted text.

At `/admin/config/content/blokkli/entity-mapping` (config
`paragraphs_blokkli.pb_entity_mapping.*`): map each media type to the paragraph
type and field that holds it. Dragging from the media library and pasting files
use these mappings.

Watch out for:

- **Uploads:** pasted and dropped files go through core's upload handling, as in
  a form. The media field's extensions, maximum size and directory (tokens
  included) apply. The file is the request's body, so PHP's `post_max_size` and
  the web server's body size (nginx's `client_max_body_size`) limit it too.
- **The upload dialog's fields:** the media type's `media_library` form display
  decides them. Put the name and the alt text there. The dialog shows text
  fields, text areas, checkboxes, selects and radios; a visible required field
  of another widget means no uploads of that media type. With the Focal Point
  module's widget (`image_focal_point`) on the image field, the focal point is
  set on the image's preview.
- **Text formats:** pasting text into a text field without allowed formats
  fails. Set its allowed formats.
- **Link fields that a mapping targets:** blökkli sets the link title to the
  paragraph's label and overwrites titles on replace. Turn the link title off
  and put the text in its own field.

Export the config (`drush cex`).

## 5. The GraphQL server

At `/admin/config/graphql`, edit the server (schema "Core Composable"):

- **Extensions:** `paragraphs_blokkli_edit` is required. Each feature submodule
  adds its own (`paragraphs_blokkli_library`, `paragraphs_blokkli_comment`, …).
  The frontend usually also needs `routing` (the `route` query), and `image` and
  `media` for image derivatives and file URLs.
- **Entity types:** the host types (e.g. `node`), `paragraph`,
  `paragraphs_blokkli_edit_state`, plus what the features and the frontend read
  (`media`, `file`, `user`, `paragraphs_library_item`,
  `blokkli_paragraph_template`).
- **Bundles:** list **every** bundle the frontend queries: each paragraph type
  (including `blokkli_fragment` and `from_library`), the host bundles, the media
  types. graphql_core_schema only generates a type such as `ParagraphText` for
  listed bundles; the others become `…Unexposed` types without fields. Without
  `ParagraphBlokkliFragment` and `ParagraphFromLibrary`, the fragments and
  library features are disabled.
- **Fields:** every field the frontend reads. On the edit state, at least
  `mutations` and `current_index`.

A known-good excerpt of `graphql.graphql_servers.<id>.yml`:

```yaml
schema: core_composable
schema_configuration:
  core_composable:
    extensions:
      paragraphs_blokkli_edit: paragraphs_blokkli_edit
      routing: routing
      image: image
      media: media
    enabled_entity_types:
      node: 1
      paragraph: 1
      paragraphs_blokkli_edit_state: 1
      media: 1
      file: 1
    fields:
      node:
        title: title
        field_paragraphs: field_paragraphs
      paragraph:
        behavior_settings: behavior_settings
        field_text: field_text
      paragraphs_blokkli_edit_state:
        current_index: current_index
        host_entity_type: host_entity_type
        host_entity_uuid: host_entity_uuid
        mutations: mutations
    bundles:
      node:
        page:
          enabled: true
      paragraph:
        text:
          enabled: true
        blokkli_fragment:
          enabled: true
```

Export the config, then `drush cr`.

## 6. Permissions

Tell the developer which roles need what, and let them decide. Don't assign
permissions yourself.

- **GraphQL:** whoever Nuxt queries Drupal as needs access to the server:
  `execute <server id> arbitrary graphql requests`, or another mechanism the
  project uses (e.g. a token that only opens the endpoint). Editors need it;
  anonymous visitors only if pages are rendered for them.
- **Edit states:** `view`, `create` and `edit paragraphs blokkli edit state` to
  edit and publish (with update access to the host);
  `review paragraphs blokkli edit state` to open the editor read-only and
  comment; `take ownership of paragraphs blokkli edit state` to take over
  another user's changes. The full list is in the
  [configuration docs](https://docs.blokk.li/modules/drupal/configuration#drupal-permissions-reference).
- **Paragraph types:** users without `administer paragraphs types` can't view
  them, so the editor offers them none. Grant view access in a custom module
  (`hook_paragraphs_type_access()`, in the `blokkli-setup-permissions` skill).
- **Content:** editors also need the usual permissions to edit the host entity
  and to use its media, and create access to the media types of pasted and
  dropped files (`create image media`).
- Roles for editors, reviewers and translators, and per-type permissions: the
  `blokkli-setup-permissions` skill.

## 7. The schema in Nuxt

`nuxt-graphql-middleware` builds its types from the schema, and the blökkli
Drupal module decides from it which features to enable. After any change to the
GraphQL server, a module or its config: `drush cr`, get the new schema, restart
the Nuxt dev server.

- **Download** (`downloadSchema: true` in dev): the dev server needs access to
  the endpoint (see Permissions). When the download fails, the dev server asks
  on the terminal whether to use the schema on disk, which hangs non-interactive
  runs.
- **Dump:** `drush graphql:dump <server id> /absolute/path/schema.graphql`
  writes the schema without HTTP access. drush resolves relative paths against
  the Drupal root. Commit the file and set `downloadSchema: false`.

## 8. Nuxt config

`nuxt-graphql-middleware` must come **before** `@blokkli/editor`. Otherwise the
Drupal module throws "Failed to initialise blökkli Drupal module".

```typescript
import drupal from '@blokkli/editor/drupal'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware', '@blokkli/editor'],

  graphqlMiddleware: {
    graphqlEndpoint: 'http://drupal.local/graphql',
    downloadSchema: false,
    schemaPath: './schema.graphql',
    autoImportPatterns: ['./app/**/*.graphql'],
  },

  blokkli: {
    modules: [drupal({ templateEditRouteName: 'blokkli-template' })],
  },
})
```

The Drupal module sets `itemEntityType`, the component patterns
(`~/components/Paragraph/**`, `~/components/Node/**`, …) and the edit adapter.

### If the project has no decoupled setup yet

blökkli doesn't need anything special here, but the editor breaks in confusing
ways without it. In `server/graphqlMiddleware.serverOptions.ts`:

- **Language:** if Drupal negotiates the language by URL prefix, request
  `/<langcode>/graphql` for the current page's language. Pass the language from
  the client with `buildClientContext` in
  `app/graphqlMiddleware.clientOptions.ts`; the blökkli adapter's requests go
  through the same options.
- **Forward** the `cookie`, `x-forwarded-host` and `x-forwarded-proto` headers
  to Drupal, and pass Drupal's `set-cookie` back. Without the proto, Drupal on
  https looks for the wrong session cookie (`SESS…` instead of `SSESS…`), and
  the request runs as anonymous.
- **Keep Drupal's status:** by default every Drupal error becomes a 500. Throw
  `createError({ statusCode: error.statusCode })` in `onServerError`, so that a
  403 stays a 403.

The editor only runs in the browser. Many projects render pages for logged-in
users client-side only (the starterkit's `server/middleware/spa.ts` sets
`event.context.nuxt.noSSR` for a Drupal session cookie).

## 9. Fragments

The app must define two fragments with exactly these names, because the module's
own documents spread them:

```graphql
# Every paragraph type's fragment.
fragment paragraph on Paragraph {
  ...paragraphText
  ...paragraphImage
}

# The host fields that can change while editing.
fragment pbMutatedEntity on Entity {
  ... on NodePage {
    title
    lead: fieldLead
  }
  # Only with paragraphs_library.
  libraryItemLabel: label
}
```

- Name each paragraph type's fragment `paragraph<PascalCaseBundle>`
  (`two_columns` → `paragraphTwoColumns`). The component's props type is derived
  from it (`ParagraphTwoColumnsFragment`).
- Nested paragraphs fields list the allowed bundle fragments explicitly:
  `...paragraph` inside a paragraph fragment is recursive.
- Every field the host component makes editable must be in `pbMutatedEntity`, or
  edits vanish on reload.

The host's fragment uses the module's `blokkliProps` and `paragraphsFieldItem`:

```graphql
fragment nodePage on NodePage {
  uuid
  title
  lead: fieldLead
  blokkliProps {
    ...blokkliProps
  }
  paragraphs: fieldParagraphs {
    ...paragraphsFieldItem
    props {
      ...paragraph
    }
  }
}
```

## 10. Components and routes

**The host component** renders `BlokkliProvider` with the host's data, and a
`BlokkliField` per paragraphs field:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <h1 v-blokkli-editable:title>{{ entity.title }}</h1>
    <p v-blokkli-editable:field_lead>{{ entity.lead }}</p>
    <BlokkliField name="field_paragraphs" :list="paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<NodePageFragment>()
</script>
```

- Render text and media from the slot's `entity`: while editing, it holds the
  changed values.
- More hosts (other bundles, several paragraphs fields, config pages): the
  `blokkli-add-host` skill.
- `v-blokkli-editable:<field>` edits a host text field inline,
  `v-blokkli-droppable:<field>` makes a host media or reference field a drop
  target.

**Paragraph components** go in
`components/Paragraph/<PascalCaseBundle>/index.vue` with
`defineBlokkli({ bundle: '<bundle>' })`. See
[paragraph components](https://docs.blokk.li/modules/drupal/blocks).

**Routes:**

- The editor starts on the host's own page (with `?blokkliEditing=<uuid>`), so
  the page that renders the host must render its host component.
- **Library items** (with `paragraphs_library`): a page at
  `blokkli/library-item/[uuid]`, which must also load by id. See the
  `blokkli-setup-library` skill.
- **Templates:** see the `blokkli-setup-templates` skill.

**The edit adapter:** the Drupal module brings its own. Add
`app/blokkli.editAdapter.ts` only to extend it:

```typescript
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import drupalAdapter from '#blokkli/drupal-adapter'

export default defineBlokkliEditAdapter(async (ctx) => {
  const adapter = await drupalAdapter(ctx)
  return {
    ...adapter,
    // e.g. getAnalyzers, getGridMarkup
  }
})
```

## 11. Check the result

1. **The schema** has `ParagraphsBlokkliEditState`,
   `ParagraphsEditMutationState` and a `Paragraph<PascalCaseBundle>` type for
   every paragraph type, none of them `…Unexposed`.
2. **The Nuxt dev server's log:** recent versions of the Drupal module log
   either "The Drupal GraphQL schema supports all features." or "Features
   disabled because the Drupal GraphQL schema lacks support for them: …". In
   older versions, compare the schema with the
   [feature detection](https://docs.blokk.li/modules/drupal/configuration#feature-detection).
3. **In the browser,** as an editor (not user 1, who bypasses permissions): the
   edit button appears on a host page, the editor starts, its add list offers
   the allowed types, a change survives a reload, and publishing works.

## Symptoms and causes

| Symptom                                                                   | Cause                                                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| No edit button                                                            | Bundle not in the enabled types, missing permissions, or `blokkliProps` not bound         |
| The editor offers no paragraph types                                      | The paragraphs field allows "all types"; list them                                        |
| The editor offers no paragraph types to editors, only to admins           | They can't view paragraph types (section 6)                                               |
| `Unknown type "ParagraphXyz"`, or a `…Unexposed` type                     | The bundle is missing from the GraphQL server's `bundles`                                 |
| A field is missing from the schema                                        | It's missing from the server's `fields`                                                   |
| "Failed to initialise blökkli Drupal module"                              | `nuxt-graphql-middleware` isn't before `@blokkli/editor`                                  |
| `Unknown fragment "paragraph"` or `"pbMutatedEntity"`                     | The app doesn't define them, or `autoImportPatterns` misses the file                      |
| A host field's edit is lost on reload                                     | The field is missing from `pbMutatedEntity`                                               |
| A feature is missing in the editor                                        | Its submodule or GraphQL extension isn't enabled, or the schema in Nuxt is stale          |
| Adding a paragraph fails unless it opens the form                         | The paragraph type has a required field: blökkli can't set values when adding it directly |
| Pasted text fails                                                         | The text field has no allowed formats                                                     |
| A pasted file is refused                                                  | The media field's allowed extensions or maximum size                                      |
| SSR renders as anonymous, or everything is a 500                          | Cookies or `X-Forwarded-*` not forwarded, or `onServerError` swallows Drupal's status     |
| The dev server hangs on "continue with the previously downloaded schema?" | The schema download failed; fix access or use a dumped schema                             |
