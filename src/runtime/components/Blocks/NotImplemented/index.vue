<template>
  <div class="bk bk-block-not-implemented">
    <Icon name="alert" />
    <div v-html="text" />
  </div>
</template>

<script lang="ts" setup>
import { useBlockRegistration } from '#blokkli/helpers/composables/useBlockRegistration'
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'

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
