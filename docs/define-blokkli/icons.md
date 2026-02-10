# Icons

blökkli uses icons throughout the editor — in the block add list, option
selectors, toolbars, and more. There are two types of icons you can use:

- **Material Symbols** — over 7,000 icons from Google's
  [Material Symbols](https://fonts.google.com/icons) library, referenced with
  the `bk_mdi_` prefix
- **Custom SVG icons** — your own SVG files, placed alongside block components
  with a specific naming convention

Both types are fully type-safe: the `BlokkliIcon` type is a union of all
available icon names, generated at build time.

## Material Symbols (`bk_mdi_`)

To use a Material Symbols icon, prefix its name with `bk_mdi_` and replace
hyphens with underscores. blökkli uses the **rounded** style at **weight 600**
from the `@material-symbols/svg-600` package.

For example, the icon named `format_h2` on
[Google Fonts](https://fonts.google.com/icons) becomes `bk_mdi_format_h2`.

### Usage in `editor.icon`

The most common use case is setting a block's icon in the add list:

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',

  editor: {
    icon: 'bk_mdi_format_h2',
  },
})
</script>
```

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

### Usage in `displayAs: 'icons'`

Material Symbols icons can also be used in radios options with
`displayAs: 'icons'`:

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',
  options: {
    layout: {
      type: 'radios',
      label: 'Layout',
      default: 'grid',
      displayAs: 'icons',
      options: {
        grid: { icon: 'bk_mdi_grid_view', label: 'Grid' },
        list: { icon: 'bk_mdi_view_list', label: 'List' },
        carousel: { icon: 'bk_mdi_view_carousel', label: 'Carousel' },
      },
    },
  },
})
</script>
```

### Finding Icon Names

Browse the full icon catalog at
[Google Fonts Icons](https://fonts.google.com/icons). Select an icon, copy its
name, then prefix it with `bk_mdi_` and replace any hyphens or spaces with
underscores.

::: tip TypeScript Autocomplete

Because `BlokkliIcon` is a generated union type, your editor will provide
autocomplete for all available icon names when typing `'bk_mdi_'`.

:::

## Custom SVG Icons

For option selectors that need custom visuals (like layout previews), you can
create your own SVG icons. These must follow a specific naming convention:

1. The file name must start with `icon-blokkli-`
2. The file must have a `.svg` extension
3. Place the file **in the same directory** as the block component (or anywhere
   in your app)

### Example

Given this file structure:

```
components/
  Blokkli/
    Grid/
      Grid.vue
      icon-blokkli-option-two.svg
      icon-blokkli-option-three.svg
      icon-blokkli-option-four.svg
```

Reference the icons by their full file name (without the `.svg` extension):

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'grid',
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'icons',
      options: {
        two: { icon: 'icon-blokkli-option-two', label: 'Two' },
        three: { icon: 'icon-blokkli-option-three', label: 'Three' },
        four: { icon: 'icon-blokkli-option-four', label: 'Four' },
      },
    },
  },
})
</script>
```

### SVG Best Practices

Custom SVG icons used in option selectors can use the special CSS classes
`bk-option-icon-fill` and `bk-option-icon-stroke` for theme-aware styling:

```svg
<svg width="76" height="24" viewBox="0 0 76 24" fill="none"
  xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" width="36" height="23"
    class="bk-option-icon-fill bk-option-icon-stroke"/>
  <rect x="39.5" y="0.5" width="36" height="23"
    class="bk-option-icon-fill bk-option-icon-stroke"/>
</svg>
```

These classes ensure the icon adapts to the editor's current theme (light/dark).

## Where Icons Can Be Used

| Context                      | Accepts `bk_mdi_` | Accepts custom SVG |
| ---------------------------- | ----------------- | ------------------ |
| `editor.icon`                | Yes               | Yes                |
| `displayAs: 'icons'` options | Yes               | Yes                |
| Plugin definitions           | Yes               | Yes                |
| Feature definitions          | Yes               | Yes                |
