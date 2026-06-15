# defineBlokkliFeature

The `defineBlokkliFeature()` composable is used inside an editor **feature**
component to declare the feature and access its runtime context. It is the
counterpart of [`defineBlokkli`](/define-blokkli) for blocks: where
`defineBlokkli` defines a block, `defineBlokkliFeature` defines a feature.

A feature is a single editor component that provides a piece of editor
functionality — comments, duplicate, clipboard, conversions, and so on. See
[Editor Features](/editor/features) for the broader picture of how features are
discovered, enabled and overridden.

## Usage

```vue
<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'

const { adapter } = defineBlokkliFeature({
  id: 'delete',
  icon: 'bk_mdi_delete',
  label: 'Delete',
  requiredAdapterMethods: ['deleteBlocks'],
  description: 'Provides an action to delete one or more blocks.',
})

const { state, selection, $t } = useBlokkli()
</script>
```

`defineBlokkliFeature` is auto-imported via `#imports`.

## Argument

`defineBlokkliFeature()` takes a single feature definition object:

### id

- **Type:** `string`
- **Required:** Yes

The unique id of the feature. Used as the storage namespace for the feature's
settings and as the key for enabling/disabling the feature.

### icon

- **Type:** `BlokkliIcon`
- **Required:** Yes

The icon used to represent the feature (e.g. in the settings dialog). See the
icon conventions for valid names.

### label

- **Type:** `string`
- **Required:** No

A human-readable label for the feature. Also used as the prefix for the
feature's debug logger.

### description

- **Type:** `string`
- **Required:** No

A short description of what the feature does, shown in the settings UI.

### requiredAdapterMethods

- **Type:** `readonly AdapterMethods[]`
- **Required:** No

The adapter methods this feature depends on. If the adapter does not implement
all of them, the feature is not loaded.

This array also **narrows the type of the returned `adapter`**: only the methods
listed here are guaranteed (non-optional) on the returned adapter, so you can
call them without optional-chaining or null checks. Methods not declared here
are not narrowed.

### settings

- **Type:** `Record<string, FeatureDefinitionSetting>`
- **Required:** No

Feature-specific settings rendered in the settings dialog. Each entry is one of:

- `checkbox` — a boolean toggle (`default: boolean`).
- `radios` — a single choice from `options` (`default: string`).
- `slider` — a numeric value with `min`, `max`, `step` (`default: number`).
- `method` — an action button that calls `method(app)`.

The shape of each setting determines the type of the matching key in the
returned `settings` (see below).

### requiredPermissions

- **Type:** `UserPermissions[]`
- **Required:** No

Permissions the current user must have for the feature to load.

### screenshot

- **Type:** `string`
- **Required:** No

Name of a screenshot image file relative to the feature directory, shown in the
settings UI.

### viewports / beta / devOnly

- `viewports` — restrict the feature to certain viewports.
- `beta` — the feature must be explicitly enabled before it loads.
- `devOnly` — the feature is only enabled in dev mode.

## Return value

`defineBlokkliFeature()` returns an object with four properties:

### adapter

The active adapter, typed so that every method listed in
`requiredAdapterMethods` is guaranteed to exist. Use it to call backend
mutations and queries:

```ts
const { adapter } = defineBlokkliFeature({
  id: 'conversions',
  icon: 'bk_mdi_swap_horizontal_circle',
  label: 'Conversions',
  requiredAdapterMethods: ['getConversions', 'convertBlocks'],
})

// Both methods are non-optional here thanks to requiredAdapterMethods.
const conversions = await adapter.getConversions()
```

### adapters

The adapters provider, for accessing the base adapter together with any adapter
extensions.

### settings

- **Type:** `ComputedRef<...>`

A reactive object of the feature's resolved setting values, keyed by the keys of
the `settings` definition and typed according to each setting's type (`checkbox`
→ `boolean`, `radios` → the option key, `slider` → `number`).

The resolved value layers, in order: the feature defaults, the user's stored
overrides, and any settings enforced (disabled) via module config.

```vue
<template>
  <Renderer :persist="settings.persist" :scroll-speed="settings.scrollSpeed" />
</template>

<script lang="ts" setup>
const { settings } = defineBlokkliFeature({
  id: 'artboard',
  label: 'Artboard',
  icon: 'artboard',
  settings: {
    persist: {
      type: 'checkbox',
      default: true,
      label: 'Persist position and zoom',
      group: 'artboard',
    },
    scrollSpeed: {
      type: 'slider',
      default: 1,
      label: 'Artboard scroll speed',
      group: 'artboard',
      min: 0.5,
      max: 1.5,
      step: 0.05,
    },
  },
})
</script>
```

### logger

A `DebugLogger` scoped to this feature (prefixed with the feature's label or
id). The feature also automatically logs when it is mounted and unmounted.

## Lifecycle

`defineBlokkliFeature()` registers the feature with the editor on mount and
unregisters it on unmount. You do not need to call any explicit
register/unregister functions — declaring the feature is enough.

## Notes

- Call it once at the top of a feature component's `<script setup>`.
- Combine it with [`useBlokkli`](/composables/useBlokkli) to access the rest of
  the editor providers (`state`, `selection`, `ui`, `$t`, …).
- See [Editor Features](/editor/features) for how features are discovered,
  configured and overridden.
