# Item Dropdown Action

Registers an entry in the dropdown menu shown for the currently selected
block(s). Use it for per-block operations that don't warrant a dedicated toolbar
button - like "convert to", clipboard actions, or debug helpers.

An item dropdown action is registered with the `defineItemDropdownAction`
composable. It takes a callback that returns an `ItemDropdownAction` (or an
array of them, or `undefined`). The callback is reactive, so you typically
inspect the current selection and return `undefined` when the action does not
apply.

## Usage

```vue
<script setup lang="ts">
import { defineItemDropdownAction } from '#blokkli/editor/composables'

defineItemDropdownAction(() => {
  return {
    id: 'my-action',
    label: 'Do something',
    group: 'custom',
    callback: () => {
      // Run the action...
    },
  }
})
</script>
```

## Config

The callback returns one `ItemDropdownAction`, an array of them, or `undefined`.

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this dropdown action.

### label

- **Type:** `string`
- **Required:** Yes

The label displayed in the dropdown.

### group

- **Type:** `string`
- **Required:** Yes

Group key used to bucket related actions together in the dropdown.

### callback

- **Type:** `() => void`
- **Required:** Yes

Called when the action is selected.

### description

- **Type:** `string`
- **Required:** No

An optional description shown alongside the label.

### enabled

- **Type:** `boolean`
- **Required:** No

Whether the action is enabled.

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

Optional icon to display for the action.

### bundle

- **Type:** `string`
- **Required:** No

An optional block bundle associated with the action.

### weight

- **Type:** `number`
- **Required:** No

The weight, used for positioning the action. Lower weights appear first.

### variant

- **Type:** `string`
- **Required:** No

An optional variant identifier, used to distinguish visual styling.

## Real-World Examples

### Conversion Actions

Offer a list of possible block conversions for the current selection:

```vue
<script setup lang="ts">
import { defineItemDropdownAction } from '#blokkli/editor/composables'

defineItemDropdownAction(() => {
  if (possibleConversions.value.length) {
    return possibleConversions.value.map((conversion) => ({
      id: 'conversion-' + conversion.id,
      label: conversion.label,
      bundle: conversion.bundle,
      group: 'conversions',
      weight: 900,
      callback: () => {
        onConvert(conversion.id)
      },
    }))
  }
})
</script>
```

### Clipboard Actions

Only available while editing and when something is selected:

```vue
<script setup lang="ts">
import { useBlokkli } from '#imports'
import { defineItemDropdownAction } from '#blokkli/editor/composables'

const { selection, state } = useBlokkli()

defineItemDropdownAction(() => {
  if (selection.items.value.length && state.editMode.value === 'editing') {
    return itemDropdownItems.value.map((item) => ({
      id: 'clipboard-' + item.id,
      label: item.label,
      icon: item.icon,
      description: item.description,
      enabled: item.enabled,
      group: 'clipboard',
      weight: 100,
      callback: () => {
        onSelectDropdownItem(item)
      },
    }))
  }
})
</script>
```

## Notes

- The callback is reactive: return `undefined` to hide the action when it does
  not apply to the current selection.
- Return an array to register several actions from a single callback.
- Use the `group` key to keep related actions visually grouped in the dropdown.
- The action is registered on mount and automatically removed when the component
  is unmounted.
