---
description:
  Reference for the blökkli adapter pattern — how the editor integrates with
  backends, the type system, and how features extend it
---

# Adapter Skill

The adapter is blökkli's integration interface between the editor and the
backend. blökkli does not manage data — all mutations (add, delete, move,
options, etc.) are delegated to the adapter implementation.

## Core Concept

A project provides an adapter factory at a known path
(`blokkli.editAdapter.ts` in the app directory, or via the `editAdapterPath`
module option). This factory receives the adapter context and returns an adapter
instance:

```typescript
const adapter: BlokkliAdapterFactory<T> =
  (ctx: ComputedRef<AdapterContext>) => FullBlokkliAdapter<T>
```

The Drupal module provides the reference implementation. The playground uses a
mock adapter that stores data in localStorage.

## Type System

The adapter type is assembled from two parts:

### 1. Core methods (`BlokkliAdapter<T>`)

Defined in `src/runtime/editor/adapter/index.ts`. These are the base methods
every adapter must implement (e.g., `loadState`, `mapState`, `getAllBundles`,
`addNewBlock`, `moveBlock`).

### 2. Extension methods (`AdapterExtensionMethods<T>`)

An initially empty interface that features augment via TypeScript module
augmentation. For example, the analyze feature adds:

```typescript
// In src/runtime/editor/features/analyze/types.ts
declare module '#blokkli/editor/adapter' {
  interface AdapterExtensionMethods<T> {
    getAnalyzers?: () => Analyzer | Analyzer[] | Promise<Analyzer | Analyzer[]>
  }
}
```

### Combined type

```typescript
type FullBlokkliAdapter<T> = BlokkliAdapter<T> & Partial<AdapterExtensionMethods<T>>
```

This means extension methods are always optional on the adapter. Features that
need them declare `requiredAdapterMethods` in `defineBlokkliFeature()` — this
both narrows the type (making those methods required within the feature) and
prevents the feature from loading if the adapter doesn't implement them.

To see the assembled type with all augmented methods, check
`.nuxt/blokkli/features.d.ts`.

## Adapter Extensions

Beyond the main adapter, projects can register **adapter extensions** — separate
adapter-like objects identified by a namespace (e.g., `@my-org/ai`). These are
loaded via the `adapterExtensions` build template and accessed through the
`adapters` provider:

```typescript
const { adapter, adapters } = useBlokkli()

// Call the main adapter directly
adapter.loadState()

// Aggregate results from base adapter + all extensions
const results = await adapters.getAggregated('getAnalyzers')

// Route a call to a specific extension by namespace prefix
await adapters.callNamespaced('methodName', { id: '@org/ext:item-id' })
```

## Key Files

- `src/runtime/editor/adapter/index.ts` — Core types (`BlokkliAdapter`,
  `FullBlokkliAdapter`, `AdapterExtensionMethods`)
- `src/runtime/editor/providers/adapters.ts` — Runtime adapter + extensions
  provider
- `src/build/templates/definitions/editAdapter.ts` — Build template for the
  adapter import
- `src/build/templates/definitions/adapterExtensions.ts` — Build template for
  extensions
- Feature `types.ts` files — Where features augment `AdapterExtensionMethods`
