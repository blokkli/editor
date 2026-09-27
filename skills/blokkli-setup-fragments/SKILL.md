---
name: blokkli-setup-fragments
description: >-
  Set up and write blökkli fragments in a blökkli 2.x + Drupal project: blocks
  without fields of their own, defined in Nuxt with defineBlokkliFragment and
  stored in Drupal as a blokkli_fragment paragraph. Covers the Drupal module and
  GraphQL exposure, where fragment components go, allowed-fragments, the
  preview, options, and fragments that load data (e.g. the latest news or
  upcoming events). Use when a block only renders markup or data from elsewhere,
  or when the "Fragment" action is missing or disabled, the fragment dialog is
  empty, or a fragment renders nothing.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module, paragraphs_blokkli 2.x,
  graphql_core_schema and nuxt-graphql-middleware, plus access to the Drupal
  backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/define-blokkli/fragments
---

# Fragments

A fragment is a block that editors place, but whose content comes from the
frontend: a newsletter form, a list of the latest news, a table of contents. It
has no fields of its own. Drupal stores it as a `blokkli_fragment` paragraph
with the fragment's name, and Nuxt renders the component of that name.

Anything an editor types belongs in a field, and so in a paragraph type (the
`blokkli-add-block-type` skill). A fragment can have options.

The docs: [fragments](https://docs.blokk.li/define-blokkli/fragments),
[`allowedFragments`](https://docs.blokk.li/components/BlokkliField#allowedfragments),
[`previewWidth`](https://docs.blokk.li/define-blokkli/editor#previewwidth),
[fragments are not available](https://docs.blokk.li/modules/drupal/faq#fragments-are-not-available).
This skill is the procedure and the traps.

## 1. Drupal, once per site

- **Enable** `paragraphs_blokkli_fragments`. It installs the paragraph type
  `blokkli_fragment` with the field `field_blokkli_fragment_name`. Keep both
  names: blökkli's mutation uses them.
- **Allow `blokkli_fragment`** in every paragraphs field that may hold
  fragments.
- **GraphQL server:**
  - the bundle `blokkli_fragment` under `bundles`
  - `field_blokkli_fragment_name` under `fields`
- Export the config (`drush cex`), and update the schema in Nuxt. Without the
  type `ParagraphBlokkliFragment`, the Drupal module disables fragments.

**The GraphQL fragment,** spread in the `paragraph` fragment and in every
container's fragment whose field allows fragments:

```graphql
fragment paragraphBlokkliFragment on ParagraphBlokkliFragment {
  name: fieldBlokkliFragmentName
}
```

Keep the alias `name`: blökkli's fragment block reads it.

## 2. The component

With the Drupal module's default `pattern`, put each fragment in
`components/Paragraph/BlokkliFragment/<Name>/index.vue`:

```vue
<template>
  <div class="newsletter">…</div>
</template>

<script lang="ts" setup>
defineBlokkliFragment({
  name: 'newsletter',
  label: 'Newsletter sign-up',
  description: 'The form to sign up for the newsletter.',
  editor: {
    icon: 'bk_mdi_mail',
    previewWidth: 800,
  },
})
</script>
```

- **Outside the `pattern`,** the fragment isn't found. Elsewhere, add a pattern.
  Don't create `Paragraph/BlokkliFragment/index.vue`: blökkli's own block
  renders that bundle.
- **`name`** is what Drupal stores. Renaming it orphans the fragments already
  placed.
- **A static object literal:** no variables or function calls in the argument.
- **`editor.icon`:** fragments don't pick up an `icon.svg` next to the
  component. Use `bk_mdi_<name>` from Material Symbols (rounded).
- **`editor.previewWidth`:** the add dialog renders a real preview at this width
  (default 400). Set it to the width the fragment is designed for.
- **No props.** `defineBlokkliFragment` returns the block's context: `options`,
  `parentType`, `fieldListType`, `provider` (the host).
- **One root element, always rendered while editing.** Show a placeholder when
  there's nothing to show, so that editors can select and move it.

## 3. Allow it in the field

Fragments are allowed per `<BlokkliField>`, in addition to the Drupal field:

```vue
<BlokkliField
  name="field_paragraphs"
  :list="paragraphs"
  :allowed-fragments="['newsletter', 'latest_news']"
/>
```

- **The default is none.** Without the prop, the "Fragment" action can't be used
  in the field, even if Drupal allows `blokkli_fragment`.
- **Both are needed:** the name in `allowed-fragments`, and `blokkli_fragment`
  in the Drupal field.
- Fragments already placed keep rendering when the prop no longer lists them.

## 4. Fragments that load data

The pattern and the rules (setup order, previews, errors) are in the docs:
[fragments that load data](https://docs.blokk.li/define-blokkli/fragments#fragments-that-load-data).
With Drupal and nuxt-graphql-middleware, a list of the latest news:

```graphql
query latestNews($language: String!) {
  news: entityQuery(
    entityType: NODE
    limit: 3
    filter: {
      conditions: [
        { field: "type", value: ["news"] }
        { field: "status", value: ["1"], language: $language }
      ]
    }
    sort: [{ field: "created", direction: DESC }]
  ) {
    items {
      ...nodeTeaser
    }
  }
}
```

```vue
<script lang="ts" setup>
import type { NodeTeaserFragment } from '#graphql-operations'

defineBlokkliFragment({
  name: 'latest_news',
  label: 'Latest news',
  editor: { icon: 'bk_mdi_news', previewWidth: 800 },
})

const language = useCurrentLanguage() // however the app knows the page's language

const { data } = await useAsyncGraphqlQuery(
  'latestNews',
  computed(() => ({ language: language.value })),
)

const items = computed(() =>
  (data.value?.data.news.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)
</script>
```

- **Filter by language** (`language` on the `status` condition). Without it, an
  item without a translation shows in its original language, and one that isn't
  published in the page's language comes back as `null`.
- **Pass the language as a variable** even if the endpoint already depends on
  it: the query's cache key is built from the variables.
- **Filter the items** with a type guard. `items` is typed as `Entity`, and the
  generated type includes `object` and `null`.
- **Dates:** a date field stores UTC without an offset (`Y-m-d\TH:i:s`). For
  "upcoming", compare with today's date at midnight UTC, e.g.
  `{ field: "field_date.end_value", value: [$today], operator: GREATER_THAN_OR_EQUAL }`.
  A value that changes once a day keeps the cache useful.
- **Access:** `entityQuery` checks access. Anonymous visitors need GraphQL
  access to the query, like every other query of the page.

## 5. Options and languages

- **Options** work as on blocks (`options` in the definition). They're stored on
  the `blokkli_fragment` paragraph.
- **Global options such as "Visible languages"** have no effect on fragments.
- **Text in the component** (headings, "No news") isn't translated by Drupal.
  Translate it in the frontend, or leave headings to a title block above the
  fragment.

## 6. Check the result

1. **The schema** has `ParagraphBlokkliFragment` with the name field.
2. **The Nuxt dev server's log** doesn't list fragments among the disabled
   features.
3. **The build** found the fragment: its name is in the generated type
   `BlokkliFragmentName` (`.nuxt/blokkli/definitions.d.ts`).
4. **In the browser, as an editor** (not user 1):
   - drag "Fragment" into the field: the dialog lists the fragment with a
     preview
   - add it, change its options, publish, reload
   - for data: in each language, and with no data (the placeholder while
     editing, nothing when viewing)

## Symptoms and causes

| Symptom                                                      | Cause                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| No "Fragment" action at all                                  | Fragments are disabled (no `ParagraphBlokkliFragment` in the schema), or no field allows `blokkli_fragment` |
| "Fragment" can't be dropped into a field                     | The field's `allowed-fragments` is empty or misses the name                                                 |
| The dialog doesn't list a fragment                           | The name isn't in `allowed-fragments`, or the component isn't collected (outside `pattern`)                 |
| The preview is squeezed into a narrow column                 | `editor.previewWidth` isn't set                                                                             |
| A placed fragment renders nothing                            | Its component isn't collected, or its name was renamed; or `name` isn't aliased in the GraphQL fragment     |
| "No variables and methods are allowed inside the composable" | The argument of `defineBlokkliFragment` isn't a static literal                                              |
| The whole page fails when a fragment's request fails         | The fragment throws in its async setup                                                                      |
| A list fragment shows items in another language, or has gaps | The query doesn't filter by language, or the `null` items aren't filtered out                               |
| The fragment can't be selected or moved while editing        | It renders no element (e.g. `v-if` on the root when there's no data)                                        |
