# setBlockScheduleDate

Schedule blocks to be published or unpublished at specific dates.

## Signature

```typescript
setBlockScheduleDate?: (
  blocks: Array<{
    uuid: string
    type: 'publish' | 'unpublish'
    date?: string
  }>
) => Promise<MutationResponseLike<T | undefined | null>>
```

## Parameters

### blocks

An array of block scheduling configurations.

#### uuid

The UUID of the block to schedule.

#### type

The type of schedule: `'publish'` or `'unpublish'`.

#### date

The ISO 8601 date and time for the schedule. If empty or undefined, removes the
schedule date.

## Returns

A promise that resolves to a mutation response containing the updated state.

## Description

This method allows scheduling individual blocks to be published or unpublished
at specific dates and times. This is useful for content that should appear or
disappear automatically based on dates (e.g., seasonal content, time-limited
offers).

## Example

```typescript
setBlockScheduleDate: async (blocks) => {
  const updates = await Promise.all(
    blocks.map((block) =>
      setBlockSchedule({
        uuid: block.uuid,
        type: block.type,
        date: block.date,
      }),
    ),
  )

  return {
    success: true,
    state: await loadCurrentState(),
  }
}
```
