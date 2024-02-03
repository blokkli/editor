# Themes

blökkli supports both builtin and custom themes for the editor.

## Built-in themes

Currently the following themes are available:

- arctic (default)
- gruvbox
- nuxt
- fire

### Example

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    theme: 'gruvbox',
  },
})
```

:::

## Custom themes

You can also create your own theme that matches the colors of your app. The
easiest way is to use the [Theme Editor](/features/theme):

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    enableThemeEditor: true,
  },
})
```

:::

Once enabled, a sidebar pane is available that renders all theme colors with a
color picker. It generates the theme definition which can then be passed to the
`theme` property:

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    theme: {
      accent: {
        '50': [251, 245, 246],
        '100': [248, 235, 238],
        '200': [242, 217, 223],
        '300': [230, 187, 197],
        '400': [211, 134, 155],
        '500': [198, 109, 135],
        '600': [175, 79, 112],
        '700': [146, 62, 93],
        '800': [123, 54, 82],
        '900': [123, 54, 82],
        '950': [58, 23, 37],
      },
      mono: {
        '50': [254, 253, 251],
        '100': [251, 248, 239],
        '200': [234, 230, 220],
        '300': [230, 222, 209],
        '400': [168, 153, 132],
        '500': [124, 103, 100],
        '600': [102, 92, 84],
        '700': [80, 73, 69],
        '800': [50, 48, 39],
        '900': [40, 40, 40],
        '950': [29, 32, 33],
      },
      teal: {
        light: [216, 243, 233],
        normal: [131, 165, 152],
        dark: [38, 59, 51],
      },
      yellow: {
        light: [251, 241, 199],
        normal: [250, 189, 47],
        dark: [144, 106, 20],
      },
      red: {
        light: [255, 218, 214],
        normal: [251, 73, 52],
        dark: [142, 24, 11],
      },
      lime: {
        light: [236, 236, 197],
        normal: [184, 187, 38],
        dark: [80, 80, 12],
      },
    },
  },
})
```

:::
