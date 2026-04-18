import * as deepl from 'deepl-node'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const deeplKey = config.deeplKey

  if (!deeplKey) {
    throw createError({
      statusCode: 500,
      message:
        'DeepL API key not configured. Set NUXT_DEEPL_KEY environment variable.',
    })
  }

  const body = await readBody(event)
  const items: Array<{
    key: string
    text: string
    sourceLanguage: string
    targetLanguage: string
  }> = body.items

  if (!items?.length) {
    throw createError({
      statusCode: 400,
      message: 'No items to translate.',
    })
  }

  const translator = new deepl.Translator(deeplKey)

  const results = await translator.translateText(
    items.map((item) => item.text),
    items[0]!.sourceLanguage as deepl.SourceLanguageCode,
    items[0]!.targetLanguage as deepl.TargetLanguageCode,
    { tagHandling: 'html' },
  )

  const translations = Array.isArray(results) ? results : [results]

  return items.map((item, index) => ({
    key: item.key,
    translatedText: translations[index]!.text,
  }))
})
