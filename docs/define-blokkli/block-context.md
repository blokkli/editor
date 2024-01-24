# Block Context

`defineBlokkli()` returns a context object that contains useful information.

```typescript
const ctx = defineBlokkli({
  bundle: 'title',
})
```

## uuid: `String`

This contains the UUID of the block which for example can be used for ID
attributes in the template.

## index: `ComputedRef<number>`

This is the reactive numeric index of the block relative to the field it
belongs.

One use case might be to apply special styling if the block is the first or last
in the list.

## options: `ComputedRef<Record<string, string>>`

These are the computed options of the block, if there are options defined.

The value is a key/value object of all the options, but the type is inferred
automatically based on the actual options defined.

## isEditing: `boolean`

A boolean value to indicate if the block is currently being rendered when the
editor is open.

This can be used to change what/how the component renders. One use case might be
to not render a complex slider component during editing. Or if the component
renders a large form, it could limit its height to a fixed value.

## parentType: `ComputedRef<BlockBundleWithNested | undefined>`

If the block is rendered nested (within another block), this computed property
contains the bundle of the parent block.

One example where this could be used is to always render a link as a button if
its parent is a card block.

## fieldListType: `ComputedRef<ValidFieldListTypes>`

Contains the field list type, if defined. For example, if the field that the
block is currently being rendered in defines a field list type like this:

```vue
<template>
  <BlokkliField :list="blocks" field-list-type="footer" />
</template>
```

Then the value of `ctx.fieldListType.value` will be `'footer'`.

## siblings: `ComputedRef<FieldListItemTyped[]>`

A reactive array of all the block items in the current field.

Together with `ctx.index.value` this could be used to determine the previous or
next blocks of the current block:

```vue
<script lang="ts" setup>
const { siblings, index } = defineBlokkli({
  bundle: 'text',
})

const previousBlock = computed(() => siblings.value[index.value])

const isAfterTitle = computed(() => previousBlock.value?.bundle === 'title')
</script>
```

## rootBlocks: `ComputedRef<FieldListItemTyped[]>`

A reactive array of all the root block items (ones directly rendered inside
`<BlokkliProvider>`) of the field where the current block is a descendant.

If there are no nested blocks or the current block is already in the root field,
the value will be the same as `siblings`.
