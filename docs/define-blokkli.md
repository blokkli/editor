# defineBlokkli()

This is composable is both a runtime composable and a compiler macro. This means
that everything between defineBlokkli() is extracted at build time. blökkli uses
this to know which options should be rendered in the editor, as well as which
component to render.

# Example

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'card',
})
</script>
```

# Properties

## bundle: `string`

This is the only required property. It is used to render the correct component
in a `<BlokkliField>`.

## chunkName: `string|undefined`

blökkli can create multiple chunks that contain the components. This is useful
for larger sites that have a lot of block components. Some might be used rarely
and can be split into a separate chunk.

If left empty for all blocks, then all blocks will be part of the same (default)
import bundle.

## options: `Options`

Define options for this block that change the behaviour or appearance of the
component. The options are rendered in the editor based on the provided schema.
The option values are reactive, which means editing users see an instant preview
of how an option affects the block.

```vue
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',

  options: {
    box: {
      type: 'checkbox',
      label: 'Box',
      default: '1',
    },
  },
})
</script>
```

## globalOptions: `GlobalOptionsKey[]`

It's possible to reuse options for multiple blocks. Global options are defined
in `nuxt.config.ts` in the `blokkli.globalOptions` config. The config type is
the same as when directly defined in defineBlokkli. To make a block use a global
config, it has to be referenced here via the key.

::: code-group

```typescript [~/nuxt.config.ts]
export default defineNuxtConfig({
  blokkli: {
    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: 'bg-white',
          light: 'bg-mono-100',
          dark: 'bg-mono-800',
        },
      },
    },
  },
})
```

:::

::: code-group

```vue [~/components/Blocks/Card.vue]
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',
  globalOptions: ['background'],
})
</script>
```

:::

## editor: `BlokkliDefinitionInputEditor|undefined`

This property allows you to define the behaviour of the block when rendered in
the editor.
