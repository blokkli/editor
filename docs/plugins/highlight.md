# Highlight

Highlights one or more blocks on the canvas with a colored marker and an
optional click action. Use it to draw attention to blocks that need the user's
attention - for example outdated translations, validation issues, or analysis
results.

A highlight is registered with the `defineHighlight` composable. It takes a
callback that returns a `HighlightItem` (or an array of them, or `undefined`).
The callback is reactive, so highlights appear and disappear automatically as
the underlying state changes.

## Usage

```vue
<script setup lang="ts">
import { defineHighlight } from '#blokkli/editor/composables'

defineHighlight(() => {
  return {
    uuid: 'block-uuid',
    color: 'yellow',
    icon: 'bk_mdi_alert',
    label: 'Needs attention',
    onClick: () => {
      // Handle the click on the highlight marker.
    },
  }
})
</script>
```

## Config

The callback returns one `HighlightItem`, an array of them, or `undefined`.

### color

- **Type:** `ThemeColorName`
- **Required:** Yes

The theme color used for the highlight marker.

### icon

- **Type:** `BlokkliIcon`
- **Required:** Yes

The icon displayed in the highlight marker.

### label

- **Type:** `string`
- **Required:** Yes

The label for the highlight.

### onClick

- **Type:** `() => void`
- **Required:** Yes

Called when the highlight marker is clicked.

### uuid

- **Type:** `string`
- **Required:** No

The UUID of the block to highlight. Provide either `uuid` or `element` to point
the highlight at a target.

### element

- **Type:** `HTMLElement`
- **Required:** No

A direct element reference to highlight, as an alternative to `uuid`.

### id

- **Type:** `string`
- **Required:** No

Optional identifier for the highlight.

### description

- **Type:** `string`
- **Required:** No

An optional description shown for the highlight.

## Real-World Example

### Outdated Translations

Highlight every block whose translation is outdated for the active language,
with a click action to mark it as up to date:

```vue
<script setup lang="ts">
import { useBlokkli } from '#imports'
import { defineHighlight } from '#blokkli/editor/composables'

const { $t, blocks } = useBlokkli()

defineHighlight(() => {
  if (!isTranslating.value) {
    return
  }
  const lang = context.value.language
  return blocks
    .getAllBlocks()
    .filter((block) => block.outdatedTranslations.includes(lang))
    .map((block) => ({
      uuid: block.uuid,
      color: 'yellow' as const,
      icon: 'bk_mdi_translate' as const,
      label: $t('outdatedTranslation', 'Outdated translation'),
      description: $t(
        'outdatedTranslationDescription',
        'Mark translation as up-to-date',
      ),
      onClick: () => onMarkUpToDate([block]),
    }))
})
</script>
```

## Notes

- The callback is reactive: highlights appear and disappear automatically as the
  data they depend on changes.
- Return `undefined` to show no highlights, or an array to highlight several
  blocks at once.
- Target a block either by its `uuid` or by passing an `element` directly.
- The highlight is registered on mount and automatically removed when the
  component is unmounted.
