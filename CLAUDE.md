# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

blökkli is an interactive page editor/builder for Nuxt that integrates with any
backend through an adapter pattern. It's a Nuxt module that provides a WYSIWYG
editing experience with drag-and-drop, inline editing, and extensive
customization options.

**Key architectural concept**: blökkli is the editor only - it does not manage
data. All mutations (add, delete, move, options) are delegated to an adapter
implementation.

## Common Commands

### Development

```bash
npm run dev                    # Start playground dev server
npm run dev:minimal            # Start minimal playground
npm run dev:prepare            # Prepare dev environment (stub build)
npm run dev:build              # Generate static playground
npm run dev:start              # Serve static playground build
```

### Building & Packaging

```bash
npm run prepack                # Build module for distribution
npm run styles:build           # Build PostCSS styles
npm run styles:watch           # Watch and rebuild styles
```

### Testing & Quality

```bash
npm test                       # Run Vitest tests
npm run test:watch             # Watch mode for tests
npm run typecheck              # Type check main + playground
npm run lint                   # Lint source files
npm run lint:fix               # Auto-fix linting issues
npm run prettier               # Check code formatting
npm run prettier:fix           # Auto-fix formatting
npm run cypress:open           # Open Cypress for E2E tests
```

### Documentation

```bash
npm run docs:dev               # Start VitePress docs dev server
npm run docs:build             # Build documentation
npm run docs:preview           # Preview built docs
```

### Specialized Scripts

```bash
npm run texts                  # Process translation strings
npm run drupal-types           # Generate Drupal-specific types
```

## Architecture Overview

### Aliases

Custom TypeScript path aliases are defined in `.nuxt/tsconfig.app.json`. Here
are all custom aliases mapped to their repository-relative paths:

**blökkli Module:**

- `#blokkli-build` → `.nuxt/blokkli` - Generated build artifacts (types, runtime
  definitions)
- `#blokkli/adapter` → `src/runtime/adapter` - Adapter interface and types
- `#blokkli/analyzer` →
  `src/runtime/components/Edit/Features/Analyze/analyzers` - Content analyzer
  definitions
- `#blokkli/components` → `src/runtime/components/Edit` - Edit mode components
  (features, UI)
- `#blokkli/constants` → `src/runtime/constants` - Runtime constants
- `#blokkli/helpers` → `src/runtime/helpers` - Runtime utilities and providers
- `#blokkli/plugins` → `src/runtime/blokkliPlugins` - Plugin definitions
- `#blokkli/runtime-helpers` → `src/runtime/helpers/runtimeHelpers` - Specific
  runtime helper utilities
- `#blokkli/types` → `src/runtime/types` - Runtime type definitions

**Nuxt & Generated:**

- `#app` → `node_modules/nuxt/dist/app` - Nuxt app composables and utilities
- `#build` → `.nuxt` - Nuxt build directory
- `#components` → `.nuxt/components` - Auto-imported components
- `#imports` → `.nuxt/imports` - Auto-imported composables
- `#vue-router` → `node_modules/vue-router` - Vue Router

**GraphQL (Drupal module):**

- `#nuxt-graphql-middleware` → `.nuxt/nuxt-graphql-middleware` - GraphQL
  middleware runtime
- `#graphql-operations` → `.nuxt/graphql-operations` - Generated GraphQL
  operations

**Playground & Shared:**

- `~` or `@` → `playground/app` - Playground app directory
- `~~` or `@@` → `.` - Repository root
- `~~/helpers` → `playground/helpers` - Playground helper utilities
- `#shared` → `shared` - Shared code between runtime/build
- `#mock` → `playground/app/mock` - Mock adapter implementation

### Module Structure

```
src/
├── module.ts                  # Main Nuxt module definition
├── module/                    # Module build-time logic
│   ├── ModuleHelper.ts        # Helper for module operations
│   ├── ModuleContext.ts       # Build context management
│   └── templates/             # Code generation templates
├── runtime/                   # Runtime code (client-side)
│   ├── adapter/               # Adapter interface definition
│   ├── components/            # Vue components
│   ├── composables/           # Vue composables
│   ├── helpers/               # Runtime utilities and providers
│   └── types/                 # TypeScript types
├── Collector/                 # Build-time collectors (Icons, Features, Blocks)
├── modules/                   # Sub-modules (Drupal integration)
├── buildPlugin/               # Vite/Rollup build plugins
├── themes/                    # Editor themes
└── translations/              # UI translation files
```

