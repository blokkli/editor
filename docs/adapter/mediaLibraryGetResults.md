# mediaLibraryGetResults()

This method should return the filters, page state and items for the media
library.

The method is called when the media library feature is enabled and the user
opens the media library sidebar pane.

For the feature to work, the
[mediaLibraryAddBlock()](/adapter/mediaLibraryAddBlock) method must also be
implemented.

## `MediaLibraryItem`

The method is expected to return an array of `MediaLibraryItem` objects. Here is
an example:

```typescript
const items = [
  {
    // The ID of the media item. This will be later passed
    // to mediaLibraryAddBlock().
    mediaId: '25',

    // The label/title displayed in the media grid.
    label: 'Image of a computer',

    // An additional string to give the user some context.
    // Could be some tags, a file name, etc.
    context: 'Stock photo',

    // The block bundles that can be created when
    // the user drag and drops this media into the page.
    targetBundles: ['image'],

    // A thumbnail that is used in the media grid.
    thumbnail: 'https://www.example.com/image-of-a-computer.jpg',
  },
  {
    mediaId: '79',
    label: 'Terms and conditions',
    context: 'PDF',
    targetBundles: ['document'],

    // Instead of a thumbnail we can also provide the name of
    // a valid blökkli icon instead.
    icon: 'file',
  },
  {
    mediaId: '45',
    label: 'A nice music video',
    context: 'YouTube',
    targetBundles: ['video'],
    thumbnail: 'https://i3.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  },
]
```

## Defining filters

The method can optionally defines filters that will be rendered in the media
library.

Currently four filter types are supported:

### `type: 'checkbox'`

This will render a simple checkbox toggle. The selected filter value will be of
type `boolean`.

```json
{
  "type": "checkbox",
  "label": "Only show published medias"
}
```

### `type: 'checkboxes'`

This will render a list of checkboxes. The selected filter value will be of type
`string[]` and contain 0 or more of the defined option keys.

```json
{
  "type": "checkboxes",
  "label": "Tags",
  "options": {
    "promoted": "Promoted",
    "marketing": "Marketing",
    "mood": "Mood",
    "stockPhoto": "Stock photo"
  }
}
```

### `type: 'text'`

Renders a text input field. The selected filter value will be of type `string`.

```json
{
  "type": "text",
  "label": "Search text",
  "placeholder": "Enter a search term"
}
```

### `type: 'select'`

Renders a select input field. The selected filter value will be of type `string`
and contain one of the defined option keys.

```json
{
  "type": "select",
  "label": "Media type",
  "options": {
    "image": "Image",
    "video": "Video",
    "document": "Document"
  }
}
```

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import {
  defineBlokkliEditAdapter,
  type GetMediaLibraryFunction,
} from '#blokkli/editor/adapter'

const mediaLibraryGetResults: GetMediaLibraryFunction = async (e) => {
  // The currently selected filter values are available on e.filters.
  const type = e.filters.type || 'image'

  const items = await $fetch('/backend-api/media-library', {
    method: 'post',
    query: {
      type,
      text: e.filters.text,
    },
  })

  return {
    // Define the available filters as an array of PluginConfigInput objects.
    filters: [
      {
        type: 'options',
        name: 'type',
        label: 'Media Type',
        required: false,
        variant: 'select',
        options: [
          { value: 'image', label: 'Image' },
          { value: 'video', label: 'Video' },
          { value: 'file', label: 'File' },
        ],
      },
      {
        type: 'text',
        name: 'text',
        label: 'Text',
        required: false,
        placeholder: 'Enter a search term',
      },
    ],
    // Return the matching media items.
    items,
    total: 24,
    perPage: 16,
  }
}

export default defineBlokkliEditAdapter((ctx) => {
  return {
    mediaLibraryGetResults,
  }
})
```

:::
