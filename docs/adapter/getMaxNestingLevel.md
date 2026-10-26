# getMaxNestingLevel()

This method returns the deepest level that blocks may be nested at. The blocks
in a field of the host entity are on level 1, the blocks in their fields on
level 2, and so on.

The editor then doesn't offer to add or move blocks to where they, or the blocks
nested in them, would end up deeper: a drag leaves out such fields, and the
command palette has no commands to insert blocks into them. Without this method,
there's no limit.

The Drupal adapter returns 7, the limit of the Drupal module.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    // Blocks of the page, and up to two levels of blocks nested in them.
    getMaxNestingLevel: () => 3,
  }
})
```

:::
