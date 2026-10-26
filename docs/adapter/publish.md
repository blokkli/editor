# publish()

This method should persist all changes made to the current host entity and
afterwards delete the edit state.

The method is called when the user clicks on "Publish" in the menu, or submits
the publish dialog.

## Signature

```typescript
publish?: (options: {
  hostEntityType: string
  hostEntityUuid: string
  closeAfterPublish?: boolean
  languages?: string[]
  revisionLogMessage?: string
}) => Promise<MutationResponseLike<T | undefined | null>>
```

## Parameters

### hostEntityType

The entity type of the host entity.

### hostEntityUuid

The UUID of the host entity.

### closeAfterPublish

Whether the editor is closed after publishing. If `false`, the method should
return an empty edit state, so that the editor shows no pending changes. If
`true`, it may return no state.

### languages

The languages whose translations to publish. The other translations keep their
status: publishing never unpublishes. Without languages, no status changes: the
changes are saved, and go live in the translations that are already published.

A backend should refuse to publish a translation whose status the user may not
change. The Drupal module does, and tells the editor which ones those are
([canChangeStatus](/editor/edit-state#translationstate-translations)).

The publish dialog sends the languages that the user ticked, while each
translation has a status of its own
([isStatusTranslatable](/editor/edit-state#translationstate-isstatustranslatable)).
Otherwise, publishing an unpublished page sends its source language: a shared
status publishes every language with it. "Save" sends none. An adapter without
[getPublishOptions()](/adapter/getPublishOptions) has no dialog: the menu button
publishes right away, without languages.

### revisionLogMessage

The revision log message, if the user wrote one.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    publish: (options) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/publish`, {
        method: 'post',
        body: {
          languages: options.languages ?? [],
          message: options.revisionLogMessage,
        },
      })
    },
  }
})
```

:::
