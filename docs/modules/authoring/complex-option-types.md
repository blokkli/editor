# Complex Option Types

A **complex option type** is a custom block option whose value is a structured
object edited through a custom editor UI, instead of one of the built-in option
inputs (text, checkbox, radios, …). The charts and iframes modules are both
built on this mechanism — the chart editor and the iframe-height editor are
complex option types.

A complex option type has two halves:

1. A **registration** in your module that names the type and points at its
   editor component.
2. A **block** that opts into the type through a `json` option.

## Registering the type

Call `context.registerComplexOptionType` in your module's `setup`:

```typescript
context.registerComplexOptionType({
  id: 'map',
  typeName: 'BlokkliMapData',
  typePath: resolve('./app/types'),
  editorComponentPath: resolve('./app/map-editor/index.vue'),
  editTitle: $t('mapEditTitle', 'Edit map'),
  editorIcon: 'bk_mdi_map',
})
```

| Field                 | Description                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `id`                  | Unique identifier for the type. Blocks reference it via `dataType` (here, `'map'`).             |
| `typeName`            | The TypeScript type name of the stored value, exported from `typePath` (e.g. `BlokkliMapData`). |
| `typePath`            | Absolute path to the module that exports `typeName`. Used to type the option value.             |
| `editorComponentPath` | Absolute path to the Vue component that provides the editor UI.                                 |
| `editTitle`           | Title shown above the editor. Produced with `$t(key, default)` → `{ key, defaultTranslation }`. |
| `editorIcon`          | The [icon](/define-blokkli/icons) for the edit action.                                          |

## Consuming it in a block

A block opts into a complex option type with a **`json` option** whose
`dataType` matches the registered `id`:

```vue
<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import type { BlokkliMapData } from '#my-module/types'

const { options } = defineBlokkli({
  bundle: 'map',
  options: {
    map: {
      type: 'json',
      label: 'Map',
      default: '{}',
      dataType: 'map', // matches the registered complex option type id
    },
  },
  editor: {
    // Open the editor immediately when the block is added.
    addBehaviour: 'complex-option:map',
    // The block has no other inline-editable content.
    disableEdit: true,
  },
})

const mapData = computed<BlokkliMapData | null>(() => options.value.map)
</script>
```

- `dataType: '<id>'` binds the JSON option to your registered editor. You do
  **not** use `type: '<id>'`.
- `addBehaviour: 'complex-option:<optionKey>'` makes "add block" open the editor
  for that option directly. Use the option key (`map` above), not the type id.
- `disableEdit: true` is appropriate when the complex option is the block's
  primary content, so there is nothing else to edit inline.

The stored value is available as the option value, typed as `typeName`. Render
it however your block needs.

## The editor component

`editorComponentPath` points to a Vue component that reads and writes the typed
value. It receives the current value and emits updates, so the editor and the
stored option stay in sync. Rather than reproduce the contract here, use the
built-in editors as working references — the [charts](/modules/charts/setup) and
[iframes](/modules/iframes/setup) modules each ship a complete complex-option
editor.

## See also

- [Charts — Setup](/modules/charts/setup) — a complex option type in use.
- [Iframes — Setup](/modules/iframes/setup) — a simpler complex option type.
- [Authoring a Module](/modules/authoring/) — the module API.
