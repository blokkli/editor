<template>
  <div class="flex grow flex-col">
    <ConfigPageSite
      v-if="siteConfig"
      v-bind="siteConfig"
      :language-links
      :links="menuLinks"
    />
    <main id="main" class="grow overflow-x-clip">
      <slot />
    </main>
    <ConfigPageFooter
      v-if="footerConfig"
      v-bind="footerConfig"
      :site-name="siteConfig?.siteName"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useRoute } from '#imports'
import { ConfigPageFooter, ConfigPageSite } from '#components'
import type {
  BreadcrumbFragment,
  ConfigPageFooterFragment,
  ConfigPageSiteFragment,
  LanguageSwitchLinkFragment,
} from '#graphql-operations'
import type { MenuTree } from '~/helpers/menu'

// The site around a page's content: the header with the main menu, and the
// footer. Their config pages come from the page's route query.
const props = defineProps<{
  siteConfig?: ConfigPageSiteFragment | null
  footerConfig?: ConfigPageFooterFragment | null
  // The main menu.
  menu: MenuTree[]
  breadcrumb?: BreadcrumbFragment[]
  languageLinks?: LanguageSwitchLinkFragment[] | null
}>()

const route = useRoute()

// The header shows the main menu's first level. A link is active when it's in
// the breadcrumb or the current page.
const menuLinks = computed(() => {
  const trail = (props.breadcrumb ?? []).map((item) => item.url.path)
  return props.menu.flatMap(({ link }) => {
    const url = link.url?.path
    return url
      ? [
          {
            label: link.label,
            url,
            isActive: url === route.path || trail.includes(url),
          },
        ]
      : []
  })
})
</script>
