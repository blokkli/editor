---
name: blokkli-setup-host-options
description: >-
  Add options to host entities (e.g. a page's header variant) in a blökkli 2.x +
  Drupal project: a paragraphs_blokkli_host_options field in Drupal and
  defineBlokkliProvider in Nuxt. Use when the user wants page-level options that
  editors change in the blökkli editor like paragraph options, or when host
  options aren't saved, disappear after saving the Drupal form, or don't show in
  the editor.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.1.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/components/BlokkliProvider#defineblokkliprovider
---

# Host options

Paragraphs have options, and so can the host: the node or other entity whose
paragraphs are edited. Editors change them like a paragraph's options, by
clicking the page instead of a paragraph. Typical uses are a header variant or
whether an anchor navigation shows.

An option has one value for all languages. Text that editors write belongs in a
field, not in an option.

The docs:
[`defineBlokkliProvider`](https://docs.blokk.li/components/BlokkliProvider#defineblokkliprovider),
[host options with Drupal](https://docs.blokk.li/modules/drupal/pages#host-options).

## 1. The field in Drupal

Add a field of type `paragraphs_blokkli_host_options` to every host bundle that
gets options (label e.g. "Options"):

- **Name:** any. blökkli uses the first field of this type on the entity.
- **Cardinality:** the field type enforces unlimited, one item per option,
  whatever the storage config says.
- **Translatable:** no.
- **Hide it in the form display.** Its widget is empty: if the field is in the
  form, saving the entity's form deletes every option. That's the form in Drupal
  and the "Edit" form the editor opens for the host, which is the same form.
- **The GraphQL server needs nothing.** The values come through
  `blokkliProps.hostOptions`, and blökkli writes them with its own mutation.

Export the config (`drush cex`).

## 2. The provider in Nuxt

Call `defineBlokkliProvider` in the component that renders the host's
`<BlokkliProvider>`, and pass the values on as props:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <PageHeader :title="entity.title" :variant="options.header" />
    <BlokkliField name="field_paragraphs" :list="paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<NodePageFragment>()

const { options } = defineBlokkliProvider(props, {
  entityType: 'node',
  bundle: 'page',
  options: {
    header: {
      type: 'radios',
      label: 'Header',
      default: 'image',
      options: {
        image: 'Image above the title',
        overlay: 'Title on the image',
        plain: 'No image',
      },
    },
  },
})
</script>
```

- **The first argument is the props.** `defineBlokkliProvider` reads
  `blokkliProps.hostOptions` from them, so the host's fragment needs
  `blokkliProps { ...blokkliProps }`, which every editable host has.
- **`entityType` and `bundle`** are Drupal's machine names of the host.
- **In the provider's component, not in a child.** The editor looks the options
  up where the `BlokkliProvider` is.
- **The file must match the module's `pattern`,** or the definition isn't
  collected and `options` stays empty. The Drupal module's default covers
  `~/components/{Paragraph,Node,TaxonomyTerm,CommerceProduct,Storage}/**/*.vue`.
  Add a pattern for hosts elsewhere, e.g. config pages.
- **The option types** are those of paragraph options (radios, checkbox, …). The
  values are stored as strings.

## 3. Check the result

1. In the editor, click the page outside every paragraph: the options show.
2. Change one, publish, and reload: the value is kept, and the page renders it.
3. Save the entity's form in Drupal without changes: the value is still kept.

## Symptoms and causes

| Symptom                                                  | Cause                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| The options show in the editor, but reset after a reload | The host bundle has no `paragraphs_blokkli_host_options` field. The editor's form comes from Nuxt, and the save silently does nothing |
| The options are gone after saving the entity's form      | The field is in the form display                                                                                                      |
| No options when clicking the page                        | `defineBlokkliProvider` isn't called, its file doesn't match `pattern`, or `entityType`/`bundle` differ from the host's               |
| The option changes in the editor, but the page doesn't   | `defineBlokkliProvider` is called in a child component, or the template reads the option from somewhere else                          |
