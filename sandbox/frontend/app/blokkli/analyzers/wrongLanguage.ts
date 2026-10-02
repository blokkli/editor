import { defineAnalyzer } from '#blokkli/analyzer'
import type { AnalyzerContext } from '#blokkli/analyzer/helpers/Context'
import { hashString } from '#blokkli/analyzer/helpers/hashString'
import type { AnalyzeResult } from '#blokkli/analyzer/types'

/**
 * Shorter texts are guesses, even reliable ones: "Bring a blanket." is Danish
 * to eld. Numbers and dates don't count.
 */
const MIN_WORDS = 4

function countWords(text: string): number {
  return text.match(/\p{L}+/gu)?.length ?? 0
}

/**
 * Whether readers of the page see the element: blocks hidden in the page's
 * language ("Visible languages"), and everything inside them, are only
 * rendered while editing.
 */
function isShown(context: AnalyzerContext, element: HTMLElement): boolean {
  let block = element.closest<HTMLElement>('[data-bk-uuid]')
  while (block?.dataset.bkUuid) {
    const languages = context.getBlockOptions(
      block.dataset.bkUuid,
    )?.bkVisibleLanguages
    if (
      Array.isArray(languages) &&
      languages.length &&
      !languages.includes(context.langcode)
    ) {
      return false
    }
    block = block.parentElement?.closest<HTMLElement>('[data-bk-uuid]') ?? null
  }
  return true
}

/**
 * Whether the element is marked as text in another language, e.g. a quote
 * with a lang attribute (WCAG 3.1.2).
 */
function isMarkedAsOtherLanguage(
  context: AnalyzerContext,
  element: HTMLElement,
): boolean {
  const marked = element.closest<HTMLElement>('[lang]')
  return (
    !!marked &&
    context.providerRootElement.contains(marked) &&
    marked.lang.split('-')[0] !== context.langcode
  )
}

/**
 * Text in a language other than the page's: a translation starts as a copy of
 * the source's paragraphs, and teasers show a page that has no translation in
 * its source language. The language comes from eld (Efficient Language
 * Detector), for the texts it's sure about.
 */
export default defineAnalyzer(() => {
  return {
    id: 'blockingen:wrong-language',
    label: (_langcode, $t) =>
      $t('blockingenWrongLanguageLabel', 'Language of the texts'),
    continuous: true,
    run: async (context) => {
      // The smallest database, still about 1 MB: loaded on the first run.
      const { eld } = await import('eld/extrasmall')
      const $t = context.$t
      const names = new Intl.DisplayNames([context.interfaceLangcode], {
        type: 'language',
      })

      const texts = context
        .getTextElements()
        .filter(
          ({ text, element }) =>
            countWords(text) >= MIN_WORDS &&
            isShown(context, element) &&
            !isMarkedAsOtherLanguage(context, element),
        )
        .map(({ text, element }) => {
          const result = eld.detect(text)
          return {
            text,
            element,
            language: result.isReliable() ? result.language : '',
          }
        })

      if (!texts.length) {
        return null
      }

      const wrong = texts.filter(
        (v) => v.language && v.language !== context.langcode,
      )
      const pageLanguage = names.of(context.langcode) ?? context.langcode

      if (!wrong.length) {
        return {
          id: 'blockingen:wrong-language:valid',
          title: $t(
            'blockingenWrongLanguageValid',
            "Texts in the page's language",
          ),
          category: 'text',
          description: $t(
            'blockingenWrongLanguageValidDescription',
            'All texts are in @language.',
          ).replace('@language', pageLanguage),
          status: 'pass',
          nodes: texts.map(({ element }) => ({ targets: element })),
        } satisfies AnalyzeResult
      }

      return {
        id: 'blockingen:wrong-language:found',
        title: $t('blockingenWrongLanguage', 'Text in another language'),
        category: 'text',
        description: (wrong.length === 1
          ? $t(
              'blockingenWrongLanguageDescriptionOne',
              'One text is not in @language, the language of the page. Translate it. If the language is intended, e.g. for a quote, ignore the finding.',
            )
          : $t(
              'blockingenWrongLanguageDescription',
              '@count texts are not in @language, the language of the page. Translate them. If the language is intended, e.g. for a quote, ignore the finding.',
            ).replace('@count', String(wrong.length))
        ).replace('@language', pageLanguage),
        status: 'violation',
        impact: 'serious',
        nodes: wrong.map(({ text, element, language }) => ({
          description: $t(
            'blockingenWrongLanguageNode',
            'In @language',
          ).replace('@language', names.of(language) ?? language),
          impact: 'serious',
          uuid: context.getBlockUuid(element),
          identifier: hashString(text),
          targets: element,
        })),
      } satisfies AnalyzeResult
    },
  }
})
