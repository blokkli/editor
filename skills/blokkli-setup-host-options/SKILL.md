---
name: blokkli-setup-host-options
description: >-
  Add blökkli behavior settings (options) to host entities such as nodes in a
  blökkli 2.x project, using a paragraphs_blokkli_host_options field and
  defineBlokkliProvider. Use when the user wants page-level options (e.g. header
  size, theme variant) that are editable in the blökkli editor, just like
  paragraph options.
license: MIT
compatibility: >-
  Requires @blokkli/editor 2.x with the drupal module and paragraphs_blokkli
  2.x, plus access to the Drupal backend and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://blokk.li
---

# Host entity options

It's possible to define behavior settings (options) for _host entities_, not
just for paragraphs.

## Drupal setup

The host entity must have a field of type `paragraphs_blokkli_host_options`.
This is where blökkli stores the serialized options, similar to how paragraphs
does it. No other configuration is needed in Drupal. Export the config after
adding the field.

## Frontend setup

Call `defineBlokkliProvider` in the component that renders `<BlokkliProvider>`
for this entity:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="$props">
    <LayoutHeader
      :title="entity.title"
      :lead="entity.lead"
      :size="options.headerSize"
    />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<NodePageFragment>()

const { options } = defineBlokkliProvider(props, {
  entityType: 'node',
  bundle: 'page',
  options: {
    headerSize: {
      type: 'radios',
      label: 'Size',
      default: 'auto',
      options: {
        auto: 'auto',
        small: 'small',
      },
    },
  },
})
</script>
```

In the editor, clicking the page itself now displays this option, just like with
a paragraph.
