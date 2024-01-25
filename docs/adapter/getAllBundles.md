# getAllBundles()

This method should return all generally available block bundle definitions.

It's expected to return an array of `BlockBundleDefinition` objects.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import types { BlockBundleDefinition } from '#blokkli/types'

const bundles: BlockBundleDefinition[] = [
  {
    id: 'card',
    label: 'Card',
    description:
      'A block that renders a card with a title, text and a link.',
    allowReusable: true,
    isTranslatable: true,
  },
  {
    id: 'horizontal_rule',
    label: 'Horizontal Rule',
    description:
      'A block that renders a simple horizontal rule to separate content.',
    allowReusable: false,
    isTranslatable: false,
  },
  // etc.
]

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getAllBundles: () => {
      return Promise.resolve(bundles)
    },
  }
})
```

:::
