# Menu Button

Registers a button in the editor's main menu. Menu buttons are used for global
actions that aren't tied to a selection - like publishing, reverting changes,
opening help, or exiting the editor.

A menu button is registered with the `defineMenuButton` composable. It takes a
callback that returns a `MenuButtonPlugin` (or an array of them, or
`undefined`). The callback is reactive, so the button can update its label, type
or disabled state as the editor state changes.

## Usage

```vue
<script setup lang="ts">
import { defineMenuButton } from '#blokkli/editor/composables'

defineMenuButton(() => {
  return {
    id: 'publish',
    title: 'Publish',
    description: 'Publish all changes.',
    icon: 'bk_mdi_publish',
    type: 'success',
    callback: () => {
      // Run the action...
    },
  }
})
</script>
```

## Config

The callback returns one `MenuButtonPlugin`, an array of them, or `undefined`.

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this menu button.

### title

- **Type:** `string`
- **Required:** Yes

The title displayed on the button.

### description

- **Type:** `string`
- **Required:** Yes

A short description shown alongside the title.

### callback

- **Type:** `() => void`
- **Required:** Yes

Called when the button is clicked.

### icon

- **Type:** `BlokkliIcon`
- **Required:** No

Optional icon to display in the button.

### type

- **Type:** `'success' | 'danger' | 'yellow'`
- **Required:** No

The visual style of the button. Use `'success'` for confirming actions like
publish, `'danger'` for destructive actions, and `'yellow'` for warnings.

### weight

- **Type:** `number`
- **Required:** No

The weight, used for positioning the button. Lower weights appear first.

### secondary

- **Type:** `boolean`
- **Required:** No

Whether the button is shown in the secondary section of the menu.

### disabled

- **Type:** `boolean`
- **Required:** No

Whether the button is disabled.

## Real-World Example

### Publish Button

A publish button whose label, icon, style and disabled state all react to the
current editor state:

```vue
<script setup lang="ts">
import { defineMenuButton } from '#blokkli/editor/composables'

defineMenuButton(() => {
  return {
    id: 'publish',
    title: publishLabel.value,
    description: publishDescription.value,
    icon: icon.value,
    type: isScheduled.value ? 'yellow' : 'success',
    disabled: !mutations.value.length || !canEdit.value,
    weight: 0,
    callback: onMenuClick,
  }
})
</script>
```

## Notes

- The callback is reactive: returned values (title, type, disabled, ...) update
  automatically when their reactive sources change.
- Return `undefined` to hide the button entirely, or an array to register
  several buttons.
- The button is registered on mount and automatically removed when the component
  is unmounted.
