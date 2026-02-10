# Configuration

All blökkli configuration is defined under the `blokkli` key in your
`nuxt.config.ts`. This page documents every available option.

## pattern

**Type:** `string[]`

Glob patterns that define where blökkli looks for block components. Every `.vue`
file matching these patterns is scanned for `defineBlokkli()` calls.

```typescript
export default defineNuxtConfig({
  blokkli: {
    pattern: ['~/components/Blokkli/**/*.vue'],
  },
})
```

You can define multiple patterns:

```typescript
pattern: [
  '~/components/Blokkli/**/*.vue',
  '~/pages/**/*.vue',
],
```

## itemEntityType

**Type:** `string`

The entity type of blökkli items (blocks). This should match the entity type
used in your backend.

```typescript
blokkli: {
  itemEntityType: 'paragraph', // Drupal
  // or
  itemEntityType: 'block',     // Custom backend
}
```

## globalOptions

**Type:** [type.BlockDefinitionOptionsInput]

Define reusable options that can be referenced by any block via the
`globalOptions` property in `defineBlokkli()`.

```typescript
blokkli: {
  globalOptions: {
    background: {
      type: 'radios',
      label: 'Background',
      default: 'white',
      displayAs: 'colors',
      options: {
        white: { class: 'bg-white', label: 'White' },
        dark: { class: 'bg-gray-900', label: 'Dark' },
      },
    },
  },
}
```

