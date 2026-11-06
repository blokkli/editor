<template>
  <nav :aria-label="$texts('language_switch.label', 'Language')">
    <ul class="flex text-small">
      <li v-for="item in items" :key="item.code" :lang="item.code">
        <span
          v-if="item.active"
          aria-current="page"
          class="block px-1.5 py-1 font-bold"
        >
          {{ item.code.toUpperCase() }}
        </span>
        <SiteLink
          v-else-if="item.href"
          :to="item.href"
          :hreflang="item.code"
          :title="item.label"
          class="block px-1.5 py-1 opacity-80 hover:underline hover:opacity-100"
        >
          {{ item.code.toUpperCase() }}
        </SiteLink>
        <span v-else class="block cursor-not-allowed px-1.5 py-1 opacity-40">
          {{ item.code.toUpperCase() }}
        </span>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import type { LanguageLink } from '#nuxt-language-negotiation/config'

// The colour is inherited: the switch sits on light and dark grounds.
//
// The links are useLanguageLinks()'s: on a Drupal page the translations that
// exist and that the user may view (the route query's), on a page of the
// frontend its own paths (languageMapping). A page without a translation in
// the current language shows the source content (Drupal's fallback), so the
// current language comes from the path.
const props = defineProps<{
  links: LanguageLink[]
}>()

const router = useRouter()

const items = computed(() =>
  props.links.map((link) => ({
    ...link,
    href: link.enabled ? router.resolve(link.to).href : null,
  })),
)
</script>
