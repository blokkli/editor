import type { InitDataQuery } from '#graphql-operations'

/**
 * What's around every page (layouts/drupal.vue), which plugins/initData.ts
 * loads once per language: the header's and the footer's config pages and the
 * main menu. Pages that need the menu read it here.
 */
export function useInitData() {
  const data = useState<InitDataQuery | null>('initData', () => null)

  return {
    siteConfig: computed(() => data.value?.siteConfig ?? null),
    footerConfig: computed(() => data.value?.footerConfig ?? null),
    mainMenuLinks: computed(() => data.value?.mainMenu?.links ?? []),
  }
}
