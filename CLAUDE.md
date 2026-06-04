# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## SKILLS!!!

You have SEVERAL skills available that you MUST use!!

- **nuxt-vue** => **MUST** use when creating or editing Vue component
- **adapter** => Use when working with the blökkli edit adapter
- **agent** => Use when working on ./src/modules/agent code !!!
- **drupal** => Use when working on ./src/modules/drupal code !!!
- **icon** => Use when you need to use an icon for the `<Icon>` component
- **styles** => Use when you need to write CSS for the editor
- **translations** => Use when you add new translations or are tasked to
  translate!
- **typecheck** => Use when you need to check Typescript types!
- **changelog** => Use when creating changelog entries for a new release
- **e2e-testing** => Use when writing, debugging, or running the Playwright E2E
  tests (`test/e2e/`)
- **agent-e2e-testing** => Use when writing or debugging tests under
  `test/e2e/features/agent/` (mock-provider scripts, tool-bypass tests)

## NON-NEGOTIABLE RULES (READ THIS EVERY TIME)

### NEVER rename in a re-export. Don't add one-off re-exports.

**Renamed re-exports are always wrong.** Do NOT write
`export type { Foo as Bar } from './x'` — it fragments the canonical name,
confuses jump-to-definition, and creates two names for the same thing.

**Don't sprinkle one-off re-exports into unrelated files.** Adding a single
`export type { Foo } from '...'` to `types/index.ts` just to make it "feel
complete" is noise — especially if nothing actually consumes the re-export. Make
consumers import from the canonical source.

**Real barrels are fine.** A file like `src/runtime/editor/components/index.ts`
that groups a set of genuinely related symbols for ergonomic import is a
legitimate pattern — that's what barrels are for. The rule above is about
gratuitous re-exports, not all re-exports.

Test: if you can't say a one-line reason the re-export belongs there (beyond
"it's convenient"), don't add it.

### Typechecks: use the npm scripts. NEVER `npx vue-tsc ...`.

The dedicated package.json scripts ARE the typecheck:

```bash
npm run typecheck:build       # build/module code  (.nuxt/tsconfig.node.json)
npm run typecheck:runtime     # runtime client code (.nuxt/tsconfig.app.json)
npm run typecheck:server      # server code (.nuxt/tsconfig.server.json)
npm run typecheck:playground  # playground app (playground/.nuxt/tsconfig.app.json)
npm run typecheck             # runs all four
```

Never improvise a `vue-tsc --project tsconfig.something.json` call. The
project's tsconfigs live under `.nuxt/`, not at the repo root, and the scripts
already encode the right paths. See the `/typecheck` skill for which targets
apply to which files.

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

**Note:** During development, the dev server is always running with hot module
replacement. Do NOT start the dev server to verify changes - it's already
running and will automatically reload. Same for styles, no need to build styles.

**Do NOT verify changes in the browser (Playwright) unless explicitly asked.**
For UI/editor changes, running the targeted typechecks and prettier is enough by
default - only reach for the browser when the user asks you to test/verify it
there.

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
npm run typecheck              # Type check all (see /typecheck skill for targeted commands)
npm run lint                   # Lint source files
npm run lint:fix               # Auto-fix linting issues
npm run format                 # Check code formatting
npm run format:fix           # Auto-fix formatting
```

### Documentation

```bash
npm run docs:dev               # Start VitePress docs dev server
npm run docs:build             # Build documentation
npm run docs:preview           # Preview built docs
```

### Specialized Scripts

```bash
npm run texts                  # Sync translation PO/JSON files (see /translations skill)
npm run material-icons         # Regenerate used-icons list (see /icons skill)
```

## Architecture Overview

### Aliases

Custom TypeScript path aliases are defined in `.nuxt/tsconfig.app.json`. Here
are all custom aliases mapped to their repository-relative paths:

**blökkli Module:**

- `#blokkli-build` → `.nuxt/blokkli` - Generated build artifacts (types, runtime
  definitions)
- `#blokkli/editor/adapter` → `src/runtime/adapter` - Adapter interface and
  types
- `#blokkli/analyzer` →
  `src/runtime/components/Edit/Features/Analyze/analyzers` - Content analyzer
  definitions
- `#blokkli/components` → `src/runtime/components/Edit` - Edit mode components
  (features, UI)
- `#blokkli/constants` → `src/runtime/constants` - Runtime constants
- `#blokkli/helpers` → `src/runtime/helpers` - Runtime utilities and providers
- `#blokkli/editor/plugins` → `src/runtime/blokkliPlugins` - Plugin definitions
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
- Tests are excluded from the built package via the prepack script

### Type Safety

- Strict TypeScript with `noUncheckedIndexedAccess` enabled
- Generated types provide autocomplete for block bundles, options, and field
  lists
- Runtime options are type-checked using branded types

## Agent Module

The agent module (`src/modules/agent/`) adds an AI assistant to the editor. See
the agent skill for full architecture details — tools, WebSocket protocol,
system prompts, skills, plans, and extensibility points.

## Drupal Module

The Drupal integration (`src/modules/drupal/`) provides a GraphQL-based adapter
for Drupal backends. See the drupal skill for details on schema introspection,
adapter methods, and configuration.

## Working with the Codebase

### Editor Architecture

Almost everything that touches the editor part of blökkli will use `useBlokkli`
which is provided by `src/runtime/editor/components/EditProvider.vue`. It
returns an object of type `BlokkliApp`. Each property is a provider, defined in
`src/runtime/editor/providers/**`.

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

**IMPORTANT**: This project uses a fully custom Tailwind config that replaces
default colors, spacing, and fonts. Standard classes like `p-4`,
`text-gray-500`, or `gap-6` do not exist. Always consult the styles skill before
writing any CSS or Tailwind classes.

DO NOT create CSS classes when it's possible to directly use tailwind utility
classes in templates!

### Translations

For all translation tasks, use the `/translations` skill. It has full details on
the PO-based i18n system, CLI commands, and workflows.
