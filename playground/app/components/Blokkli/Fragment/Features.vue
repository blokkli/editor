<template>
  <div
    class="container my-20 lg:my-40 flex overflow-auto gap-30 md:grid md:grid-cols-5 fragment-features gap-y-50"
  >
    <div
      v-for="feature in features"
      :key="feature.definition.id"
      class="flex flex-col items-center text-center md:gap-5"
    >
      <div
        v-html="(icons as any)[feature.definition.icon]"
        class="fragment-feature-icon fill-current w-70 h-70 flex-none bg-accent-50 rounded-full p-15 text-accent-950"
      />
      <div>
        <h3 class="font-bold lg:mb-2 md:text-lg mt-5">
          {{ feature.definition.label }}
        </h3>
        <p class="text-sm">{{ feature.definition.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineBlokkliFragment, useBlokkli } from '#imports'
import  featureDefinitions from '#blokkli-build/features-data.json'

defineBlokkliFragment({
  name: 'features_list',
  label: 'Features List',
  chunkName: 'rare',
  description: 'Renders a list of blökkli features',
  editor: {
    icon: 'bk_mdi_star_shine',
    previewWidth: 1000,
  },
})

const reactiveIcons = useBlokkli(true)?.icons
const iconsImport = !reactiveIcons
  ? await import('#blokkli-build/icons').then((v) => v.icons)
  : null

const icons = computed<Record<string, string>>(
  () => (reactiveIcons ? reactiveIcons.icons.value : iconsImport) || {},
)

const features = computed(() =>
  featureDefinitions.filter((v) => v.definition.id !== 'demo-feature'),
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
