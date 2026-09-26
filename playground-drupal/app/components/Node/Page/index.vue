<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <article class="pb-20">
      <div
        v-if="entity.hero || isEditing"
        v-blokkli-droppable:field_hero_image
        class="aspect-[3/1] min-h-40 overflow-hidden bg-stone-200"
      >
        <MediaImage
          v-if="entity.hero"
          v-bind="entity.hero"
          class="size-full object-cover"
        />
      </div>
      <div class="container-content pt-12">
        <h1 v-blokkli-editable:title class="text-4xl font-bold md:text-5xl">
          {{ entity.title }}
        </h1>
        <p
          v-if="entity.lead || isEditing"
          v-blokkli-editable:field_lead
          class="mt-4 text-xl text-stone-600"
        >
          {{ entity.lead }}
        </p>
      </div>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        class="mt-10 flex flex-col gap-8"
      />
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodePageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

const props = defineProps<NodePageFragment>()
</script>
