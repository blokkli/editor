# loadStateAtIndex

Load the unchanged state at a specific history index.

## Signature

```typescript
loadStateAtIndex?: (index: number) => Promise<T | undefined>
```

## Parameters

### index

The history index to load the state from.

## Returns

A promise that resolves to the state at the given history index, or `undefined`
if the state cannot be loaded.

## Description

This method is used to load the state at a specific point in the history,
typically when the user navigates through the undo/redo history. Unlike
`loadState`, this method should return the state as it was at the given index,
without any pending mutations applied.
