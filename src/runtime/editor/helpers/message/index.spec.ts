// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { isMessageFrom } from './index'

function createWindow(): Window {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  return iframe.contentWindow!
}

describe('isMessageFrom', () => {
  const frame = createWindow()
  const other = createWindow()
  const origin = 'https://example.com'

  it('accepts a message from the window, on the origin', () => {
    const e = new MessageEvent('message', { source: frame, origin })
    expect(isMessageFrom(e, frame, origin)).toBe(true)
  })

  it('refuses a message from another window', () => {
    const e = new MessageEvent('message', { source: other, origin })
    expect(isMessageFrom(e, frame, origin)).toBe(false)
  })

  it('refuses a message from another origin', () => {
    const e = new MessageEvent('message', {
      source: frame,
      origin: 'https://example.org',
    })
    expect(isMessageFrom(e, frame, origin)).toBe(false)
  })

  it('refuses every message without a window or an origin', () => {
    const e = new MessageEvent('message', { source: null, origin })
    expect(isMessageFrom(e, null, origin)).toBe(false)
    expect(isMessageFrom(e, undefined, origin)).toBe(false)

    const opaque = new MessageEvent('message', {
      source: frame,
      origin: 'null',
    })
    expect(isMessageFrom(opaque, frame, null)).toBe(false)
  })
})
