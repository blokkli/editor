<template>
  <div>
    <a :href="href" class="block">
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
    </a>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import type { FieldText } from '~/app/mock/state/Field/Text'
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'

defineBlokkli({
  bundle: 'teaser',
})

export type Props = {
  title: FieldText
  text: FieldTextarea
  url: FieldText
}

const props = defineProps<Props>()

const href = computed(() => props.url.toString())
</script>
