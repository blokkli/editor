# import.meta.blokkliEditing

`import.meta.blokkliEditing` is a build-time boolean that indicates whether the
block component is being rendered inside the editor. It is replaced at build
time by a Vite plugin:

- In the **editor bundle**: replaced with `true`
- In the **public bundle**: replaced with `false`

Because the value is a compile-time constant, any code inside a
`if (import.meta.blokkliEditing)` branch is **completely tree-shaken** from the
public bundle. This makes it the preferred way to conditionally include
editor-only logic.

## Usage

```vue
<template>
  <div>
    <Slider v-if="!isEditing" :slides="slides" />
    <div v-else>
      <div v-for="slide in slides" :key="slide.uuid">
        <img :src="slide.image" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'slider',
})

const isEditing = import.meta.blokkliEditing

defineProps<{
  slides: any[]
}>()
</script>
```

In the public bundle, the `Slider` component import is kept and the `v-else`
branch is removed entirely. In the editor bundle, the opposite happens.

## In Templates

You can use `import.meta.blokkliEditing` directly in template expressions:

```vue
<template>
  <div
    :class="{
      'pointer-events-none': import.meta.blokkliEditing,
    }"
  >
    <InteractiveWidget />
  </div>
</template>
```

## In Script

Use it in `<script setup>` to guard editor-only logic:

```vue
<script lang="ts" setup>
if (import.meta.blokkliEditing) {
  // This entire block is removed from the public bundle.
  console.log('Running inside the editor')
}
</script>
```

## Why Not `isEditing`?

The `isEditing` property returned by `defineBlokkli()` is a runtime boolean. It
is evaluated at runtime, which means the editor-only code is still included in
the public bundle — it just doesn't execute.

`import.meta.blokkliEditing` is resolved at **build time**, so editor-only code
is physically removed from the public bundle via dead code elimination. This
reduces bundle size and avoids shipping unnecessary code to end users.

::: warning
`isEditing` from `defineBlokkli()` is deprecated. Use
`import.meta.blokkliEditing` instead.
:::
