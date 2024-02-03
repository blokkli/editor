# Settings

A feature can implement additional settings that are alterable via both
configuration and by the user of the editor. These are stored in local storage.

It's possible to disable altering settings for users. This is done via the
`blokkli.settingsOverride` property in the configuration.

See [type.ModuleOptionsSettings] for all available settings.

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    settingsOverride: {
      // Disable setting the AddList orientation.
      'feature:add-list:orientation': {
        disable: true,
      },
    },
  },
})
```

:::

You can also provide your own default values for settings or provide default and
disable the setting for the user:

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    settingsOverride: {
      // Set a default scroll speed for the artboard feature.
      'feature:artboard:scrollSpeed': {
        default: 0.9,
      },

      // Disable using mouse buttons to navigate the history
      // and don't let users enable it.
      'feature:history:useMouseButtons': {
        disable: true,
        default: false,
      },
    },
  },
})
```

:::

## Themes
