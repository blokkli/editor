// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import axe from 'axe-core'
import type { Locale } from 'axe-core'
import de from 'axe-core/locales/de.json'
import fr from 'axe-core/locales/fr.json'
import it_ from 'axe-core/locales/it.json'
import { withoutTemplates } from './axe'

const LOCALES = { de, fr, it: it_ } as unknown as Record<string, Locale>

/** Counts the calls of `new Function` while `fn` runs. */
async function countCompiles(fn: () => Promise<unknown>): Promise<number> {
  const original = globalThis.Function
  let count = 0
  globalThis.Function = new Proxy(original, {
    construct(target, args) {
      count++
      return Reflect.construct(target, args)
    },
  })
  try {
    await fn()
  } finally {
    globalThis.Function = original
  }
  return count
}

/**
 * The failure summaries of both kinds: an image without an alt text fails
 * all of the checks it needs one of ("any"), one with a space fails a check
 * that it must not ("none").
 */
async function failureSummaries(): Promise<string[]> {
  document.body.innerHTML = '<img src="a.png"><img src="b.png" alt=" ">'
  const result = await axe.run(document.body, { runOnly: ['image-alt'] })
  return result.violations.flatMap((v) =>
    v.nodes.map((n) => n.failureSummary ?? ''),
  )
}

describe('the axe analyzer', () => {
  afterEach(() => {
    axe.reset()
  })

  for (const [langcode, locale] of Object.entries(LOCALES)) {
    it(`builds ${langcode}'s failure summaries without compiling them`, async () => {
      axe.configure({ locale })
      const compiled = await failureSummaries()
      axe.reset()

      const compiles = await countCompiles(async () => {
        axe.configure({ locale: withoutTemplates(locale) })
        expect(await failureSummaries()).toEqual(compiled)
      })
      expect(compiles).toBe(0)
      // Two summaries with different headings.
      expect(new Set(compiled.map((s) => s.split('\n')[0])).size).toBe(2)
    })
  }
})
