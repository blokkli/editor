# previewHostTransformPlugin

Preview the output of a host transform plugin without persisting changes.

## Signature

```typescript
previewHostTransformPlugin?: (e: {
  pluginId: string
  config?: PluginConfigInputItem[]
}) => Promise<MutationResponseLike<T>>
```

## Parameters

### pluginId

The ID of the host transform plugin to preview.

### config

Optional configuration values for the plugin.

## Returns

A promise that resolves to a mutation response containing the previewed state.

## Description

This method allows users to preview the result of a host transform plugin before
actually applying it. The plugin should apply its transformations without
persisting any changes or creating side effects.

The preview must produce the same result as the final transformation when
`applyHostTransformPlugin` is called with the same parameters.

## Example

```typescript
previewHostTransformPlugin: async ({ pluginId, config }) => {
  const previewState = await performHostTransform(pluginId, config, {
    persist: false,
  })

  return {
    success: true,
    state: previewState,
  }
}
```
