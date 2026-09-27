<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
    :edit-path="url?.path"
  >
    <PageHeader
      :home-url="isEditing ? undefined : `/${language}`"
      :language-links
    >
      <template #logo>
        <div
          v-blokkli-droppable:field_coat_of_arms
          class="h-11 shrink-0 lg:h-12"
        >
          <MediaImage
            v-if="entity.coatOfArms"
            v-bind="entity.coatOfArms"
            hide-credit
            class="h-full"
            img-class="h-full w-auto object-contain"
          />
          <Logo v-else class="h-full w-auto" />
        </div>
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
    <div v-if="notice?.length || isEditing" class="bg-warning-light">
      <div class="container-wide flex gap-3 py-3">
        <SpriteSymbol
          name="warning"
          class="mt-0.5 size-6 shrink-0 text-warning"
        />
        <BlokkliField
          name="field_notice"
          :list="notice"
          field-list-type="notice"
          edit-class="min-h-12"
          class="flex grow flex-col gap-2"
        />
      </div>
    </div>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import {
  BlokkliField,
  BlokkliProvider,
  Logo,
  PageHeader,
  SpriteSymbol,
} from '#components'
import type {
  ConfigPageSiteFragment,
  LanguageSwitchLinkFragment,
} from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import { useLanguage } from '~/composables/useLanguage'

// The site's header and notice. Editing happens on the config page's own
// route, where Drupal's links (e.g. the language switch) lead too. Without a
// coat of arms, the Logo stands in.
const props = defineProps<
  ConfigPageSiteFragment & {
    languageLinks?: LanguageSwitchLinkFragment[] | null
  }
>()

const language = useLanguage()
</script>
