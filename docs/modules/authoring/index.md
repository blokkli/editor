# Authoring a Module

A blökkli **module** is a build-time extension that registers functionality into
the editor — block component directories, CSS, icons, complex option types,
adapter extensions, collectors, and more. The built-in modules (charts, iframes,
agent, …) are written with the exact same API available to your project.

## Where a module lives

A module is a single file exporting a factory, typically kept in your project:

```
~/blokkli/modules/my-module/
└── index.ts        # the module definition (factory)
```

It can sit anywhere — the only requirement is that you import it into
`nuxt.config.ts` and add it to the `blokkli.modules` array.

## Registering a module

```typescript
import myModule from '~/blokkli/modules/my-module'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [myModule()],
  },
})
```

Modules are **factory functions** — you call them in the array. Whether the call
needs an argument depends on the module's options (see below).

## `defineBlokkliModule`

Define a module with `defineBlokkliModule`, imported from
`@blokkli/editor/modules`:

```typescript
import { defineBlokkliModule } from '@blokkli/editor/modules'
import { createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context, helper, $t }) {
    // register things here
  },
})
```

`setup` receives an app object with three members:

- **`context`** — register what the module contributes (CSS, icons, option
  types, adapter extensions, …). See below.
- **`helper`** — lower-level Nuxt wiring (aliases, components, dependencies).
- **`$t(key, default)`** — create a translatable label; returns
  `{ key, defaultTranslation }`.

### Module options

A module declares its own options through the generic type parameter. The
factory signature adapts automatically: if any option is required, the factory
requires an argument; if all are optional (or there are none), the argument is
optional.

```typescript
type MyModuleOptions = {
  apiUrl: string // required
  debug?: boolean // optional
}

export default defineBlokkliModule<MyModuleOptions>({
  setup({ context }, options) {
    // options.apiUrl is typed and required
    if (options.debug) {
      // ...
    }
  },
})

// Consumed as: myModule({ apiUrl: 'https://…' })
```

The options are passed to `setup` as its second argument.

## Lifecycle

When the editor builds, it processes every registered module in two passes:

1. **`alterOptions(options)`** — runs first, for all modules, before any
   `setup`. It receives the shared `ModuleOptions` (the whole `blokkli` config)
   and may mutate it — for example to append to `featureImports` (register a
   feature component) or `blokkliDirs` (add a `blokkli/` directory of
   conventions). Use this only for cross-cutting config that must be in place
   before setup runs.
2. **`setup(app, options)`** — runs next, for all modules, to register the
   module's contributions.

```typescript
export default defineBlokkliModule({
  alterOptions(options) {
    options.featureImports ||= []
    options.featureImports.push(resolve('./MyFeature.vue'))
  },
  setup({ context }) {
    context.addCSS(resolve('./style.css'))
  },
})
```

## The `context` object

`context` is how a module registers what it contributes:

| Method                                      | Purpose                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `addCSS(filePath)`                          | Inject a CSS file into the editor stylesheet (see [Tailwind](/modules/tailwind/#registering-css-with-the-editor)).                 |
| `addContentPath(dirPath)`                   | Include a directory of Vue files in the CSS/mangling pipeline so their utility classes are generated.                              |
| `addIcon(...names)`                         | Register additional [icons](/define-blokkli/icons) to include in the build.                                                        |
| `registerComplexOptionType(def)`            | Register a custom block option backed by a custom editor UI — see [Complex Option Types](/modules/authoring/complex-option-types). |
| `registerAdapterExtension(namespace, path)` | Register an [adapter extension](/adapter/overview) (analyzers, readability, …).                                                    |
| `addCollector(collector)`                   | Add a build-time collector that introspects project files.                                                                         |
| `addTemplate(template)`                     | Generate a runtime template/file.                                                                                                  |
| `addFeatureFragment(name)`                  | Register a feature fragment name.                                                                                                  |

## The `helper` object

`helper` exposes lower-level Nuxt wiring. The members you are most likely to
use:

| Member                                     | Purpose                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `addAlias(name, path)`                     | Register a TypeScript path alias (e.g. `#my-module/types`).                         |
| `addComponent(name)`                       | Register a global Vue component.                                                    |
| `addComposable(name)`                      | Register an auto-imported composable.                                               |
| `addPackageDependency(...names)`           | Pre-bundle npm packages — only when the module is enabled.                          |
| `nuxt` / `options` / `paths` / `resolvers` | Access to the Nuxt instance, the resolved options, build paths, and path resolvers. |

## What a module can contribute

- **Block components** — add a `blokkli/` directory (via `blokkliDirs` in
  `alterOptions`) to ship block components with the module.
- **CSS & content paths** — `context.addCSS` / `context.addContentPath`; see
  [Registering CSS with the editor](/modules/tailwind/#registering-css-with-the-editor).
- **Icons** — `context.addIcon`.
- **Complex option types** — a custom block option with its own editor UI; see
  [Complex Option Types](/modules/authoring/complex-option-types).
- **Adapter extensions** — extra adapter methods (analyzers, readability, …) via
  `context.registerAdapterExtension`; see [Adapter](/adapter/overview).
- **Agent tools / skills & chart types** — drop them in the module's `blokkli/`
  directory and they are discovered automatically; see
  [Agent — Custom Tools](/modules/agent/custom-tools) and
  [Charts — Custom Chart Types](/modules/charts/custom-chart-types).

## Examples

### Minimal: an adapter extension

This module registers an adapter extension and pre-bundles the npm package it
needs:

```typescript
import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '@blokkli/editor/modules'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context, helper }) {
    helper.addPackageDependency('some-scoring-lib')
    context.registerAdapterExtension(
      '@my-project/scoring',
      resolve('./runtime/adapter-extension'),
    )
  },
})
```

### Fuller: a custom editor with CSS, icons, and an option type

```typescript
import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '@blokkli/editor/modules'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context, $t }) {
    context.addCSS(resolve('./build/map-editor.css'))
    context.addContentPath(resolve('./app/map-editor'))
    context.addIcon('bk_mdi_map', 'bk_mdi_location_on-fill')

    context.registerComplexOptionType({
      id: 'map',
      typeName: 'BlokkliMapData',
      typePath: resolve('./app/types'),
      editorComponentPath: resolve('./app/map-editor/index.vue'),
      editTitle: $t('mapEditTitle', 'Edit map'),
      editorIcon: 'bk_mdi_map',
    })
  },
})
```

See [Complex Option Types](/modules/authoring/complex-option-types) for what
`registerComplexOptionType` does and how a block consumes it.
