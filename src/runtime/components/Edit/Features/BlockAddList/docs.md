## Selectable blocks

Renders a list of block bundles that can be added to the current page.

## Rendered bundles

The component uses the data returned by [adapter.getAllBundles] to get a list of
all block bundles. It then uses the value from [adapter.getFieldConfig] to only
render block bundles that can actually be added in the current edit session.

_can be added_ is defined as such:

- It can be added to any of the fields directly inside `<BlokkliProvider>`
- It can be added to any of the nested fields of blocks that are allowed on the
  page
