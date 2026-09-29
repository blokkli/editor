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
      :service-links="plainServiceLinks"
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
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { BlokkliField, BlokkliProvider, PageHeader } from '#components'
import type {
  ConfigPageSiteFragment,
  LanguageSwitchLinkFragment,
  ParagraphLinkFragment,
} from '#graphql-operations'
import { linkTarget } from '~/components/Paragraph/Link/target'
import { useLanguage } from '~/composables/useLanguage'

// The site's header, with the notice's banners at the top. Editing happens on
// the config page's own route, where Drupal's links (e.g. the language switch)
// lead too. The service links are edited in the bar; the menu panel below md
// gets them as links.
const props = defineProps<
  ConfigPageSiteFragment & {
    languageLinks?: LanguageSwitchLinkFragment[] | null
    // The main menu's first level.
    links?: { label: string; url: string; isActive?: boolean }[]
  }
>()

const language = useLanguage()

// The field only allows links.
function isLink(
  value: ParagraphLinkFragment | object,
): value is ParagraphLinkFragment {
  return 'link' in value
}

// For the menu panel below md.
const plainServiceLinks = computed(() =>
  (props.serviceLinks ?? []).flatMap((item) => {
    if (!item?.props || !isLink(item.props)) {
      return []
    }
    const target = linkTarget(item.props.link)
    const label = item.props.title || target.label
    return target.href && label ? [{ label, url: target.href }] : []
  }),
)
</script>