See [Options](/define-blokkli/options) and
[defineBlokkli() globalOptions](/define-blokkli#globaloptions) for details.

## chunkNames

**Type:** `string[]`\
**Default:** `['global']`

Define available chunk groups for code splitting. Blocks can reference a chunk
name via the `chunkName` property in `defineBlokkli()`. Blocks without a chunk
name are bundled in the default chunk.

```typescript
blokkli: {
  chunkNames: ['global', 'rare'],
}
```

Blocks used on most pages should stay in the default chunk. Only assign a chunk
name to blocks that are used rarely — too many chunks can hurt performance since
each page load requires multiple requests.

## fieldListTypes

**Type:** `string[]`

Define valid field list types that can be passed to the `<BlokkliField>`
component via the `field-list-type` prop. The value is available to blocks inside
the field via `ctx.fieldListType`.

```typescript
blokkli: {
  fieldListTypes: ['header', 'inline'],
}
```

```vue
<template>
  <BlokkliField name="header" :list="blocks" field-list-type="header" />
</template>
```

Blocks can then render differently based on the field list type:

```vue
<script lang="ts" setup>
const { fieldListType } = defineBlokkli({
  bundle: 'text',
})

const isInline = computed(() => fieldListType.value === 'inline')
</script>
```

## editAdapterPath

**Type:** `string`

Custom absolute path to the edit adapter implementation. The file must exist when
the module is initialised.

```typescript
blokkli: {
  editAdapterPath: '~/adapters/blokkli-adapter.ts',
}
```

See [Adapter Overview](/adapter/overview) for details.

## theme

**Type:** `string | Partial<Theme>`

The editor theme. Can be a built-in theme name or a partial theme object with
custom colors.

```typescript
blokkli: {
  theme: 'arctic',
}
```

See [Themes](/editor/themes) for details.

## enableThemeEditor

**Type:** `boolean`\
**Default:** `false`

Enable the theme editor feature, which lets users adjust editor colors at
runtime.

## translations

**Type:** `Record<string, Record<string, string>>`

Override editor translations. The outer key is the language code, the inner
key/value pairs are translation overrides.

```typescript
blokkli: {
  translations: {
    en: {
      editIndicatorLabel: 'Edit page content',
    },
    de: {
      editIndicatorLabel: 'Seiteninhalt bearbeiten',
    },
  },
}
```

See [Translations](/editor/translations) for details.

## defaultLanguage

**Type:** `string`

The default/fallback language for the editor UI.

## forceDefaultLanguage

**Type:** `boolean`\
**Default:** `false`

Force the editor to always use the default language, regardless of the page
entity's language.

## settingsOverride

**Type:** `Record<string, { disable?: boolean; default?: any }>`

Override feature settings or prevent users from changing them. Setting keys
follow the pattern `feature:<feature-id>:<setting-name>`.

```typescript
blokkli: {
  settingsOverride: {
    'feature:artboard:scrollSpeed': {
      default: 0.9,
    },
    'feature:add-list:orientation': {
      disable: true,
    },
  },
}
```

See [Settings](/editor/settings) for details.

## storageDefaults

**Type:** `{ blockFavorites?: string[] }`

Default values for user-specific localStorage settings. These are not visible in
the settings dialog but can be changed through interactions (e.g. favoriting
blocks).

```typescript
blokkli: {
  storageDefaults: {
    blockFavorites: ['title', 'text', 'card'],
  },
}
```

## featureImports

**Type:** `string[]`

Add custom editor features by path or glob pattern.

```typescript
blokkli: {
  featureImports: ['./blokkli/DemoFeature.vue'],
}
```

## templateEntityType

**Type:** `string`

The entity type for template entities (reusable block templates). For the
Drupal integration this should be `'blokkli_paragraph_template'`.

## fromLibraryBlockBundle

**Type:** `string`\
**Default:** `'from_library'`

The block bundle name used for "from library" blocks (blocks that reference a
reusable template).

## fragmentBlockBundle

**Type:** `string`\
**Default:** `'blokkli_fragment'`

The block bundle name used to wrap fragment components. See
[Fragments](/define-blokkli/fragments) for details.

## schemaOptionsPath

**Type:** `string`\
**Default:** `.nuxt/blokkli/options-schema.json`

Override the output path for the generated options schema JSON file. The path can
use aliases like `~`.

```typescript
blokkli: {
  schemaOptionsPath: '~/options-schema.json',
}
```

## getBundlePropsType

**Type:** `(name: string, definition: CollectedBlockFile) => { typeName: string; from: string }`

A callback that generates TypeScript prop types for each block bundle. This
enables type-safe access to block props when iterating over field items (e.g. via
`siblings`, `rootBlocks`, or the `<BlokkliField>` slot).

The function receives the bundle name and the block definition, and should return
the type name and the module/path it can be imported from.

```typescript
blokkli: {
  getBundlePropsType(_bundle, definition) {
    return {
      typeName: 'Props',
      from: definition.filePath,
    }
  },
}
```

With this configured, block props are fully typed:

```vue
<script lang="ts" setup>
const { siblings, index } = defineBlokkli({
  bundle: 'text',
})

const previousBlock = computed(() => siblings.value[index.value - 1])

// Type narrowing works correctly.
if (previousBlock.value?.bundle === 'title') {
  const title = previousBlock.value.props.title // string
}
</script>
```

## modules

**Type:** `BlokkliModule[]`

An array of blökkli sub-modules. Sub-modules extend the editor with additional
features (e.g. the Drupal adapter module or the agent module).

```typescript
import agentModule from 'blokkli/agent'

export default defineNuxtConfig({
  blokkli: {
    modules: [
      agentModule({ provider: 'anthropic', models: [/* ... */] }),
    ],
  },
})
```

## Full Example

```typescript
export default defineNuxtConfig({
  blokkli: {
    pattern: ['~/components/Blokkli/**/*.vue'],
    itemEntityType: 'block',
    fieldListTypes: ['header', 'inline'],
    chunkNames: ['global', 'rare'],
    theme: 'arctic',
    defaultLanguage: 'en',

    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: { class: 'bg-white', label: 'White' },
          dark: { class: 'bg-gray-900', label: 'Dark' },
        },
      },
    },

    storageDefaults: {
      blockFavorites: ['title', 'text', 'card'],
    },

    settingsOverride: {
      'feature:artboard:scrollSpeed': {
        default: 0.9,
      },
    },

    getBundlePropsType(_bundle, definition) {
      return {
        typeName: 'Props',
        from: definition.filePath,
      }
    },
  },
})
```
