import { test, describe, expect } from 'vitest'
import { stripTestSeams } from './mangleTransform'

describe('stripTestSeams', () => {
  test('removes static data-test attributes but keeps other attributes', () => {
    expect(
      stripTestSeams('<div data-test="comment" class="x">a</div>'),
    ).toBe('<div class="x">a</div>')
  })

  test('removes bound :data-test and v-bind:data-test attributes', () => {
    expect(
      stripTestSeams(
        '<li data-test="history-item" :data-test-history-active="i === cur" :class="{a:b}">x</li>',
      ),
    ).toBe('<li :class="{a:b}">x</li>')
    expect(
      stripTestSeams('<i v-bind:data-test-foo="bar" name="n" />'),
    ).toBe('<i name="n" />')
  })

  test('handles a bound value that contains the other quote style', () => {
    // `:data-test="'icon-' + name"` — single quotes inside a double-quoted value.
    expect(
      stripTestSeams(`<Icon :data-test="'icon-' + name" name="ghost" />`),
    ).toBe('<Icon name="ghost" />')
  })

  test('does not strip unrelated attributes like data-testid', () => {
    const input = '<span data-testid="keep" data-other="x">no strip</span>'
    expect(stripTestSeams(input)).toBe(input)
  })

  test('removes a marker-delimited code region (line comments)', () => {
    const input = [
      'const before = 1',
      '// blokkli-test-only:start',
      'useGlobalBlokkliObject().setApp(app)',
      '// blokkli-test-only:end',
      'const after = 2',
    ].join('\n')
    expect(stripTestSeams(input)).toBe('const before = 1\nconst after = 2')
  })

  test('marker stripping works regardless of comment syntax', () => {
    const html = [
      '<div>kept</div>',
      '<!-- blokkli-test-only:start -->',
      '<DebugOnly />',
      '<!-- blokkli-test-only:end -->',
    ].join('\n')
    expect(stripTestSeams(html)).toBe('<div>kept</div>\n')
  })

  test('leaves code without seams untouched', () => {
    const input = '<button class="x" @click="go">Go</button>'
    expect(stripTestSeams(input)).toBe(input)
  })
})
