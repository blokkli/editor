# Add Action

Registers a draggable "add" action in the editor's add list. Add actions are the
icons a user drags from the add list onto the page to insert new content - for
example a fragment, a library item or a template.

An add action is registered with the `defineAddAction` composable. It takes a
callback that returns an `AddAction` (or an array of them, or `undefined`). The
callback is reactive, so you can return `undefined` to hide the action based on
the current editor state.

## Usage

```vue
<script setup lang="ts">
import { defineAddAction } from '#blokkli/editor/composables'
import type { ActionPlacedData } from '#blokkli/editor/types/actions'

defineAddAction(() => {
  return {
    id: 'fragment',
    icon: 'bk_mdi_newspaper',
    color: 'accent',
    title: 'Fragment',
    weight: 20,
    callback: (action: ActionPlacedData) => {
      // The user dropped the action into a field.
    },
  }
})
</script>
```

## Config

The callback returns one `AddAction`, an array of `AddAction`s, or `undefined`.

### id

- **Type:** `string`
- **Required:** Yes

Unique identifier for this add action.

### icon

- **Type:** `BlokkliIcon`
- **Required:** Yes

The icon displayed for the draggable action.

### color

- **Type:** `'rose' | 'lime' | 'accent' | 'orange'`
- **Required:** Yes

The color used for the action's icon in the add list.

### title

- **Type:** `string`
- **Required:** Yes

The title displayed for the action.

### weight

- **Type:** `number`
- **Required:** Yes

The weight, used for positioning the action. Lower weights appear first.

### itemBundle

- **Type:** `string`
- **Required:** No

The block bundle this action will add. Used to validate that the action can be
dropped into a given field.

### description

- **Type:** `string`
- **Required:** No

An optional description, shown as help text. May contain markup.

### callback

- **Type:** `(action: ActionPlacedData) => void`
- **Required:** Yes

Called when the user drops the action into a field. Receives an
`ActionPlacedData` object describing where it was dropped:

```typescript
type ActionPlacedData = {
  preceedingUuid: string | null
  host: BlokkliItemHost
  field: BlokkliFieldElement
}
```

### enabled

- **Type:** `(item: RenderedFieldListItem) => boolean`
- **Required:** No

Optional predicate used to decide whether the action may be dropped at a
specific location.

## Real-World Example

### Add Fragment Action

```vue
<script setup lang="ts">
import { useBlokkli } from '#imports'
import { defineAddAction } from '#blokkli/editor/composables'
import type { ActionPlacedData } from '#blokkli/editor/types/actions'

const { $t, dom } = useBlokkli()

defineAddAction(() => {
  if (!isSupportedOnEntity.value || !canAddFragment.value) {
    return
  }

  return {
    id: 'fragment',
    icon: 'bk_mdi_newspaper',
    color: 'accent',
    itemBundle: fragmentBlockBundle,
    title: $t('fragmentsAddFragmentAction', 'Fragment'),
    weight: 20,
    description: $t(
      'fragmentsAddFragmentDescription',
      '<p>Drag the icon into the page to add a fragment block.</p>',
    ),
    callback: (action: ActionPlacedData) => {
      placedAction.value = action
    },
    enabled: (item) => {
      const field = dom.getRegisteredField(item.host.uuid, item.host.fieldName)
      return !!field?.allowedFragments.length
    },
  }
})
</script>
```

## Notes

- The callback is reactive: return `undefined` to hide the action when it is not
  applicable to the current state.
- Return an array to register several add actions from a single callback.
- The action is registered on mount and automatically removed when the component
  is unmounted.
