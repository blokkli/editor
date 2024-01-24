# Options data structure

blökkli provides a way to [define options](/define-blokkli/options) directly in
the block components. These are not passed in via props, but using a separate
property on the block item.

## Example block component

Let's assume our horizontal_rule block provides an option to define the size:

::: code-group

```vue [HorizontalRule.vue]
<template>
  <hr :style="{ height: height + 'px' }" />
</template>

<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'horizontal_rule',
  // [!code focus:12]
  options: {
    size: {
      type: 'radios',
      label: 'Size',
      default: 'normal',
      options: {
        normal: 'Normal',
        large: 'Large',
      },
    },
  },
})

const height = computed(() => {
  return options.value.size === 'large' ? 5 : 1
})
</script>
```

:::

## Providing the option value

Using the `options` property on the block item we can now pass in the runtime
value of our option:

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="1"
  >
    <BlokkliField :list="blocks" name="blocks" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
const blocks = [
  {
    uuid: '5407ef47-dfbc-456b-9900-8e2577185380',
    bundle: 'horizontal_rule',
    // [!code focus:4]
    options: {
      size: 'large',
    },
  },
]
</script>
```

:::

`options` is a simple key value object, where the key matches the key of the
options in the component and the value is the selected option value.
