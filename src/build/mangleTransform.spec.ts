import { test, describe, expect } from 'vitest'
import { mangleTemplateAndScript, stripTestSeams } from './mangleTransform'

describe('stripTestSeams', () => {
  test('removes static data-test attributes but keeps other attributes', () => {
    expect(stripTestSeams('<div data-test="comment" class="x">a</div>')).toBe(
      '<div class="x">a</div>',
    )
  })

  test('removes bound :data-test and v-bind:data-test attributes', () => {
    expect(
      stripTestSeams(
        '<li data-test="history-item" :data-test-history-active="i === cur" :class="{a:b}">x</li>',
      ),
    ).toBe('<li :class="{a:b}">x</li>')
    expect(stripTestSeams('<i v-bind:data-test-foo="bar" name="n" />')).toBe(
      '<i name="n" />',
    )
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

describe('mangleTemplateAndScript — class-bearing component props', () => {
  test('mangles static `button-class` attribute', () => {
    expect(
      mangleTemplateAndScript(
        '<Dropdown button-class="size-40 flex items-center" />',
      ),
    ).toBe('<Dropdown button-class="_bk_size-40 _bk_flex _bk_items-center" />')
  })

  test('mangles bound `:button-class` expressions', () => {
    expect(
      mangleTemplateAndScript(
        `<Dropdown :button-class="active ? 'is-on' : 'is-off'" />`,
      ),
    ).toBe(`<Dropdown :button-class="active ? '_bk_is-on' : '_bk_is-off'" />`)
  })

  test('leaves bound `v-bind:button-class` identifier expression untouched', () => {
    // Identifier expressions are never class-name contexts — only string
    // literals inside the expression get mangled.
    expect(
      mangleTemplateAndScript('<Dropdown v-bind:button-class="cls" />'),
    ).toBe('<Dropdown v-bind:button-class="cls" />')
  })

  test('mangles static `background-class` attribute', () => {
    expect(
      mangleTemplateAndScript('<Foo background-class="bg-mono-100 p-10" />'),
    ).toBe('<Foo background-class="_bk_bg-mono-100 _bk_p-10" />')
  })

  test('still mangles plain `class` and `:class`', () => {
    expect(
      mangleTemplateAndScript(
        `<div class="flex" :class="{ 'active': x }">y</div>`,
      ),
    ).toBe(`<div class="_bk_flex" :class="{ '_bk_active': x }">y</div>`)
  })

  test('does NOT mangle unrelated `*-class` attributes (e.g. data-class)', () => {
    const input = '<div data-class="literal value" />'
    expect(mangleTemplateAndScript(input)).toBe(input)
  })

  test('does NOT touch `class` value when `button-class` is also present', () => {
    expect(
      mangleTemplateAndScript(
        '<Dropdown button-class="size-40" class="wrapper" />',
      ),
    ).toBe('<Dropdown button-class="_bk_size-40" class="_bk_wrapper" />')
  })

  test('handles ColorDropdown shape exactly', () => {
    const input =
      '<Dropdown\n  position="top-left"\n  button-class="size-40 flex items-center justify-center group"\n  :teleport="popupHost ?? undefined"\n>'
    const output = mangleTemplateAndScript(input)
    expect(output).toContain(
      'button-class="_bk_size-40 _bk_flex _bk_items-center _bk_justify-center _bk_group"',
    )
  })
})
