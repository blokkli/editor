# Defining block options

While the actual data of a block (passed in via props) is entirely handled by
your app, the options are managed by blökkli. Options are directly defined in
the component.

One important thing to note is that the data for the options is always stored as
strings. For example, the value of a checkbox is stored as `'1'` or `'0'`.

The returned object from defineBlokkli() contains the `options` property which
is a reactive computed property of the options for this component.

::: danger IMPORTANT

Because defineBlokkli is a compiler macro, you can not access variables from
outside the composable. This means you can't do something like this:

```typescript
const translations = useTranslations()

const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    box: {
      type: 'checkbox',
      label: translations.boxOptionLabel, // [!code error]
      default: '1',
    },
  },
})
```

:::

## Checkbox

![Screenshot of the checkbox option type](/assets/option-checkbox.png)

This is the simplest option. It renders a single checkbox with the given label.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    box: {
      type: 'checkbox',
      label: 'Mobile',
      default: '1',
    },
  },
})

// Either '1', '0' or undefined.
console.log(options.value.box)
</script>
```

## Checkboxes

![Screenshot of the checkboxes option type](/assets/option-checkboxes.png)

This will render multiple checkboxes in a dropdown where zero or multiple
options can be checked.

In this example we provide an option to select in which countries the block
should be displayed.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    countries: {
      type: 'checkboxes',
      label: 'Countries',
      default: ['ch', 'de', 'at'],
      options: {
        ch: 'Switzerland',
        de: 'Germany',
        at: 'Austria',
        it: 'Italy',
        fr: 'France',
      },
    },
  },
})

// An array of valid options, e.g. ['ch', 'at', 'it'].
console.log(options.value.countries)
</script>
```

## Text

![Screenshot of the text option type](/assets/option-text.png)

This option renders a single text input.

In this example we implement a text option where editing users can provide an
ID/slug that our component can use as it's root ID attribute.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    anchorId: {
      type: 'text',
      label: 'Anchor ID',
      default: '',
      inputType: 'text',
    },
  },
})

// The text entered by the user as a string, e.g. 'contact-form'.
console.log(options.value.text)
</script>
```

## Radios

![Screenshot of the text option type](/assets/option-radios-default.png)

This option renders a group of radio buttons.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'button',

  options: {
    buttonType: {
      type: 'radios',
      label: 'Button Type',
      default: 'primary',
      options: {
        primary: 'Primary',
        secondary: 'Secondary',
      },
    },
  },
})

// The selected option, either 'primary' or 'secondary'.
console.log(options.value.buttonType)
</script>
```

It's possible to change how the radio buttons are rendered using the `displayAs`
property.

### `displayAs: 'radios'`

![Screenshot of the default radios option type](/assets/option-radios-default.png)

This is the default behaviour and it renders all options inline using the
defined label.

### `displayAs: 'grid'`

![Screenshot of the grid radios option type](/assets/option-radios-grid.png)

This renders each option as a grid. Instead of a string label the value should
be the columns of the grid, expressed as flex-grow values.

Each option key can have different amounts of columns.

In this example we provide an option where, in a two column grid, the width of
both columns can be selected.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'two_columns',
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'equal',
      displayAs: 'grid',
      options: {
        equal: [1, 1], // 50% / 50%
        oneTwo: [1, 2], // 33% / 66%
        twoOne: [2, 1], // 66% / 33%
        quarterOne: [3, 1], // 75% / 25%
      },
    },
  },
})
</script>
```

### `displayAs: 'colors'`

![Screenshot of the colors radios option type](/assets/option-radios-colors.png)

This will render a circle with the given HEX color as the background.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'button',
  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'white',
      displayAs: 'colors',
      options: {
        normal: '#FFFFFF', // White
        primary: '#0550e6', // Blue
      },
    },
  },
})
</script>
```

### `displayAs: 'icons'`

![Screenshot of the icons radios option type](/assets/option-radios-icons.png)

This will render the given icon for each option. The icons have to be _in the
same folder as the component_ and are referenced by their file name (all
lowercase, only a-z, - and \_ are allowed). The file name must start with
`icon-blokkli-`.

In this example we have the following file structure:

```
- components/
  - Blocks/
    - Grid/
      - index.vue
      - icon-blokkli-option-two.svg
      - icon-blokkli-option-three.svg
      - icon-blokkli-option-four.svg
```

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
        two: 'icon-blokkli-option-two',
        three: 'icon-blokkli-option-three',
        four: 'icon-blokkli-option-four',
      },
    },
  },
})
</script>
```
