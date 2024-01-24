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
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getFieldConfig: () => {
      return Promise.resolve([
        {
          // Same name as on <BlokkliField>.
          name: 'field_blocks',

          // Same type and bundle of the <BlokkliProvider> the field belongs to.
          entityType: 'content',
          entityBundle: 'blog_post',

          // The label displayed in the editor.
          label: 'Blocks',

          // The maximum number of blocks in this field. -1 means unlimited.
          cardinality: -1,

          // Whether the current user is allowed to edit the field.
          canEdit: true,

          // The block bundles that are allowed in this field.
          allowedBundles: ['title', 'rich_text', 'link', 'horizontal_rule'],
        },
      ])
    },
  }
})
```

:::
