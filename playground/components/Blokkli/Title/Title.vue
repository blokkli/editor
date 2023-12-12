<template>
  <div :class="{ 'container mx-auto mt-20 lg:mt-50': !parentType }">
    <div :class="{ 'md:max-w-3xl md:mx-auto md:text-center': isCentered }">
      <p
        class="uppercase font-semibold border px-10 py-1 rounded-full inline-block text-xs mb-20"
        :class="
          isInverted
            ? 'bg-violet-900 border-violet-600 text-violet-200'
            : 'text-violet-600 bg-violet-50 border-violet-300'
        "
        v-if="tagline"
      >
        {{ tagline }}
      </p>
      <h2
        class="text-2xl lg:text-4xl font-extrabold"
        :class="{ 'text-white': isInverted }"
      >
        {{ title }}
      </h2>
      <p
        v-if="leadValue"
        class="text-md lg:text-xl mt-5 lg:mt-20"
        :class="isInverted ? 'text-slate-300' : 'text-slate-600'"
      >
        {{ leadValue }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldText } from '~/app/mock/state/Field/Text'
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'

const { parentType, fieldListType } = defineBlokkli({
  bundle: 'title',
})

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

const props = defineProps<{
  title: FieldText
  tagline: FieldText
  lead: FieldTextarea
}>()

const leadValue = computed(() => props.lead.toString())

const isCentered = computed(
  () => fieldListType.value === 'header' || !parentType.value,
)
</script>
