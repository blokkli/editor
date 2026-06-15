# useBlokkliRuntimeConfig

The `useBlokkliRuntimeConfig()` composable exposes a small, runtime-only slice
of the blökkli configuration to components that render **outside** the editor —
chart renderers, custom block components, and other integrator code.

Unlike [`useBlokkli`](/composables/useBlokkli), it does **not** require the
editor to be mounted and does not throw. It only surfaces the data that userland
components legitimately need at runtime — currently the resolved color palette —
so that, for example, a chart can turn a stored blökkli color option into a
concrete hex value without pulling in the whole editor.

## Usage

```vue
<script lang="ts" setup>
import { useBlokkliRuntimeConfig } from '#imports'

const { resolveColorHex, colorPalette } = useBlokkliRuntimeConfig()
</script>
```

`useBlokkliRuntimeConfig` is auto-imported via `#imports`.

## Return value

### resolveColorHex

- **Type:** `(id: string | null | undefined) => string`

Resolves a canonical color id to its current hex string.

It first looks the id up in `app.config.blokkli.colorOptions` (the
user-overridable color map). If the id is missing, disabled (either a direct
`null` override on the id, or a `<base>: null` family-disable on a ramped
color), or `null`/`undefined` to begin with, it cascades through the enabled
`colorPalette` in order and returns the first color that resolves.

If even that yields nothing — for example when every palette entry has been
disabled — it returns a built-in fallback hex. In practice it always returns a
usable color string.

### colorPalette

- **Type:** `ComputedRef<string[]>`

An ordered, reactive list of the enabled canonical color ids. Disabled entries
are already filtered out:

- a direct `<id>: null` override drops that id, and
- a `<base>: null` family-disable drops the ramped color (`<base>.<mainShade>`).

Cycle through this list directly to assign default colors (for example for
dynamically generated chart series) — there is no need to second-guess which ids
are still live.

## Examples

### Resolving a color option to a hex

A block component that stores a blökkli color option and renders it as an inline
style:

```vue
<template>
  <div :style="{ backgroundColor }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkliRuntimeConfig } from '#imports'

const props = defineProps<{ color?: string }>()

const { resolveColorHex } = useBlokkliRuntimeConfig()

// `props.color` holds a canonical color id (or null). resolveColorHex always
// returns a valid hex string, falling back through the palette if needed.
const backgroundColor = computed(() => resolveColorHex(props.color))
</script>
```

### Assigning default colors from the palette

When data arrives at runtime (e.g. dynamic chart series) and has no explicit
color, cycle through the enabled palette:

```vue
<script lang="ts" setup>
import { computed, useBlokkliRuntimeConfig } from '#imports'

const props = defineProps<{ series: { name: string }[] }>()

const { resolveColorHex, colorPalette } = useBlokkliRuntimeConfig()

const seriesHexColors = computed(() => {
  const palette = colorPalette.value
  return props.series.map((s, i) =>
    resolveColorHex(palette[i % Math.max(palette.length, 1)]),
  )
})
</script>
```

## Notes

- This is the runtime counterpart to the editor's color configuration: editor
  components read colors through the editor providers, while
  `useBlokkliRuntimeConfig` is the surface meant for code that runs outside the
  editor.
- `colorOptions` is user-overridable via `updateAppConfig`, which deep-merges
  into `app.config.blokkli.colorOptions`. `colorPalette` reacts to those
  overrides.
- See the [charts module setup](/modules/charts/setup) for a real-world usage in
  the chart renderer.
