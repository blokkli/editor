# previewTransformPlugin

Preview the output of a transform plugin without persisting changes.

## Signature

```typescript
previewTransformPlugin?: (e: {
  pluginId: string
  uuids: string[]
  config?: PluginConfigInputItem[]
}) => Promise<MutationResponseLike<T>>
```

## Parameters

### pluginId

The ID of the transform plugin to preview.

### uuids

An array of block UUIDs to apply the transform to.

### config

Optional configuration values for the plugin.

## Returns

A promise that resolves to a mutation response containing the previewed state.

## Description

This method allows users to preview the result of a transform plugin before
actually applying it. The plugin should apply its transformations without
persisting any changes or creating side effects.

The preview must produce the same result as the final transformation when
`applyTransformPlugin` is called with the same parameters.

## Example

```typescript
previewTransformPlugin: async ({ pluginId, uuids, config }) => {
  // Apply transform without persisting
  const previewState = await performTransform(pluginId, uuids, config, {
    persist: false,
  })

  return {
    success: true,
    state: previewState,
  }
}
```
