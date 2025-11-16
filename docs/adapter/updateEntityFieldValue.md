# updateEntityFieldValue

Update the value of a single entity field.

## Signature

```typescript
updateEntityFieldValue?: (e: {
  fieldName: string
  fieldValue: string
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### fieldName

The machine name of the field to update.

### fieldValue

The new value for the field as a string.

## Returns

A promise that resolves to a mutation response, or `undefined` if the operation
is not supported.

## Description

This method updates a field on the host entity (the page being edited) rather
than on a block. This is typically used for inline editing of page-level fields
like the page title, meta description, or other entity fields.

## Example

```typescript
updateEntityFieldValue: async ({ fieldName, fieldValue }) => {
  const mutation = {
    type: 'updateEntityField',
    fieldName,
    value: fieldValue,
  }

  const result = await applyMutation(mutation)

  return {
    success: true,
    state: result.state,
  }
}
```
