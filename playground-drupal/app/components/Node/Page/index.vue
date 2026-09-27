<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <HostLayout sidebar :is-editing>
      <template #header>
        <HostHeader
          :title="entity.title"
          :lead="entity.lead"
          variant="plain"
          :is-editing
          :breadcrumb
        >
          <template v-if="parent" #eyebrow>{{ parent }}</template>
          <template v-if="office || changedDate?.first?.day" #meta>
            <span v-if="office">
              {{ $texts('page.responsible', 'Responsible:') }}
              <a
                :href="office.url?.path"
                class="font-semibold text-ink hover:text-primary hover:underline"
              >
                {{ office.title }}
              </a>
            </span>
            <span v-if="changedDate?.first?.day">
              {{
                $texts('page.updated', 'Updated on @date', {
                  '@date': changedDate.first.day,
                })
              }}
            </span>
          </template>
        </HostHeader>
      </template>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow"
      />
      <template #aside>
        <BlokkliField
          name="field_aside"
          :list="aside"
          :allowed-fragments="['office_contact']"
          field-list-type="sidebar"
          edit-class="min-h-24"
          class="container-content flex flex-col gap-10"
        />
      </template>
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { BreadcrumbFragment, NodePageFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import { providePageOffice } from '~/composables/usePageOffice'

// The detail page: an information page, the last in its branch of the menu.
// Always the sidebar layout, no hero image. The responsible office is set in
// Drupal's form; the route query reloads it.
const props = defineProps<
  NodePageFragment & { breadcrumb?: BreadcrumbFragment[] }
>()

providePageOffice(computed(() => props.office))

// The eyebrow is the parent in the menu. The breadcrumb ends with the page
// itself; a top-level page's parent is the home page.
const parent = computed(() => {
  const items = props.breadcrumb ?? []
  return items.length > 2 ? items[items.length - 2]?.title : null
})
</script>
