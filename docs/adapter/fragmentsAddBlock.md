# fragmentsAddBlock

Add a fragment block.

## Signature

```typescript
fragmentsAddBlock?: (e: {
  name: string
  host: BlokkliItemHost
  preceedingUuid: string | null
  options?: Record<string, string>
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### name

The name of the fragment to add.

### host

Information about the host field where the block should be added.

```typescript
type BlokkliItemHost = {
  type: string
  uuid: string
  fieldName: string
}
```

### preceedingUuid

UUID of the block after which the new block should be inserted, or `null` to
insert at the beginning of the field.

## Returns

A promise that resolves to a mutation response, or `undefined` if the operation
is not supported.

## Description

Fragments are predefined block configurations that can be reused across
different contexts. This method adds a new block based on a fragment definition.

Unlike library items (which are instances of existing blocks), fragments are
templates that create new block instances with predefined default values.

## Example

```typescript
fragmentsAddBlock: async ({ name, host, preceedingUuid }) => {
  const fragment = await loadFragment(name)

  const mutation = {
    type: 'addBlock',
    bundle: fragment.bundle,
    host,
    afterUuid: preceedingUuid,
    defaults: fragment.defaultValues,
  }

  const result = await applyMutation(mutation)

  return {
    success: true,
    state: result.state,
  }
}
```
