# Editor Features

In blökkli the term feature means a single feature component that provides a set
of editor features, for example comments, duplicate or clipboard integration.
Another term would be "module" or "plugin".

Every feature can be enabled or disabled at both build time or runtime. For
example, the `translation` feature is only enabled when the language context
indicates the user is editing translated content.

## Builtin features

Most of the functionality in blökkli is also implemented as features. This
allows you to completely override a feature component with your own
implementation.

## Anatomy of a feature component

Let's look at one of the builtin feature components:

```vue
<template>
  <PluginItemAction
    :title="$t('deleteButton', 'Delete')"
    :disabled="state.editMode.value !== 'editing'"
    multiple
    key-code="Delete"
    icon="delete"
    :weight="-80"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import type { DraggableExistingBlock } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { state, eventBus, $t } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'delete',
  icon: 'delete',
  label: 'Delete',
  requiredAdapterMethods: ['deleteBlocks'],
  description: 'Provides an action to delete one or more blocks.',
})

async function onClick(items: DraggableExistingBlock[]) {
  // Unselect all items.
  eventBus.emit('select:end', [])
  await state.mutateWithLoadingState(
    adapter.deleteBlocks(items.map((v) => v.uuid)),
    $t('deleteError', 'The block could not be deleted.'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Delete',
}
</script>
```

A feature component is declared using the `defineBlokkliFeature()` composable.
The `id`, `icon` and `label` properties are required.

Every feature component is rendered as a child of `<BlokkliProvider>`, but it
can easily render its content anywhere else using `<Teleport>`.

In this example, the feature makes use of the `<PluginItemAction>` component.
This will render a button in the block actions overlay that appears when a block
is selected. It renders a single button with the given label and icon. In
addition a keyboard shortcut can be provided which will trigger the `@click`
callback.

## defineBlokkliFeature

This composable + compiler macro is used to define a feature. It is required.

### dependencies: `string[]`

When set the feature will only be mounted if the defined dependencies (IDs of
other features) are mounted.

### viewports: `Viewport[]`

This allows you to only mount the feature for the given viewports. Possible
values are `'mobile' | 'desktop'`.

### requiredAdapterMethods: `Methods[]`

An array of adapter methods that must be implemented. For example, the
`comments` feature declares `['loadComments', 'addComment']` as required
methods:

```typescript
const { adapter } = defineBlokkliFeature({
  id: 'comments',
  icon: 'comment',
  label: 'Comments',
  requiredAdapterMethods: ['loadComments', 'addComment'],
  description: 'Provides comment functionality for blocks.',
})
```

In the returned `adapter` instance all the declared required adapter methods
have been made `Required` in TypeScript terms.

### settings: `Record<string, FeatureDefinitionSetting>`

A feature can additionally declare settings. These settings are displayed in the
"Settings" dialog of the editor. The settings are stored in local storage.

The returned `settings` object is a computed property containing the value of
the declarted settings. It works exactly the same as
[the block options](/define-blokkli/options).

```typescript
const { settings } = defineBlokkliFeature({
  id: 'artboard',
  label: 'Artboard',
  icon: 'artboard',
  settings: {
    persist: {
      type: 'checkbox',
      default: true,
      label: 'Persist position and zoom',
      group: 'behavior',
      viewports: ['desktop'],
    },
  },
})
```

## Custom features

Using the `alterFeatures` config option, it's possible to extend the editor with
your own feature component.

To
