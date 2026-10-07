/**
 * What's around every page (layouts/drupal.vue): the header's and the
 * footer's config pages and the main menu, loaded once per language. Pages
 * that need the menu share the layout's data.
 *
 * The query has no variables, so the language goes into the key. While the
 * next language loads, the previous one's data stays.
 */
export function useLayoutQuery() {
  const language = useLanguage()
  return useAsyncData(
    () => `layout:${language.value}`,
    () => useGraphqlQuery('layout').then((response) => response.data),
  )
}
