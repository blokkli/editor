# formFrameBuilder()

This method should build the URLs for edit forms.

Since blokkli does not implement forms for editing blocks, the forms are
rendered in an iframe. blökkli calls this method for various forms and the
method should return the URL.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import {
  defineBlokkliEditAdapter,
  type AdapterFormFrameBuilder,
} from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    formFrameBuilder: (e: AdapterFormFrameBuilder) => {
      const prefix = `/backend-form/${ctx.value.entityType}/${ctx.value.entityUuid}`
      let url = ''
      const params = new URLSearchParams()
      if (e.id === 'block:add') {
        url = '/addBlock'
        params.set('bundle', e.data.type)
        params.set('hostEntityType', e.data.host.type)
        params.set('hostEntityUuid', e.data.host.uuid)
        params.set('hostField', e.data.host.fieldName)
        if (e.data.afterUuid) {
          params.set('preceedingUuid', e.data.afterUuid)
        }
      } else if (e.id === 'block:edit') {
        url = '/editBlock'
        params.set('uuid', e.data.uuid)
      } else if (e.id === 'block:translate') {
        url = '/translateBlock'
        params.set('uuid', e.data.uuid)
        params.set('langcode', e.langcode)
      } else if (e.id === 'entity:edit') {
        url = '/editEntity'
      }

      if (url) {
        return { url: `${prefix}${url}?${params.toString()}` }
      }
      return
    },
  }
})
```

:::
