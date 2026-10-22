// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { isSafeUrl } from './index'

describe('isSafeUrl', () => {
  it('allows web pages and email addresses in links', () => {
    expect(isSafeUrl('https://example.com/a?b=c#d')).toBe(true)
    expect(isSafeUrl('http://example.com/')).toBe(true)
    expect(isSafeUrl('mailto:info@example.com')).toBe(true)
  })

  it('allows relative URLs', () => {
    expect(isSafeUrl('/en/page')).toBe(true)
    expect(isSafeUrl('page')).toBe(true)
    expect(isSafeUrl('#top')).toBe(true)
    expect(isSafeUrl('//example.com/')).toBe(true)
  })

  it('refuses other protocols', () => {
    expect(isSafeUrl('javascript:void(0)')).toBe(false)
    expect(isSafeUrl('data:text/plain,a')).toBe(false)
    expect(isSafeUrl('vbscript:a')).toBe(false)
    expect(isSafeUrl('file:///etc/hosts')).toBe(false)
  })

  it('reads the protocol as the browser does', () => {
    expect(isSafeUrl('JavaScript:void(0)')).toBe(false)
    expect(isSafeUrl(' javascript:void(0)')).toBe(false)
    expect(isSafeUrl('java\tscript:void(0)')).toBe(false)
    expect(isSafeUrl('java\nscript:void(0)')).toBe(false)
  })

  it('refuses what it cannot parse', () => {
    expect(isSafeUrl('https://exa mple.com/')).toBe(false)
  })

  it('allows only web pages in frames', () => {
    expect(isSafeUrl('https://example.com/', 'frame')).toBe(true)
    expect(isSafeUrl('/en/embed', 'frame')).toBe(true)
    expect(isSafeUrl('mailto:info@example.com', 'frame')).toBe(false)
    expect(isSafeUrl('javascript:void(0)', 'frame')).toBe(false)
  })
})