### Key Architectural Patterns

#### 1. Adapter Pattern

The adapter (`src/runtime/adapter/index.ts`) is the integration interface. It
defines ~50+ methods that backends implement to handle mutations, load state,
search, etc. The Drupal adapter is the reference implementation.

#### 2. Providers System

Runtime functionality is organized into providers (in `src/runtime/helpers/`):

- `definitionProvider.ts` - Block definitions
- `selectionProvider.ts` - Block selection state
- `uiProvider.ts` - UI state management
- `domProvider.ts` - DOM operations
- `animationProvider.ts` - Animation system
- And many more...

Providers are injected using Vue's provide/inject at different levels (global,
field, block).

#### 3. Block Definition System

Blocks are defined using `defineBlokkli()` in Vue SFC components. A Vite plugin
(`buildPlugin/RuntimeDefinition.ts`) transforms these definitions at build time.
Example:

```vue
<script setup>
const { options, globalOptions } = defineBlokkli({
  bundle: 'text',
  options: {
    alignment: { type: 'radios', default: 'left' },
  },
  editor: {
    previewWidth: 700,
    editTitle: (el) => el.textContent,
  },
})
</script>
```

#### 4. Features System

Editor features are modular (comments, history, clipboard, etc.). They are
discovered at build time by the `FeatureCollector` and can be enabled/disabled
per project.

#### 5. Code Generation

The module generates TypeScript types and runtime definitions at build time:

- Block types from component definitions
- Options schemas
- Feature configurations
- Import maps

Generated code is written to `.nuxt/blokkli/` and referenced via
`#blokkli-build` alias.

### Component Discovery

Block components are discovered via glob patterns defined in `nuxt.config.ts`:

```typescript
blokkli: {
  pattern: ['~/components/Blokkli/**/*.vue']
}
```

The playground uses: `playground/app/components/Blokkli/` with subdirectories
per block type (Text, Image, Card, Grid, etc.).

### Playground

The `playground/` directory is a full Nuxt app demonstrating blökkli features.
It uses a mock adapter that stores data in localStorage. Use it to test changes
to the editor.

## Module Configuration

Key options in `nuxt.config.ts` under `blokkli` key:

- `pattern` - Glob patterns to find block components
- `itemEntityType` - Backend entity type (e.g., 'paragraph', 'block')
- `globalOptions` - Options that apply to all blocks
- `chunkNames` - Code splitting configuration
- `theme` - Editor theme name
- `editAdapterPath` - Path to custom adapter implementation
- `modules` - Sub-modules (e.g., Drupal module)

## Important Conventions

### Block Components

- Must use `defineBlokkli()` composable in `<script setup>`
- Export a `Props` type that matches the component's props
- Use `v-blokkli-editable` directive for inline editing
- Directory name typically matches bundle name (e.g., `Text/Text.vue` for bundle
  'text')

### Testing

- Unit tests use Vitest, located alongside source files as `*.spec.ts`
- E2E tests use Cypress
- Tests are excluded from the built package via the prepack script

### Type Safety

- Strict TypeScript with `noUncheckedIndexedAccess` enabled
- Generated types provide autocomplete for block bundles, options, and field
  lists
- Runtime options are type-checked using branded types

## Drupal Module

The Drupal integration (`src/modules/drupal/`) is a blökkli sub-module that:

- Provides a GraphQL-based adapter implementation
- Sets sensible defaults for Drupal-based projects
- Expects the
  [Paragraphs blökkli](https://www.drupal.org/project/paragraphs_blokkli) Drupal
  module
- Uses `nuxt-graphql-middleware` for GraphQL communication

## Working with the Codebase

### Adding a New Feature

1. Create feature component in `src/runtime/components/Edit/Features/`
2. Use `defineBlokkliFeature()` composable
3. The FeatureCollector will discover it automatically
4. Configure in module options if needed

### Modifying Block Behavior

1. Block configuration is in the `defineBlokkli()` call
2. Editor-specific behavior is in the `editor` option
3. Runtime behavior uses composables: `useBlokkli()`, `useBlokkliHelper()`

### Debugging

- The editor has built-in debug mode (check debug provider)
- Use browser DevTools, blökkli adds data attributes to elements
- Playground is the fastest way to test changes

### Style System

- Uses PostCSS with Tailwind CSS
- Main styles in `css/` directory
- Compiled to `src/runtime/css/output.css`
- Editor has themed appearance (see `src/themes/`)
