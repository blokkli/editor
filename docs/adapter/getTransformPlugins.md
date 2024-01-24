# getTransformPlugins()

This method should return the possible transformation plugins available. The
return value should be an array of `TransformPlugin` objects.

The editor uses this information to allow the users to transform one or more
blocks. For this feature to work, the
[applyTransformPlugin()](/adapter/applyTransformPlugin) method must also be
implemented.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getTransformPlugins: () => {
      return Promise.resolve([
        // Example of a transformation that merges two or more text blocks.
        {
          // The plugin ID.
          id: 'merge_texts',

          // The label of the transformation displayed in the editor.
          label: 'Merge Texts',

          // The array of block bundles for which this transformation may apply.
          bundles: ['text'],

          // The array of block bundles that this transformation can produce.
          targetBundles: ['text'],

          // The minimum amount of blocks required.
          min: 2,

          // The maximum amount of blocks that can be transformed.
          max: -1,
        },

        // Example of a transformation that fixes spelling mistakes in text blocks.
        {
          id: 'spellcheck',
          label: 'Fix spelling mistakes',
          bundles: ['text'],
          targetBundles: ['text'],
          min: 1,
          max: -1,
        },
      ])
    },
  }
})
```

:::
