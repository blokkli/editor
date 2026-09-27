import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'
import { useGraphqlQuery } from '#imports'
import { useLanguage } from '~/composables/useLanguage'

/**
 * Loads the UI strings from Drupal's texts module, in the page's language.
 *
 * Anonymous users have no GraphQL access (403) and get no texts: nuxi dev then
 * shows the defaults, a production build the keys.
 */
export default defineEasyTextsLoader(
  () => {
    const language = useLanguage()
    return {
      currentLanguage: () => language,
      async load(langcode) {
        try {
          // The language picks the endpoint (/de/graphql).
          const { data } = await useGraphqlQuery('loadTexts', null, {
            clientContext: { language: langcode },
          })
          // The fragment's aliases are `context__key`.
          return Object.fromEntries(
            Object.entries(data.texts ?? {}).flatMap(([alias, text]) =>
              typeof text === 'string'
                ? [[alias.replace('__', '.'), text]]
                : [],
            ),
          )
        } catch {
          return {}
        }
      },
    }
  },
  { dependsOn: ['playground-drupal:graphql'] },
)
