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
        :image="entity.hero"
        variant="image"
        :is-editing
      >
        <template #meta>
          <p
            v-if="createdDate?.first?.day"
            class="mb-2 font-semibold text-stone-600"
          >
            {{
              $texts('news.meta', 'News, @date', {
                '@date': createdDate.first.day,
              })
            }}
          </p>
        </template>
      </HostHeader>
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
import type { NodeNewsFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'

const props = defineProps<NodeNewsFragment>()
</script>
