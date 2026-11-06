# getFieldConfig()

This method should return the configuration of fields that can contain blocks.

It's expected to return an array of `FieldConfig` objects.

## Example

In the most basic example, let's assume we have only a single blokkli provider
usage with a single field:

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="1"
  >
    <BlokkliField :list="blocks" name="field_blocks" />
  </BlokkliProvider>
</template>
```

We would then return the following field config in our getFieldConfig() method:

:::

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import type { FieldConfig } from '#blokkli/editor/types/definitions'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getFieldConfig: () => {
      const fieldConfig: FieldConfig[] = [
        {
          // Same name as on <BlokkliField>.
          name: 'field_blocks',

          // Same type and bundle of the <BlokkliProvider> the field
          // belongs to.
          entityType: 'content',
          entityBundle: 'blog_post',

          // The label displayed in the editor.
          label: 'Blocks',

          // The maximum number of blocks in this field. -1 means unlimited.
          cardinality: -1,

          // Whether the editor can edit the field. One that it can't edit
          // shows the blocks of its list while editing, and takes none.
          canEdit: true,

          // The block bundles that are allowed in this field.
          allowedBundles: ['title', 'rich_text', 'link', 'horizontal_rule'],

          // Optional: the user may not change what the field holds.
          readOnly: false,
        },
      ]
      return Promise.resolve(fieldConfig)
    },
  }
})
```

:::

## Read-only fields

A field with `readOnly: true` shows the blocks of the edit state, but the user
may not change what it holds: the editor adds no block to it, moves none into,
out of or within it, and removes none from it. Nothing in it changes either: a
block in it can be selected, but is shown as restricted and offers no action,
and the blocks nested in it can't be selected on their own.

Unlike `canEdit: false`, which means the editor doesn't manage the field at all
and shows its `list` as stored, a read-only field is part of the edit state:
what the user changes elsewhere is shown, as are the changes in it from before
it was read-only. The Drupal adapter sets it for the fields that the current
user may not edit, of the page and of each paragraph type.
