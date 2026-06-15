# FAQ & Troubleshooting

Common issues when using blökkli with Drupal and how to solve them.

## The edit button does not appear on the page

For the edit button to appear, three conditions must be met:

1. **The entity type and bundle must be enabled** in the Drupal blökkli settings
   at `/admin/config/content/blokkli/settings`
2. **The user must have the correct permissions** — at minimum
   `view paragraphs blokkli edit state` and `edit paragraphs blokkli edit state`
3. **The `blokkliProps` data must be passed to `<BlokkliProvider>`** — make sure
   your GraphQL query includes the `blokkliProps` field and you spread it onto
   the provider with `v-bind="blokkliProps"`

## Provider / host options do not appear in the editor

If you defined options with `defineBlokkliProvider()` but they don't show up in
the editor, the most likely cause is that the Drupal entity is missing the
**host options field**.

The entity (e.g. a Node of type "Page") must have a field of type
`paragraphs_blokkli_host_options`. Without this field, Drupal has nowhere to
store the option values and the editor will not display them.

Add the field via the Drupal field UI at
`/admin/structure/types/manage/PAGE_TYPE/fields` or programmatically:

```php
FieldStorageConfig::create([
  'field_name' => 'field_blokkli_options',
  'entity_type' => 'node',
  'type' => 'paragraphs_blokkli_host_options',
  'cardinality' => -1,
])->save();

FieldConfig::create([
  'field_name' => 'field_blokkli_options',
  'entity_type' => 'node',
  'bundle' => 'page',
  'label' => 'Blokkli Options',
])->save();
```

See [Host Options](/modules/drupal/pages#host-options) for the full setup.

## A paragraph works in the editor but doesn't render on the page

This usually means the paragraph's GraphQL fragment is missing from a nested
field. A common scenario:

- You have an "accordion" paragraph that contains nested paragraphs
- You add a "text" paragraph inside the accordion in the editor — it works fine
- But on the published page, the text paragraph doesn't render

The cause is that your accordion fragment doesn't include the text fragment in
its nested field. For example:

```graphql
# This is BROKEN — paragraphText is missing!
fragment paragraphAccordion on ParagraphAccordion {
  title: fieldTitle
  paragraphs: fieldParagraphs {
    ...paragraphsFieldItem
    props {
      ...paragraphTitle
    }
  }
}
```

Fix it by adding all paragraph bundle fragments that are allowed in that field:

```graphql
# Fixed — all allowed bundles are included
fragment paragraphAccordion on ParagraphAccordion {
  title: fieldTitle
  paragraphs: fieldParagraphs {
    ...paragraphsFieldItem
    props {
      ...paragraphTitle
      ...paragraphText
    }
  }
}
```

::: warning

You **cannot** use the `...paragraph` union fragment inside nested paragraph
fragments — that would create a recursive fragment reference. You must list each
allowed bundle fragment explicitly.

:::

## GraphQL build fails with "Unknown fragment" errors

If you see errors like `Unknown fragment "paragraphText"`, make sure:

1. The fragment file exists and follows the naming convention (e.g.
   `fragment paragraphText on ParagraphText`)
2. The file is in a directory matched by your
   `graphqlMiddleware.autoImportPatterns` config
3. The Drupal paragraph type exists and is exposed in the GraphQL schema

## Editable field changes are lost after page refresh

You edit a field (e.g. the lead text via `v-blokkli-editable:field_lead`), it
updates live in the editor, but when you refresh the page the change is gone.

This means the field is missing from your `pbMutatedEntity` fragment. During
editing, the adapter fetches the mutated entity using this fragment to get the
current field values. If a field isn't listed there, the adapter can't fetch the
updated value.

For example, if your page component has:

```vue
<BlokkliEditable name="field_lead" :value="entity.lead" v-slot="{ value }">
  <div v-html="value" />
</BlokkliEditable>
```

Then `pbMutatedEntity` **must** include `field_lead`:

```graphql
fragment pbMutatedEntity on Entity {
  ... on NodePage {
    title
    lead: fieldLead # Without this, lead edits won't persist across refreshes
  }
}
```

Note that you should only include fields in `pbMutatedEntity` that can actually
change during editing (editable fields, host options). Including the full node
fragment would be wasteful since it contains many fields that never change
(paragraph references, media, computed fields, etc.).

## Undo/redo is not working

Undo/redo requires the `setHistoryIndex` mutation to be available in the GraphQL
schema. Make sure `paragraphs_blokkli_graphql` is enabled and the schema is up
to date.

If using schema download in development, restart the dev server after enabling
new Drupal submodules to re-fetch the schema.

## Features are missing (library, comments, media, etc.)

The Drupal adapter detects available features by introspecting the GraphQL
schema at build time. If a feature is missing:

1. Enable the corresponding Drupal submodule (e.g. `paragraphs_blokkli_library`)
2. Enable the submodule's **GraphQL schema extension** — just enabling the
   submodule may not be enough, the GraphQL types must also be exposed in your
   schema
3. Clear Drupal caches (`drush cr`)
4. Rebuild the Nuxt project so the schema is re-fetched

See [Configuration — Drupal Submodules](/modules/drupal/configuration#drupal-submodules)
for the full list.

## Fragments are not available

If fragments don't appear at all in the editor, check:

1. The `paragraphs_blokkli_fragments` Drupal submodule must be enabled
2. The paragraph field in Drupal must allow `blokkli_fragment` (or whatever you
   configured as `fragmentBlockBundle`) as a valid paragraph bundle

If the "add fragment" action appears in the editor but a specific fragment is
missing from the list, the fragment name is not included in the
`allowed-fragments` prop on `<BlokkliField>`:

```vue
<BlokkliField
  name="field_paragraphs"
  :list="paragraphs"
  :allowed-fragments="['cta', 'hero']"
/>
```

See [Fragments](/define-blokkli/fragments) for the full setup.

## Scheduling options don't appear on paragraphs

The `paragraphs_blokkli_scheduler` submodule must be enabled, but that alone is
not enough. Scheduling must also be **enabled per paragraph type** in the Drupal
paragraph type settings. This is how the underlying scheduler module works and
is not blökkli-specific.

## "Another user is currently editing" / ownership conflict

blökkli uses an ownership system — only one user can edit an entity at a time.
If another user's edit state exists, you'll see this message.

The user with the `take ownership of paragraphs blokkli edit state` permission
can take over the edit state. This discards any unpublished changes from the
previous owner.
