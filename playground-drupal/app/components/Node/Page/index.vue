<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <article class="sidebar-layout">
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
      <div>
        <BlokkliField name="field_paragraphs" :list="paragraphs" />
        <section
          v-if="office && contact"
          class="container-content mt-heading flex flex-col gap-4"
        >
          <h2 :id="contact.id" class="font-serif text-h2">
            {{ contact.label }}
          </h2>
          <div class="flex flex-col gap-4 border border-line p-6 md:p-8">
            <div class="flex flex-col gap-1">
              <p class="font-serif text-h3 font-semibold">
                <SiteLink
                  :to="office.url?.path"
                  class="hover:text-primary hover:underline"
                >
                  {{ office.title }}
                </SiteLink>
              </p>
              <p v-if="address">{{ address }}</p>
            </div>
            <p
              v-if="office.phone || office.email"
              class="flex flex-wrap gap-x-8 gap-y-1"
            >
              <a
                v-if="office.phone"
                :href="'tel:' + office.phone.replace(/[^+\d]/g, '')"
                class="underline"
              >
                {{ office.phone }}
              </a>
              <a
                v-if="office.email"
                :href="'mailto:' + office.email"
                class="break-words underline"
              >
                {{ office.email }}
              </a>
            </p>
            <ArrowLink :to="office.url?.path" class="self-start">
              {{ $texts('contact.office_link', 'Opening hours and location') }}
            </ArrowLink>
          </div>
        </section>
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
      </div>
      <aside :class="{ 'is-editing': isEditing }">
        <TableOfContents :list="paragraphs" :contact />
        <BlokkliField
          name="field_aside"
          :list="aside"
          field-list-type="sidebar"
          edit-class="min-h-24"
          class="container-content flex flex-col gap-10"
        />
      </aside>
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { ArrowLink, BlokkliField, BlokkliProvider, SiteLink } from '#components'
import type { BreadcrumbFragment, NodePageFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import TableOfContents from '~/components/TableOfContents/index.vue'

// The detail page: an information page, the last in its branch of the menu.
// Always the sidebar layout, no hero image. The responsible office is set in
// Drupal's form; the route query reloads it. Its contact follows the blocks,
// short: the opening hours are on the office's page. Up to three related topics
// end the main column.
const props = defineProps<
  NodePageFragment & { breadcrumb?: BreadcrumbFragment[] }
>()

const { $texts } = useEasyTexts()

// The address on one line, e.g. "Rathaus, Seestrasse 1, 9999 Blockingen".
const address = computed(() => {
  const location = props.office?.location
  return [location?.label, ...(location?.address ?? '').split('\n')]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
})

// The table of contents links to the contact, after the headings.
const contact = computed(() =>
  props.office
    ? { id: 'contact', label: $texts('contact.label', 'Contact') }
    : null,
)

// The eyebrow is the parent in the menu. The breadcrumb ends with the page
// itself; a top-level page's parent is the home page.
const parent = computed(() => {
  const items = props.breadcrumb ?? []
  return items.length > 2 ? items[items.length - 2]?.title : null
})
</script>

<style>
@reference '../../../assets/css/main.css';

/* From lg, the sidebar is a white panel to the right, cutting into the
   header's band. Below, its parts join the column: the table of contents after
   the header, the rest after the blocks. Its width and the gap are tokens
   (main.css), because container-content leaves the same room. */
@layer components {
  .sidebar-layout {
    @apply flex flex-col gap-10 pb-section;

    @variant max-lg {
      > aside {
        display: contents;
      }

      > div,
      > aside > :last-child {
        order: 1;
      }
    }

    @variant lg {
      display: grid;
      grid-template-columns: minmax(0, 1fr) var(--container-sidebar);
      grid-template-rows: auto 1fr;
      column-gap: var(--spacing-sidebar);
      max-width: calc(var(--container-wide) + var(--spacing-gutter) * 2);
      margin-inline: auto;
      padding-inline: var(--spacing-gutter);

      /* Positioned, so that it's painted over the header's band. */
      > aside {
        @apply relative mt-8 flex flex-col gap-10 self-start bg-white p-6;
        grid-column: 2;
        grid-row: 1 / span 2;
      }
    }

    /* Nothing visible in the sidebar, e.g. only a contact block whose office
       isn't available: no panel, and a field with only hidden blocks leaves no
       gap. While editing, both stay drop zones. */
    > aside:not(.is-editing) {
      &:not(:has(> * > :not(.hidden))),
      > :not(:has(> :not(.hidden))) {
        @apply hidden;
      }
    }
  }
}
</style>
