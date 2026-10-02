<template>
  <BlokkliProvider v-bind="blokkliProps" :entity="props" :edit-path="url?.path">
    <PageFooter :name="siteName ?? ''">
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        field-list-type="footer"
        edit-class="min-h-24"
        class="grid gap-x-grid gap-y-8 md:grid-cols-2 lg:grid-cols-3"
      />
      <template #bottom>
        <span>© {{ siteName }}</span>
      </template>
    </PageFooter>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider, PageFooter } from '#components'
import type { ConfigPageFooterFragment } from '#graphql-operations'

// The site's footer, with its blocks as the columns. Editing happens on the
// config page's own route, where Drupal's links (e.g. the language switch)
// lead too. The name comes from the site config page.
const props = defineProps<
  ConfigPageFooterFragment & {
    siteName?: string | null
  }
>()
</script>
