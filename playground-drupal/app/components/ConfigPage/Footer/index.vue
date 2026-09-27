<template>
  <BlokkliProvider
    v-bind="blokkliProps"
    :entity="props"
    :edit-path="url?.path"
    tag="footer"
    class="bg-stone-200 py-12"
  >
    <BlokkliField
      name="field_paragraphs"
      :list="paragraphs"
      field-list-type="secondary"
      edit-class="min-h-24"
      class="container-wide grid gap-8 md:grid-cols-3"
    />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type { ConfigPageFooterFragment } from '#graphql-operations'

// Editing happens on the config page's own route, where Drupal's links (e.g.
// the language switch) lead too.
const props = defineProps<ConfigPageFooterFragment>()
</script>
