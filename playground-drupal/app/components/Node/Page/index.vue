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
              <SiteLink
                :to="office.url?.path"
                class="font-semibold text-ink hover:text-primary hover:underline"
              >
                {{ office.title }}
              </SiteLink>
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
      <BlokkliField name="field_paragraphs" :list="paragraphs" />
      <section
        v-if="related?.length || isEditing"
        class="container-content mt-flow flex flex-col gap-4 border-t-2 border-ink pt-6"
      >
        <h2 class="text-label text-muted uppercase">
          {{ $texts('related.title', 'Related topics') }}
        </h2>
        <BlokkliField
          name="field_related"
          :list="related"
          field-list-type="related"
          tag="ul"
          class="grid gap-x-grid gap-y-6 md:grid-cols-3"
          edit-class="min-h-12"
        />
      </section>
      <template #toc>
        <TableOfContents :list="paragraphs" />
      </template>
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
import { BlokkliField, BlokkliProvider, SiteLink } from '#components'
import type { BreadcrumbFragment, NodePageFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import TableOfContents from '~/components/TableOfContents/index.vue'
import { providePageOffice } from '~/composables/usePageOffice'

// The detail page: an information page, the last in its branch of the menu.
// Always the sidebar layout, no hero image. The responsible office is set in
// Drupal's form; the route query reloads it. Up to three related topics end the
// main column.
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
