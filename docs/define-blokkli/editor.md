# Configuring block behaviour in the editor

Using the `editor` property it's possible to define the behaviour of the block
when rendered in the editor.

::: warning

Because defineBlokkli is a compiler macro, you can not access variables from
outside the composable. You may also not call any other globally available
composables.

:::

## icon

An optional icon name to display for this block in the editor (e.g. in the add
list). You can use any Material Symbols icon by prefixing its name with
`bk_mdi_`, or reference a custom SVG icon.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'gallery',

  editor: {
    icon: 'bk_mdi_photo_library',
  },
})
</script>
```

[Learn more about icons](/define-blokkli/icons)

## determineVisibleOptions

With this setting you can reactively decide which defined options to show.

It receives a single context argument of type
[type.DetermineVisibleOptionsContext] that contains the following properties:

### props: `any`

The (untyped) props passed into the component.

### parentType: `string|undefined`

The parent block bundle, if the blcok is nested.

### options: `Record<string, unknown>`

The current options set on the block. The type is inferred at runtime from the
options defined on the block.

### entity: `[type.AdapterContext]`

Information about the current page entity, including the current language.

### Example

Let's say we have a card component that can have an option icon (passed in via
props). We define an option to set the color of the icon. Using the
determineVisibleOptions method we can only show the color option when the card
actually has an icon.

```vue
<script lang="ts" setup>
defineProps<{
  title: string
  text: string
  icon?: string
}>()

const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'lightBlue',
      displayAs: 'colors',
      options: {
        blue: { hex: '#0550e6', label: 'Blue' },
        red: { hex: '#ff4800', label: 'Red' },
      },
    },
    hideGerman: {
      type: 'checkbox',
      label: 'Hide in German',
      default: false,
    },
  },
  editor: {
    determineVisibleOptions: (ctx) => {
      if (ctx.props.icon) {
        // Show the color option only if the component actually renders an icon.
        return ['color']
      } else if (ctx.entity.language === 'de') {
        // Show this option only if the current language is German.
        return ['hideGerman']
      }
      return []
    },
  },
})
</script>
```

It's also possible to show options based on the value of another option.

In this example the radio option to define the shadow size is only displayed if
the checkbox "Show as box" is checked.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    showAsBox: {
      type: 'checkbox',
      label: 'Show as box',
    },
    shadowSize: {
      type: 'radios',
      label: 'Shadow size',
      default: 'normal',
      options: {
        normal: 'Normal',
        medium: 'Medium',
        large: 'Large',
      },
    },
  },
  editor: {
    determineVisibleOptions: (ctx) => {
      if (ctx.options.showAsBox) {
        return ['shadowSize']
      }
      return []
    },
  },
})
</script>
```

## disableEdit

When set to true, the "edit" button on the block actions will be disabled.

This is useful for blocks that don't have any values that can be edited. For
example, a grid block that renders nested blocks may not have any editable
fields. Clicking on edit would just show an empty form. With this option we can
prevent that.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'grid',

  editor: {
    disableEdit: true,
  },
})
</script>
```

## previewWidth

Blocks can be rendered standalone in the editor, for example when selecting them
from the reusable library sidebar. There the available width is limited. If we
were to render a fullscreen block in this limited space it would not look good.

By specifying a width here, blökkli will render the component at the exact size
defined and then scale it down using transforms to fit in the available space.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'gallery',

  editor: {
    // Will render the component at exactly 1200px and then scale it down
    // to fit in the available space.
    previewWidth: 1200,
  },
})
</script>
```

## noPreview

When the block is rendered standalone (for example in the reusable library
sidebar), this option will prevent the component from actually being rendered.

This is useful for complex components where rendering them in this context makes
no sense. Think of a large form or an image gallery with a carousel.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'gallery',

  editor: {
    noPreview: true,
  },
})
</script>
```

## previewBackgroundClass

When the block is rendered standalone (for example in the reusable library
sidebar), the default background color is white. But a block might render white
text, which would then be unreadable. By specifying a CSS class here the editor
will use the class to apply the background color on the wrapper.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',

  editor: {
    previewBackgroundClass: 'bg-black',
  },
})
</script>
```

## addBehaviour

