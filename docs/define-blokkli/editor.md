# Configuring block behaviour in the editor

Using the `editor` property it's possible to define the behaviour of the block
when rendered in the editor.

::: warning

Because defineBlokkli is a compiler macro, you can not access variables from
outside the composable. You may also not call any other globally available
composables.

:::

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
        blue: '#0550e6',
        red: '#ff4800',
      },
    },
  },
  editor: {
    determineVisibleOptions: (ctx) => {
      if (ctx.props.icon) {
        return ['color']
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
    // Will render the component at exactly 1280px and then scale it 0.25
    // so it fits in the available space (300px).
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

## getDraggableElement

By default, the editor assumes that the root element of your component is
draggable. Sometimes this is not desireable: In this example the component
renders a single button, wrapper in a container. The default behaviour would be
that the entire container is draggable.

By providing a method we can instead return the button element, in which case
dragging and selecting is restricted to this element.

The method receives the root HTML element of your component and should return an
existing element that is a descendant of this component. In addition there are
some requirements:

- The element must be fully visible (e.g. not display: none).
- It should ideally be positioned relatively

If the method doesn't return an element, it will fall back to the root element
of the component.

```vue
<template>
  <div class="container">
    <button>{{ title }}</button>
  </div>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'button',

  editor: {
    getDraggableElement: (el) => el.querySelector('button'),
  },
})

defineProps<{
  title: string
}>()
</script>
```
