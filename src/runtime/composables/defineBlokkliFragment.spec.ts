// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, provide } from 'vue'
import { defineBlokkliFragment } from './defineBlokkliFragment'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_USES_PROXY,
  INJECT_FRAGMENT_CONTEXT,
} from '../helpers/injections'

const UUID = 'f3a1b2c4-0000-4000-8000-000000000001'

/**
 * Mount a fragment component the way <BlokkliFragment> renders it, and return
 * the uuids it registered.
 */
function mountFragment(options: {
  isEditing: boolean
  usesProxy?: boolean
}): string[] {
  const registered: string[] = []

  const Fragment = defineComponent({
    setup() {
      defineBlokkliFragment({ name: 'test' } as never)
      return () => h('div')
    },
  })

  const Parent = defineComponent({
    setup() {
      provide(INJECT_FRAGMENT_CONTEXT, {
        uuid: UUID,
        isEditing: options.isEditing,
      } as never)
      provide(INJECT_EDIT_CONTEXT, {
        dom: {},
        useBlockRegistration: (_dom: unknown, uuid: string) =>
          registered.push(uuid),
      } as never)
      if (options.usesProxy) {
        provide(INJECT_FIELD_USES_PROXY, true)
      }
      return () => h(Fragment)
    },
  })

  const app = createApp(Parent)
  app.mount(document.createElement('div'))
  app.unmount()
  return registered
}

describe('defineBlokkliFragment', () => {
  it('registers the fragment where it is edited', () => {
    expect(mountFragment({ isEditing: true })).toEqual([UUID])
  })

  it("doesn't register it in a preview, which doesn't edit it", () => {
    expect(mountFragment({ isEditing: false })).toEqual([])
  })

  it("doesn't register it where a field in proxy mode renders it as on the site", () => {
    expect(mountFragment({ isEditing: true, usesProxy: true })).toEqual([])
  })
})