This setting defines what should happen when the user drag and drops a new block
of this type. The following options are available:

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',

  editor: {
    addBehaviour: 'no-form',
  },
})
</script>
```

### `'form'` (default)

This is the default behaviour. When dropping a new block, the edit form for this
block is displayed. Only when the form is submitted will the block actually be
added.

### `'no-form'`

This will add the block immediately without showing the edit form. If your
blocks provide a default value (e.g. a text block provides lorem ipsum text as
the default) then setting this option could be desireable, since editing users
can easily drag and drop text blocks to build the structure of the page without
having to know the text already.

### `'editable:NAME'`

If the block provides one or more editable fields, you can define the name of
the editable field here. When a new block is dropped, the block will be added
immediately and afterwards the given editable field will be focused.

This works best when the field has a default text.

```vue
<template>
  <h2 v-blokkli-editable:title>{{ title }}</h2>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',

  editor: {
    addBehaviour: 'editable:title',
  },
})

defineProps<{
  title: string
}>()
</script>
```

## editTitle

In various places in the editor a block is displayed only by its title. For
example the structure overview displays a tree of the entire block structure on
a page.

By default the label of a block is used (e.g. "Two Columns"). By providing a
method here you can override the title.

For example, a block that renders an image may want to use the tile or alt text
of the image as the title of the block.

The method receives the root DOM element of your component and should return a
string.

In this example the block component renders an image component. Instead of
extracting the title from the props we can directly query the DOM to find the
matching title.

```vue
<template>
  <ContentImage :image="image" />
</template>

<script lang="ts" setup>
import type { ComplexImageObject } from '~/types'

defineBlokkli({
  bundle: 'image',

  editor: {
    editTitle: (el) => el.querySelector('img')?.alt,
  },
})

defineProps<{
  image: ComplexImageObject
}>()
</script>
```

## mockProps

Some blocks can be created from clipboard content. For example, when the user
pastes plain text and blökkli is configured accordingly, a preview of how the
pasted text might look like is shown to the user. To do that, blökkli will call
the provided method to build the props and then render the block component using
these props.

```vue
<script lang="ts" setup>
defineProps<{
  richText: string
}>()

defineBlokkli({
  bundle: 'rich_text',

  editor: {
    mockProps: (text: string) => {
      return {
        richText: text,
      }
    },
  },
})
</script>
```

## maxInstances

Some blocks may render a specific part of a page, for example a page hero. Here
it wouldn't make sense to have more than one such block on one page.

By setting a number here you can limit the number of blocks that can be added of
this bundle.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'page_hero',

  editor: {
    maxInstances: 1,
  },
})
</script>
```

## fieldLayout

Define how the nested fields should be structured when the block is rendered
without its component, for example when using `:proxy-mode="true"` on
`<BlokkliField>`.

Each array should define an array of field names.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'three_columns',

  editor: {
    fieldLayout: [['header'], ['left', 'center', 'right']],
  },
})
</script>
```

## mapDiffProps

Define how this component's props should be rendered in the diff view.

By default, the diff feature assumes all props to be text and will render
plaintext props as HTML and convert complex props (such as arrays or objects) to
string using JSON.stringify().

You can instead return a string representation of each prop that is used to
display the prop instead.

For example, if the prop is an image, you may return the filename of the image
instead. If the prop is a number, you can return the formatted number.

You can also return HTML as the value. The feature uses an HTML differ to render
the diff.

```vue
<script lang="ts" setup>
import type { ImageBlockFragment } from '#graphql-operations'

defineProps<{
  image: ImageBlockFragment['image']
  count: number
}>()

defineBlokkli({
  bundle: 'image',

  editor: {
    mapDiffProps: (props) => {
      return {
        image: props?.image?.filename || 'No image',
        count: props?.count?.toString() || '0',
      }
    },
  },
})
</script>
```

## blokkliDraggable (template ref)

By default, the editor uses the block component's root element as the drag
handle. If your component has a wrapper element (e.g. a container) that
shouldn't be part of the draggable area, add `ref="blokkliDraggable"` to the
inner content element.

```vue
<template>
  <div class="container">
    <div ref="blokkliDraggable" class="card-content">
      <h3 v-blokkli-editable:title>{{ title }}</h3>
      <p v-blokkli-editable:text>{{ text }}</p>
    </div>
  </div>
</template>
```

This tells the editor to use the inner `<div>` as the drag target instead of the
outer container. The editor also uses this element for:

- Generating drag previews
- Calculating block positions and sizes
- Intersection and resize observation

If no `ref="blokkliDraggable"` is set, the component's root element is used as a
fallback. The ref can also point to a child component — the editor will use its
root element.
