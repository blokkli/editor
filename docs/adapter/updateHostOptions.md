# updateHostOptions

Update multiple host entity options.

## Signature

```typescript
updateHostOptions?: (
  options: UpdateHostOptionEvent[]
) => Promise<MutationResponseLike<T>>
```

## Parameters

### options

An array of option update events containing the option key and value.

```typescript
type UpdateHostOptionEvent = {
  key: string
  value: string
}
```

## Returns

A promise that resolves to a mutation response containing the updated state.

## Description

This method updates options on the host entity (the page being edited) rather
than on individual blocks. Host options are defined in the provider component
and can control page-level settings.

Without this method, the editor shows the page's options but offers no change to
them. An adapter leaves it out for a user who may not change them: the Drupal
adapter does for a user who may not edit the field that holds them.

## Example

```typescript
updateHostOptions: async (options) => {
  const mutations = options.map((opt) => ({
    type: 'updateHostOption',
    key: opt.key,
    value: opt.value,
  }))

  const result = await applyMutations(mutations)

  return {
    success: true,
    state: result.state,
  }
}
```
