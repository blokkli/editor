# Passing data to blökkli components

blökkli only requires a simple data structure to render block components. This
example shows the minimum data and code required to render a simple list of
blocks.

## Declaring the provider

The `<BlokkliProvider>` component defines the current parent/host context.
blökkli assumes that every block belongs to a single parent. This is also the
component that will render the editor.

You can have multiple `<BlokkliProvider>` components on a single page, but they
can't be nested.

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="1"
  >
  </BlokkliProvider>
</template>
```

:::

## Defining the data

blökkli automatically renders the correct block component based on the array of
block items. Each item only requires two properties:

- uuid: The unique ID of the block
- bundle: The specific block bundle (sub-type)

If the `props` property is present, blökkli will pass the value as props to the
block component.

This is what one item might look like as JSON:

```json
{
  "uuid": "96f7fbda-04d9-4662-9a6c-6aa3bcf964f2",
  "bundle": "title",
  "props": {
    "title": "Hello world"
  }
}
```

## Defining where to render the blocks

The next step is to define where the blocks should be rendered. This is done
using the `<BlokkliField>` component. It expects a prop called `:list` that is
the array of block items we defined previously and the name of the field.

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
    uuid: '96f7fbda-04d9-4662-9a6c-6aa3bcf964f2',
    bundle: 'title',
    props: {
      title: 'Hello world',
    },
  },
  {
    uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
    bundle: 'rich_text',
    props: {
      text: '<p>Lorem ipsum dolor sit amet</p>',
    },
  },
  {
    uuid: '5407ef47-dfbc-456b-9900-8e2577185380',
    bundle: 'horizontal_rule',
  },
  {
    uuid: 'f91e046b-3bcc-48dd-bbd5-8a21115436b7',
    bundle: 'link',
    options: {
      linkType: 'button',
    },
    props: {
      label: 'Learn more',
      href: '/learn-more',
    },
  },
]
</script>
```

:::

## Defining the block components

blökkli needs to know which component to render. We do that using the
defineBlokkli() composable:

```typescript
defineBlokkli({
  bundle: 'title',
})
```

Here are the components for all four block bundles. We place them in
`~/components/Blocks/`.

::: code-group

```vue [Title.vue]
<template>
  <h2>{{ title }}</h2>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',
})

defineProps<{
  title: string
}>()
</script>
```

```vue [HorizontalRule.vue]
<template>
  <hr />
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'horizontal_rule',
})
</script>
```

```vue [Text.vue]
<template>
  <div v-html="text" />
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'rich_text',
})

defineProps<{
  text: string
}>()
</script>
```

```vue [Link.vue]
<template>
  <NuxtLink :to="href">{{ label }}</NuxtLink>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'link',
})

defineProps<{
  label: string
  href: string
}>()
</script>
```

:::

blökkli will automatically scan for components that contain `defineBlokkli` in
their script tag and generate the required imports automatically.

By default the search file pattern is `'components/Blokkli/**/*.{js,ts,vue}'`.
This can be changed using the `blokkli.pattern` config option in nuxt.config.ts.

## Trying it out

When we now visit `/example` we should see all of our 4 blocks being rendered
correctly.
