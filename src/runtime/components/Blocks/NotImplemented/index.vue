<template>
  <div class="bk bk-block-not-implemented">
    <Icon name="bk_mdi_warning" />
    <div v-html="text" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import { useBlockRegistration } from '#blokkli/editor/composables'

const props = defineProps<{
  uuid: string
  bundle: string
}>()

const { dom, $t } = useBlokkli()

const text = computed(() => {
  return $t(
    'blockNotImplemented',
    'Missing component for block bundle <strong>@bundle</strong>.',
  ).replace('@bundle', props.bundle)
})

useBlockRegistration(dom, props.uuid)
</script>
