<template>
  <div
    class="container my-20 lg:my-40 flex overflow-auto gap-30 md:grid md:grid-cols-5 fragment-features gap-y-50"
  >
    <div
      v-for="feature in features"
      :key="feature.id"
      class="flex flex-col items-center text-center md:gap-5"
    >
      <Icon
        :name="feature.icon as any"
        class="fragment-feature-icon fill-current w-70 h-70 flex-none bg-accent-50 rounded-full p-15 text-accent-950"
      />
      <div>
        <h3 class="font-bold lg:mb-2 md:text-lg mt-5">
          {{ feature.label }}
        </h3>
        <p class="text-sm">{{ feature.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineBlokkliFragment } from '#imports'
import { Icon } from '#blokkli/components'
import featuresData from '#build/blokkli/features.json'

defineBlokkliFragment({
  name: 'features_list',
  label: 'Features List',
  description: 'Renders a list of blökkli features',
  editor: {
    previewWidth: 1000,
  },
})

const features = computed(() =>
  featuresData.filter((v) => v.id !== 'demo-feature').map((v) => v.definition),
)
</script>

<style lang="postcss">
.fragment-feature-icon {
  svg {
    @apply w-full h-full;
  }
}

.fragment-features {
  scroll-snap-type: both mandatory;
  overscroll-behavior-x: contain;
  > div {
    @apply px-10;
    flex: 0 0 50%;
    scroll-snap-align: center;
    &:first-child {
      margin-left: 25%;
    }
    &:last-child {
      margin-right: 25%;
    }
    @screen md {
      flex: 1;
      @apply !m-0;
    }
  }
}
</style>
