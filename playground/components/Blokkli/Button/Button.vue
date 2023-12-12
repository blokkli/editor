<template>
  <div class="inline-block">
    <NuxtLink :to="href" class="button">
      {{ title }}
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import type { FieldText } from '~/app/mock/state/Field/Text'
import type { FieldUrl } from '~/app/mock/state/Field/Url'

const { options } = defineBlokkli({
  bundle: 'button',
  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'green',
      displayAs: 'colors',
      options: {
        green: '#68ab44',
        berry: '#8b106f',
        orange: '#d58925',
      },
    },
  },
})

const props = defineProps<{
  url: FieldUrl
  title: FieldText
}>()

const href = computed(() => props.url.toString())
</script>
