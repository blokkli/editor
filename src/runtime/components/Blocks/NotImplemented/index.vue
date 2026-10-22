<template>
  <div class="bk bk-block-not-implemented">
    <Icon name="bk_mdi_warning" />
    <!-- eslint-disable-next-line vue/no-v-html -- a translated text with the bundle, escaped -->
    <div v-html="text" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { useBlockRegistration } from '#blokkli/editor/composables'
import { escapeHtml } from '#blokkli/editor/helpers/string'

const props = defineProps<{
  uuid: string
  bundle: string
}>()

const { dom, $t } = useBlokkli()

const text = computed(() => {
  return $t(
    'blockNotImplemented',
    'Missing component for block bundle <strong>@bundle</strong>.',
  ).replace('@bundle', escapeHtml(props.bundle))
})

useBlockRegistration(dom, props.uuid)
</script>

<style lang="postcss">
.bk.bk-block-not-implemented {
  @apply bg-red-light text-red-normal font-medium py-15 font-sans;
  @apply text-lg;
  @apply outline outline-1 outline-red-normal/30 -outline-offset-1;
  @apply flex gap-5 items-center justify-center;

  strong {
    @apply !font-bold;
  }

  svg {
    @apply fill-current;
    @apply size-25;
  }
}
</style>
