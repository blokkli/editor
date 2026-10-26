<template>
  <div
    :class="[
      spacing,
      {
        'container-content': hasContainer,
        hidden: !items.length && !isEditing,
      },
    ]"
  >
    <LinkList v-if="items.length" :items />
    <p v-else class="bg-surface p-4 text-muted">
      {{
        $texts(
          'office_pages.empty',
          'No detail page has this office as its responsible office.',
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
// The detail pages the office is responsible for (their field_office), by
// title. Only on an office, usually after a title block.
// Before the await: the editor needs the definition during setup.
const block = defineBlokkliFragment({
  name: 'office_pages',
  label: {
    en: 'Pages of the office',
    de: 'Seiten des Amts',
    fr: 'Pages du service',
  },
  description: {
    en: 'The detail pages this office is responsible for.',
    de: 'Die Detailseiten, für die dieses Amt zuständig ist.',
    fr: 'Les pages de détail dont ce service est responsable.',
  },
  editor: {
    icon: 'bk_mdi_format_list_bulleted',
    previewWidth: 800,
  },
})
const { provider } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const language = useLanguage()

const variables = computed(() => ({
  filter: {
    conditions: [
      { field: 'type', value: ['page'] },
      { field: 'status', value: ['1'], language: language.value },
      {
        field: 'field_office.entity.uuid',
        value: [provider.value?.uuid ?? ''],
      },
    ],
  },
  sort: [
    { field: 'title', direction: 'ASC' as const, language: language.value },
  ],
  limit: 50,
}))

const { data } = await useAsyncGraphqlQuery('nodeList', variables)

const items = computed(() =>
  (data.value?.data.entityQuery.items ?? []).flatMap((item) =>
    item && '__typename' in item && item.label && item.url?.path
      ? [{ label: item.label, url: item.url.path }]
      : [],
  ),
)

const isEditing = import.meta.blokkliEditing
</script>
