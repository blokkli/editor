---
name: blokkli-setup-templates
description: >-
  Set up paragraph templates in a blökkli 2.x project: the
  paragraphs_blokkli_template Drupal module, its GraphQL exposure and
  permissions, and the Nuxt route used to edit templates. Use when the user
  wants reusable multi-paragraph starting points, default contents for new
  paragraphs, or asks about blökkli templates.
license: MIT
compatibility: >-
  Requires @blokkli/editor 2.x with the drupal module and paragraphs_blokkli
  2.x, plus access to the Drupal backend (drush) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li
---

# Paragraph templates (paragraphs_blokkli_template)

Implements a new entity type to host paragraph templates. Unlike
`paragraphs_library`, templates are **not** reusable: They can only be copied
into edit states and they support multiple paragraphs at once.

## Drupal setup

To enable, install the module itself, then enable the GraphQL extension with the
same name. Then enable the `blokkli_paragraph_template` in the GraphQL config
and expose these fields:

- changed
- created
- description
- is_default
- paragraphs
- uid

Export the config afterwards.

## Permissions

The module provides a couple of permissions. By default, no templates can be
created or used without the matching permissions.

In general, users who already have the permission to edit blökkli edit states
can also get the permission to view templates. Let the developer know and decide
who may receive these permissions; don't assign permissions yourself.

The `manage default paragraph templates` should likely only be given to
administrators: It allows promoting a template as the default for new paragraphs
added via blökkli. For example:

- Assuming there is a `two_columns` paragraph with a `field_paragraphs_left` and
  `field_paragraphs_right` field
- In blökkli, a user with that role can set up a `two_columns` paragraph, add
  nested children (e.g. an image on the left and a text on the right)
- they select the paragraph and pick "create a template"
- There, they have the option to promote it as the default for new paragraphs

Now, every time a user adds a `two_columns` paragraph, it is automatically
populated with a matching template.

## Frontend setup

In order to be able to edit templates: Create a Nuxt page component that renders
the `paragraphs_blokkli_template` entity standalone:

```vue
<template>
  <BlokkliDrupalEditTemplate :uuid />
</template>

<script setup lang="ts">
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

definePageMeta({
  layout: 'library',
  name: 'blokkli-template',
})

const route = useRoute()

const uuid = computed<string>(() => {
  if (route.params.uuid && typeof route.params.uuid === 'string') {
    return route.params.uuid
  }

  return ''
})

if (!uuid.value) {
  throw createError('Missing UUID.')
}
</script>
```

Then, in `nuxt.config.ts`, tell blökkli the name of the route:

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

blökkli will now open this route as a nested editor session when a user wants to
edit a template.
