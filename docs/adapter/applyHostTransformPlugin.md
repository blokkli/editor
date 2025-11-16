# applyHostTransformPlugin

Apply a host transform plugin.

## Signature

```typescript
applyHostTransformPlugin?: (e: {
  pluginId: string
  config?: PluginConfigInputItem[]
}) => Promise<MutationResponseLike<T>>
```

## Parameters

### pluginId

The ID of the host transform plugin to apply.

### config

Optional configuration values for the plugin.

## Returns

A promise that resolves to a mutation response containing the updated state.

## Description

This method applies a host transform plugin to the page entity. Host transform
plugins can modify properties or fields of the page itself, such as metadata,
layout settings, or other page-level configurations.

## Example

```typescript
applyHostTransformPlugin: async ({ pluginId, config }) => {
  const result = await applyHostPlugin(pluginId, entityUuid, config)

  return {
    success: true,
    state: result.state,
  }
}
```
