# Editor Translations

Every string in the editor is translatable. blökkli ships with translations for
English, German, French and Italian.

## Overrides

You can override any translation (or source text) using the `translations`
property in the module configuration:

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    translations: {
      en: {
        editIndicatorLabel: 'Edit paragraphs',
      },
      de: {
        editIndicatorLabel: 'Abschnitte bearbeiten',
      },
    },
  },
})
```

:::

## Custom text strings

When defining a custom editor feature you can use the `$t` method available from
`useBlokkli()`:

```vue
<template>
  <div>
    <button>{{ $t('myCustomFeatureButtonLabel', 'Click here') }}</button>
  </div>
</template>

<script lang="ts" setup>
defineBlokkliFeature({
  id: 'my-custom-feature',
  label: 'A custom feature',
  icon: 'search',
})

const { $t } = useBlokkli()
</script>
```

The first argument is the key and the second argument is the default value (in
English).

The same key can then be used to define the translations:

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    translations: {
      de: {
        myCustomFeatureButtonLabel: 'Hier klicken',
      },
    },
  },
})
```

:::
