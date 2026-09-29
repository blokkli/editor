<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
    :edit-path="url?.path"
  >
    <PageHeader
      :home-url="isEditing ? undefined : `/${language}`"
      :search-url="`/${language}/search`"
      :language-links
      :links
      :service-links="plainLinks(serviceLinks)"
    >
      <template #banner>
        <BlokkliField
          v-if="notice?.length || isEditing"
          name="field_notice"
          :list="notice"
          field-list-type="notice"
          edit-class="min-h-12"
        />
      </template>
      <template #service>
        <BlokkliField
          name="field_service_links"
          :list="serviceLinks"
          field-list-type="service"
          tag="ul"
          edit-class="min-h-10 min-w-40"
          class="flex gap-6 text-small"
        />
      </template>
      <template #name>
        <span
          v-blokkli-editable:field_site_name
          :data-placeholder="$texts('placeholder.site_name', 'Site name')"
          class="editable-placeholder"
        >
          {{ entity.siteName }}
        </span>
      </template>
    </PageHeader>
    <QuickLinks v-if="isEditing" class="py-section">
      <BlokkliField
        name="field_quick_links"
        :list="quickLinks"
        field-list-type="quick_links"
        tag="ul"
        class="grid gap-x-grid sm:grid-cols-2 lg:grid-cols-4"
        edit-class="min-h-14"
      />
    </QuickLinks>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import {
  BlokkliField,
  BlokkliProvider,
  PageHeader,
  QuickLinks,
} from '#components'
import type {
  ConfigPageSiteFragment,
  LanguageSwitchLinkFragment,
} from '#graphql-operations'
import { plainLinks } from '~/components/Paragraph/Link/target'
import { useLanguage } from '~/composables/useLanguage'

// The site's header, with the notice's banners at the top. Editing happens on
// the config page's own route, where Drupal's links (e.g. the language switch)
// lead too. The service links are edited in the bar; the menu panel below md
// gets them as links. The home page's frequently searched links are edited
// below the header.
const props = defineProps<
  ConfigPageSiteFragment & {
    languageLinks?: LanguageSwitchLinkFragment[] | null
    // The main menu's first level.
    links?: { label: string; url: string; isActive?: boolean }[]
  }
>()

const language = useLanguage()
</script>
