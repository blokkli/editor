<template>
  <div :class="{ 'container mx-auto mt-20 lg:mt-50': !parentType }">
    <div :class="{ 'md:max-w-3xl md:mx-auto md:text-center': isCentered }">
      <p
        v-if="tagline"
        v-blokkli-editable:tagline="{ label: 'Tagline', maxlength: 30 }"
        class="uppercase font-semibold border px-10 py-1 rounded-full inline-block text-xs mb-20"
        :class="
          isInverted
            ? 'bg-violet-900 border-violet-600 text-violet-200'
            : 'text-violet-600 bg-violet-50 border-violet-300'
        "
      >
        {{ tagline }}
      </p>
      <h2
        v-blokkli-editable:title="{ required: true }"
        class="text-2xl lg:text-4xl font-extrabold"
        :class="{ 'text-white': isInverted }"
        v-text="title"
      />
      <p
        v-if="lead"
        v-blokkli-editable:lead
        class="text-md lg:text-xl mt-5 lg:mt-20"
        :class="isInverted ? 'text-slate-300' : 'text-slate-600'"
        v-text="lead"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
const { parentType, fieldListType } = defineBlokkli({
  bundle: 'title',
  noAddForm: true,
  editTitle: (el) => el.querySelector('h2')?.innerText,
})

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

defineProps<{
  title: string
  tagline?: string
  lead?: string
}>()

const isCentered = computed(
  () => fieldListType.value === 'header' || !parentType.value,
)
</script>
