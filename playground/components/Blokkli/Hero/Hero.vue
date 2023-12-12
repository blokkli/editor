<template>
  <div class="hero text-center py-100 bg-gradient-to-b from-slate-100 to-white">
    <div class="container">
      <h1 class="text-4xl lg:text-6xl font-extrabold max-w-5xl mx-auto">
        {{ title }}
      </h1>
      <p
        v-if="lead"
        class="mt-20 text-lg lg:text-xl text-slate-700 max-w-3xl mx-auto"
      >
        {{ lead }}
      </p>
      <BlokkliField
        v-bind="fieldButtons"
        list-class="mt-20 flex gap-10 justify-center"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { mapMockField } from '~/app/mock/state'
import type { FieldBlocks } from '~/app/mock/state/Field/Blocks'
import type { FieldText } from '~/app/mock/state/Field/Text'
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'

defineBlokkli({
  bundle: 'hero',
})

const props = defineProps<{
  title: FieldText
  lead: FieldTextarea
  buttons: FieldBlocks
}>()

const fieldButtons = computed(() => mapMockField(props.buttons))
</script>
