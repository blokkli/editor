# getContentSearchResults()

This method should return search results for the given search tab and search
text.

The `tab` argument is the key of one of the properties defined in the object
returned by [getContentSearchTabs()](/adapter/getContentSearchTabs) and the
`text` argument is the search text entered by the user.

The method does not need to perform debouncing, as this is already handled by
blökkli.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { SearchContentItem } from '#blokkli/types'

const images: SearchContentItem[] = [
  {
    // The ID of the search item.
    id: '9485812c-0ecd-4699-85b2-3a031d47a0a1',

    // Title displayed in the search results.
    title 'Image of the moon',

    // An optional context text that is highlighted in the search result.
    context: 'image-of-moon-1024x768.jpg',

    // The text displayed below the title.
    text: 'An image of the moon at night, large',

    // An array of block bundles for which a block can be created.
    targetBundles: ['image'],

    // An option image that is displayed instead of an icon.
    imageUrl: 'https://www.example.com/assets/images/image-of-moon-1024x768.jpg'
  },
]

const pages: SearchContentItem[] = [
  {
    id: '4526d2d0-f122-4093-902f-e2f00a433981',
    title 'Subscibe to our newsletter',
    context: 'Landing Page',
    text: 'Landing page for the newsletter subscription',

    // Specifying multiple bundles is possible. That way the search result can
    // be drag and dropped into multiple fields that allow one of the
    // specified bundles. The first matching bundle is used.
    targetBundles: ['link', 'teaser', 'card'],
  },
]

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getContentSearchResults: (
      tab: string,
      text: string,
    ): Promise<SearchContentItem[]> => {
      if (tab === 'images') {
        return Promise.resolve(images)
      }

      // Tab is "content".
      return Promise.resolve(pages)
    },
  }
})
```

:::
