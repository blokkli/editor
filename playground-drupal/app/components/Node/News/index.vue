<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <HostLayout>
      <template #header>
        <HostHeader
          :title="entity.title"
          :lead="entity.lead"
          :image="entity.hero"
          variant="image"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ $texts('news.label', 'News') }}</template>
          <template v-if="createdDate?.first?.day" #meta>
            {{ createdDate.first.day }}
          </template>
        </HostHeader>
      </template>
      <BlokkliField name="field_paragraphs" :list="paragraphs" class="flow" />
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type { BreadcrumbFragment, NodeNewsFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'

const props = defineProps<
  NodeNewsFragment & { breadcrumb?: BreadcrumbFragment[] }
>()
</script>
