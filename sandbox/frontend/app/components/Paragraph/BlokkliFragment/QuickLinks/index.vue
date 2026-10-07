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
  label: 'Frequently searched',
  description: "The site config page's frequently searched links.",
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
