<template>
  <div
    :class="{
      'container mx-auto mt-50 h-full': !parentType,
    }"
  >
    <div
      :class="{
        'p-10 lg:p-20 rounded shadow-lg border h-full': isBox,
        'bg-slate-700 border-slate-600': isBox && isInverted,
        'bg-slate-50 border-slate-300': isBox && !isInverted,
      }"
    >
      <div
        v-if="iconName"
        class="rounded w-50 h-50 p-10 mb-10"
        :class="
          isInverted
            ? 'bg-slate-900 text-slate-200'
            : 'bg-slate-200 text-slate-600'
        "
      >
        <SpriteSymbol :name="iconName" class="fill-current w-full h-full" />
      </div>
      <h3 class="font-bold text-xl" :class="{ 'text-slate-100': isInverted }">
        {{ title }}
      </h3>
      <p :class="{ 'text-slate-400': isInverted }">{{ text }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldIcon } from '~/app/mock/state/Field/Icon'
import type { FieldText } from '~/app/mock/state/Field/Text'
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'

const { parentType, options } = defineBlokkli({
  bundle: 'card',
  options: {
    box: {
      type: 'checkbox',
      label: 'Box',
      default: '0',
    },
  },
})

const props = defineProps<{
  icon: FieldIcon
  title: FieldText
  text: FieldTextarea
}>()

const iconName = computed(() => props.icon.getIconName())
const isBox = computed(() => options.value.box === '1')

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)
</script>
