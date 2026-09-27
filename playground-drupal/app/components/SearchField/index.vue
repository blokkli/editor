<template>
  <form role="search" class="flex flex-col gap-2" @submit.prevent>
    <label :for="id" class="text-small font-semibold">{{ label }}</label>
    <div class="flex">
      <input
        :id
        type="search"
        :placeholder
        class="min-w-0 grow border-2 border-r-0 border-ink bg-white px-4 placeholder:text-muted"
        :class="large ? 'h-14' : 'h-12'"
      />
      <button
        type="submit"
        class="flex shrink-0 items-center justify-center gap-2 bg-primary font-semibold text-white hover:bg-primary-dark"
        :class="large ? 'h-14 px-6' : 'h-12 w-13'"
        :aria-label="large ? undefined : $texts('search.submit', 'Search')"
      >
        <SpriteSymbol v-if="!large" name="search" class="size-5" />
        <template v-else>{{ $texts('search.submit', 'Search') }}</template>
      </button>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { useId } from '#imports'
import { SpriteSymbol } from '#components'

// No search yet (chunk 13g): submitting does nothing.
defineProps<{
  label: string
  placeholder?: string
  // The home page's hero: taller, with a text button.
  large?: boolean
}>()

const id = useId()
</script>
