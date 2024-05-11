# Context based block components

It's possible to define multiple components for the same block bundle and
render them based on the context. This is done using the `renderFor` property
in `defineBlokkli`.

There are two ways to define a constraint: Based on parent bundle, e.g. `{
parentBundle: 'grid' }` or based on the field list type: `{ fieldListType:
'inline' }`.

::: warning

You must define at least one component without any `renderFor` constraints that
is used as a fallback for rendering, but also for editor-specific things such
as rendering inside the library, determining the editWidth, etc.

:::

All properties of `defineBlokkli` can be set individually per component. For
example, you can define different options or editor behaviour in each bundle
component.

::: info Multiple Constraints

blökkli determines which component to render using **the first match**.
Meaning: If you define multiple `renderFor` constraints, they follow an **OR**
logic, so the first one that matches will be used.

:::

## Example

::: code-group

```vue [~/components/Blokkli/Button/Nested.vue]
<script lang="ts" setup>
defineBlokkli({
  bundle: 'button',
  renderFor: [
    {
      parentBundle: 'two_columns',
    },
    {
      parentBundle: 'grid',
    },
    {
      fieldListType: 'inline',
    },
  ],
})
</script>
```

```vue [~/components/Blokkli/Button/index.vue]
<script lang="ts" setup>
defineBlokkli({
  bundle: 'button',
})
</script>
```

:::

## Based on parent bundle

You can render a different component based on the parent block bundle.

For example, if you have a `button` block that can be placed either standalone
without any parent block or inside another block, the way it renders might be
completely different: Standalone the button might also render a container
wrapper and have different options (such as alignment). When nested, the button
should render inline with no alignment options.

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'button',
  renderFor: [
    {
      parentBundle: 'two_columns',
    },
  ],
})
</script>
```

This will use this component if it's rendered as a child of a `two_columns` block.

## Based on field list type

You can also render a different component based on the field list type:

::: code-group

```vue [~/components/Blokkli/Button/Inline.vue]
<script lang="ts" setup>
defineBlokkli({
  bundle: 'button',
  renderFor: [
    {
      fieldListType: 'inline',
    },
  ],
})
</script>
```

:::

Now, when the button is rendered inside this field:

::: code-group

```vue [~/pages/home.vue]
<template>
  <div>
    <BlokkliField :list="blocks" field-list-type="inline" />
  </div>
</template>
```

:::

It will use the `Inline.vue` component instead.
