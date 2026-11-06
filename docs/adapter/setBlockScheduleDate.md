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

The dialog "Manage schedule" offers the dates of the block types that
[getAllBundles()](/adapter/getAllBundles) returns with `hasPublishOn` and
`hasUnpublishOn`. It sends a date only when the user changed it.

### Languages

A date applies to the block in every language: the backend should write it on
each translation. A `publish` date in the future hides the block until then, in
every language. Removing a `publish` date should publish only the translations
that had one, so that a translation held back without a date stays unpublished.

The dialog reads the current dates from each block's `editContext`:
`isPublished`, `publishOn` and `unpublishOn`, in the language being edited. When
it also has `translations`, one entry per language of the block, the dialog
lists each language's dates and status while they differ, and the user sets one
date for all of them:

```json
{
  "isPublished": false,
  "isNew": false,
  "publishOn": "2026-11-02T09:00:00.000Z",
  "unpublishOn": null,
  "translations": [
    {
      "langcode": "en",
      "isPublished": false,
      "publishOn": "2026-11-02T09:00:00.000Z",
      "unpublishOn": null
    },
    {
      "langcode": "de",
      "isPublished": true,
      "publishOn": null,
      "unpublishOn": null
    }
  ]
}
```

On a page with more than one translation, the dialog says that a date applies to
all languages.

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
