<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <article class="pb-20">
      <HostHeader
        :title="entity.title"
        :lead="entity.lead"
        variant="plain"
        :is-editing
      />
      <div class="container-content mt-10">
        <div class="rounded-sm bg-stone-200 p-6">
          <OfficeDetails v-bind="props" />
        </div>
      </div>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow mt-10"
      />
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodeOfficeFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import OfficeDetails from '~/components/Office/Details/index.vue'

const props = defineProps<NodeOfficeFragment>()
</script>
