<template>
  <div :class="{ hidden: !links.length && !isEditing }">
    <QuickLinks v-if="links.length" :items="links" />
    <p v-else-if="isEditing" class="container-wide">
      <span class="block bg-surface p-4 text-muted">
        {{
          $texts('quick_links.empty', 'Add the links on the site config page.')
        }}
      </span>
    </p>
  </div>
</template>

<script lang="ts" setup>
// The site config page's frequently searched links, for the home page only.
// They're edited on the config page.
// Before the await: the editor needs the definition during setup.
defineBlokkliFragment({
  name: 'quick_links',
  label: {
    en: 'Frequently searched',
    de: 'Häufig gesucht',
    fr: 'Recherches fréquentes',
  },
  description: {
    en: "The site config page's frequently searched links.",
    de: 'Die häufig gesuchten Links der Konfigurationsseite «Website».',
    fr: 'Les liens fréquemment recherchés de la page de configuration « Site ».',
  },
  editor: {
    icon: 'bk_mdi_manage_search',
    previewWidth: 1024,
  },
})

const { data } = await useAsyncGraphqlQuery('quickLinks')

const links = computed(() =>
  plainLinks(data.value?.data.siteConfig?.quickLinks),
)

const isEditing = import.meta.blokkliEditing
</script>
