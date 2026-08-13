# useBlokkli

The `useBlokkli()` composable returns the central editor API — the `BlokkliApp`
object. This object is what almost every editor component, feature and plugin
uses to interact with the editor: reading and mutating state, managing
selection, querying the DOM, running animations, translating strings, and more.

The API is split into a set of **providers**, each responsible for one area of
the editor (selection, state, UI, DOM, animation, …). `useBlokkli()` simply
returns the object that bundles all of them together.

## Usage

```vue
<script lang="ts" setup>
import { useBlokkli } from '#imports'

const { state, selection, $t } = useBlokkli()
</script>
```

`useBlokkli` is auto-imported, so the explicit import is optional. Most editor
code just destructures the providers it needs directly:

```vue
<script lang="ts" setup>
const { ui } = useBlokkli()
</script>
```

## The optional argument

By default `useBlokkli()` **throws** when it is called outside of edit mode
(i.e. when the editor is not mounted). This is the correct behaviour for
components that only ever render inside the editor, such as feature and plugin
components.

For components that render both inside and outside the editor — for example a
block component or a shared UI element — pass `true` to get an optional version
that returns `undefined` instead of throwing:

```vue
<script lang="ts" setup>
const app = useBlokkli(true)

// app is `BlokkliApp | undefined`.
if (app) {
  // We are inside the editor.
  app.ui.isMobile.value
}
</script>
```

- `useBlokkli()` / `useBlokkli(false)` — returns `BlokkliApp`, throws when not
  in edit mode.
- `useBlokkli(true)` — returns `BlokkliApp | undefined`, never throws.

## Return value

`useBlokkli()` returns a `BlokkliApp`. Its properties are the editor's
providers. The most commonly used ones are:

- `state` — the editor state: edit mode, mutations, history, and the
  `mutateWithLoadingState` helper used to run adapter mutations.
- `selection` — the current block selection (`uuids`, `items`, `bundles`, …).
- `ui` — UI state such as viewport, visibility of overlays, and artboard state.
- `dom` — DOM lookups for blocks, fields and their bounding rects.
- `animation` — the animation loop providers subscribe to.
- `types` / `definitions` — block bundle definitions and their configuration.
- `$t` — the translation function (see below).
- `adapter` / `adapters` — the active adapter and the adapters provider for base
  adapter plus extensions.
- `eventBus` — the editor event bus for cross-component communication.
- `keyboard`, `theme`, `commands`, `tour`, `debug`, `indicators`, `plugins`,
  `fields`, `blocks`, `permissions`, `user`, and more.

Each provider is documented conceptually together with the rest of the editor
architecture; this composable is just the entry point that exposes them.

## Translating strings

The `$t` provider is a function used to translate UI strings. It takes a
translation key and a default (source) string:

```vue
<template>
  <button>{{ $t('save', 'Save changes') }}</button>
</template>

<script lang="ts" setup>
const { $t } = useBlokkli()
</script>
```

## Examples

### Reading selection and running a mutation

```vue
<script lang="ts" setup>
const { selection, state, $t } = useBlokkli()

async function deleteSelected() {
  await state.mutateWithLoadingState(
    () => adapter.deleteBlocks(selection.uuids.value),
    $t('failedToDelete', 'The blocks could not be deleted.'),
  )
}
</script>
```

### Optional usage in a block component

A block component renders both in normal mode and inside the editor. Use the
optional form so it does not crash outside the editor:

```vue
<template>
  <div :class="{ 'is-editing': isEditing }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const app = useBlokkli(true)

const isEditing = computed(() => app?.state.editMode.value === 'editing')
</script>
```

## Notes

- Must be called inside a component that is rendered within the editor (or with
  the optional argument outside it).
- It is auto-imported via `#imports`.
- Feature components usually combine `useBlokkli()` with
  [`defineBlokkliFeature`](/composables/defineBlokkliFeature) to declare the
  feature and access its typed adapter and settings.
