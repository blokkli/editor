# BlokkliEditable

The `BlokkliEditable` component makes entity fields inline-editable during
editing mode.

## Usage

```vue
<template>
  <BlokkliEditable v-slot="{ value }" name="title" :value="page.title">
    <h1>{{ value }}</h1>
  </BlokkliEditable>
</template>
```

## Props

### name

- **Type:** `string`
- **Required:** Yes

The machine name of the field that should be editable.

### value

- **Type:** `string`
- **Required:** No
- **Default:** `''`

The current text value of the field.

### tag

- **Type:** `string`
- **Required:** No
- **Default:** `'div'`

The HTML tag to use for the wrapper element.

## Slots

### default

The default slot receives:

#### value

- **Type:** `string`

The current value of the field. During editing, this will update in real-time as
the user types.

## How It Works

During editing, `BlokkliEditable` makes the content inline-editable by:

1. Registering the element as an editable field with the editor
2. Enabling contenteditable on the content
3. Listening for changes and updating the edit state
4. Providing real-time preview of changes

In normal mode, it simply renders the content without any editing functionality.

## Examples

### Basic Title Field

```vue
<template>
  <BlokkliEditable v-slot="{ value }" name="title" :value="page.title">
    <h1>{{ value }}</h1>
  </BlokkliEditable>
</template>
```

### Description Field

```vue
<template>
  <BlokkliEditable
    v-slot="{ value }"
    name="description"
    :value="page.description"
  >
    <p class="lead-text">{{ value }}</p>
  </BlokkliEditable>
</template>
```

### With Custom Wrapper Tag

```vue
<template>
  <BlokkliEditable
    v-slot="{ value }"
    tag="section"
    name="intro"
    :value="page.intro"
  >
    <div class="intro-content" v-html="value" />
  </BlokkliEditable>
</template>
```

### Processing Value Before Display

```vue
<template>
  <BlokkliEditable v-slot="{ value }" name="title" :value="page.title">
    <h1 v-html="formatTitle(value)" />
  </BlokkliEditable>
</template>

<script setup lang="ts">
const formatTitle = (text: string): string => {
  // Wrap words between $ symbols in <em> tags
  return text.replace(/\$([^$]+)\$/g, '<em>$1</em>')
}
</script>
```

### Multiple Editable Fields

```vue
<template>
  <article>
    <BlokkliEditable v-slot="{ value }" name="title" :value="page.title">
      <h1>{{ value }}</h1>
    </BlokkliEditable>

    <BlokkliEditable v-slot="{ value }" name="subtitle" :value="page.subtitle">
      <h2>{{ value }}</h2>
    </BlokkliEditable>

    <BlokkliEditable v-slot="{ value }" name="lead" :value="page.lead">
      <p class="lead">{{ value }}</p>
    </BlokkliEditable>
  </article>
</template>
```

### With v-blokkli-editable Directive

For simpler cases, you can use the `v-blokkli-editable` directive instead:

```vue
<template>
  <h1 v-blokkli-editable:title>{{ page.title }}</h1>
  <p v-blokkli-editable:description>{{ page.description }}</p>
</template>
```

The directive is a shorthand that achieves the same result as using the
component.

## Editable Field Configuration

To enable inline editing for entity fields, they must be configured in the
adapter's `getEditableFieldConfig()` method:

```typescript
getEditableFieldConfig: () => {
  return [
    {
      name: 'title',
      label: 'Page Title',
      type: 'plain',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'plain',
    },
    {
      name: 'intro',
      label: 'Introduction',
      type: 'markup',
    },
  ]
}
```

## Field Types

The `type` property of an editable field configuration controls how the inline
editing overlay behaves. The available values are:

- `'plain'` - Plain text editing in a `<textarea>`. The value is stored and
  saved as plain text (no markup). A character counter is shown.
- `'markup'` - Rich text editing in a `contenteditable` element. The value is
  HTML, so the formatting the user applies is preserved in the stored value.
- `'frame'` - Rich text editing inside a same-origin iframe (e.g. a CKEditor
  instance) that syncs its value back to the editor. This requires the adapter
  to also implement `buildEditableFrameUrl()`, which returns the URL to load
  into the iframe for the given field.
- `'table'` - Editing of table markup. Like `'markup'`, the value is treated as
  HTML rather than plain text.

## Comparison with v-blokkli-editable Directive

Both approaches achieve the same result:

**Component:**

```vue
<BlokkliEditable v-slot="{ value }" name="title" :value="page.title">
  <h1>{{ value }}</h1>
</BlokkliEditable>
```

**Directive:**

```vue
<h1 v-blokkli-editable:title>{{ page.title }}</h1>
```

Use the component when you need:

- More control over the rendering
- Access to the reactive value in the slot
- Custom processing of the value
- Different wrapper tags

Use the directive when you want:

- Simpler, more concise syntax
- Direct inline editing on existing elements

## Notes

- Must be used inside a `BlokkliProvider` component
- Only works for entity fields (page-level fields), not block fields
- Fields must be configured in the adapter's editable field configuration
- Changes are saved to the edit state and can be published along with block
  changes
- The value is updated in real-time during editing
- In normal mode, the component simply passes through the value without any
  editing functionality
