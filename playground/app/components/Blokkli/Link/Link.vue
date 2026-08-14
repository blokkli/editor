<template>
  <div class="container mt-25">
    <Component
      :is="isExternal ? 'a' : NuxtLink"
      v-bind="attributes"
      class="playground-link"
    >
      <!--
        The dotted path can't go through the directive's `:arg` shorthand — Vue
        parses `v-blokkli-editable:link.title` as arg `link` with a `title`
        modifier — so the object form is used.
      -->
      <span v-blokkli-editable="{ name: 'link.title' }">{{
        link?.title || 'Read more'
      }}</span>
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { NuxtLink } from '#components'
import type { LinkValue } from '~/mock/state/Field/UrlWithTitle'

defineBlokkli({
  bundle: 'link',
  editor: {
    addBehaviour: 'no-form',
    icon: 'bk_mdi_link',
    editTitle: (el) => el.querySelector('a')?.textContent,
  },
  // The title is a property of the `link` field, addressed by property path.
  // The override merges into the prop object rather than replacing it, so the
  // uri survives a live preview of the title.
  propsFieldMapping: {
    link: {
      type: 'editable',
      name: 'link.title',
    },
  },
})

export type Props = {
  link?: LinkValue
}

const props = defineProps<Props>()

const href = computed(() => props.link?.uri || '')

const isExternal = computed(() => href.value.startsWith('http'))

const attributes = computed(() =>
  isExternal.value ? { href: href.value } : { to: href.value },
)
</script>

<style>
@reference "~/assets/css/tailwind.css";

.playground-link {
  @apply underline text-accent-700;
}
</style>
