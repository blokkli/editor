# Iframes Setup

## Enable the module

Import the iframes module and add it to the `blokkli.modules` array. The module
requires a `viewports` option that defines the presets editors can set heights
for:

```typescript
import iframes from '@blokkli/editor/iframes'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [
      iframes({
        viewports: {
          mobile: { label: 'Mobile', width: 375 },
          tablet: { label: 'Tablet', width: 768 },
          desktop: { label: 'Desktop', width: 1440 },
        },
      }),
    ],
  },
})
```

## Module options

| Option      | Type                              | Required | Description                                  |
| ----------- | --------------------------------- | -------- | -------------------------------------------- |
| `viewports` | `Record<string, IframeViewport>`  | Yes      | Viewport presets editors can set heights for. |

Each viewport (`IframeViewport`) has:

- `label` — the human-readable name shown in the editor.
- `width` — the container width in pixels the preset represents.

The keys (`mobile`, `tablet`, …) are used internally as identifiers.

## Using iframes in a block

Heights are stored on a block as a **`json` option with
`dataType: 'iframe_heights'`**. The `dataType` binds that option to the
`iframe_heights` height editor registered by the module — you do not use
`type: 'iframe_heights'` directly.

```vue
<template>
  <div class="container mx-auto my-20">
    <BlokkliIframe :src="props.url" :heights="iframeHeights">
      <iframe
        :src="props.url"
        style="width: 100%; height: 100%; border: 0"
        scrolling="no"
      />
    </BlokkliIframe>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { BlokkliIframe } from '#blokkli/iframes/components'
import type { IframeHeightMap } from '#blokkli/iframes/types'

const { options } = defineBlokkli({
  bundle: 'iframe',
  options: {
    iframeHeight: {
      type: 'json',
      label: 'Iframe heights',
      default: '{}',
      dataType: 'iframe_heights',
    },
  },
  editor: {
    previewWidth: 800,
    icon: 'bk_mdi_fit_screen',
  },
})

const props = defineProps<{ url: string }>()

const iframeHeights = computed<IframeHeightMap>(
  () => options.value.iframeHeight || {},
)
</script>
```

`BlokkliIframe` is a wrapper, not the iframe itself: put your own `<iframe>` (or
any embed) in its default slot. It sets `container-type: inline-size` on a
wrapper element and generates `@container` queries from the height map, so the
slot height responds to the **container** width, not the window.

| Prop      | Type              | Description                                            |
| --------- | ----------------- | ----------------------------------------------------- |
| `src`     | `string`          | The embed URL (registered with the editor for previews). |
| `heights` | `IframeHeightMap` | The resolved height map from the block option.        |

### The height map

`IframeHeightMap` is a `Record<string, number>` mapping container widths (px) to
heights (px). The largest width is the default; smaller widths become
`@container (max-width: …)` breakpoints:

```typescript
// { "375": 400, "768": 600, "1440": 800 } means:
// - container ≤ 375px → 400px tall
// - container ≤ 768px → 600px tall
// - container > 768px → 800px tall (default)
```

The keys come from the `width` values of the `viewports` you configured, so
editors set one height per viewport preset.

## Aliases

When enabled, the module registers:

- `#blokkli/iframes/types` — iframe-related TypeScript types
- `#blokkli/iframes/components` — runtime components (e.g. `BlokkliIframe`)
