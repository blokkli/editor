<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
    :edit-path="url?.path"
    tag="header"
  >
    <div class="border-b border-stone-200 bg-white">
      <div class="container-wide flex items-center gap-3 py-3">
        <div
          v-if="entity.coatOfArms || isEditing"
          v-blokkli-droppable:field_coat_of_arms
          class="size-10 shrink-0"
        >
          <MediaImage
            v-if="entity.coatOfArms"
            v-bind="entity.coatOfArms"
            hide-credit
            img-class="size-10 object-contain"
          />
        </div>
        <span
          v-blokkli-editable:field_site_name
          data-placeholder="Site name"
          class="editable-placeholder text-lg font-bold"
        >
          {{ entity.siteName }}
        </span>
      </div>
    </div>
    <div class="bg-amber-100 empty:hidden">
      <BlokkliField
        name="field_notice"
        :list="notice"
        field-list-type="secondary"
        edit-class="min-h-12"
        class="container-content flow py-4"
      />
    </div>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type { ConfigPageSiteFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

// Editing happens on the config page's own route, where Drupal's links (e.g.
// the language switch) lead too.
const props = defineProps<ConfigPageSiteFragment>()
</script>
