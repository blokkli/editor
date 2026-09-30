<template>
  <form
    role="search"
    method="get"
    :action
    class="flex flex-col gap-2"
    @submit.prevent="submit"
  >
    <label :for="id" class="text-small font-semibold">{{ label }}</label>
    <div class="flex">
      <input
        :id
        ref="input"
        type="search"
        name="text"
        :value="text"
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
import {
  computed,
  navigateTo,
  useId,
  useRouter,
  useTemplateRef,
} from '#imports'
import { SpriteSymbol } from '#components'

// Searches the website: the search page (pages/search.vue) with ?text=. The
// form's action and the field's name make it work before hydration too.
defineProps<{
  label: string
  placeholder?: string
  // The home page's hero: taller, with a text button.
  large?: boolean
  // The current search, e.g. on the search page.
  text?: string
}>()

const id = useId()
const input = useTemplateRef('input')
const router = useRouter()

const action = computed(() => router.resolve({ name: 'search' }).href)

function submit() {
  const text = input.value?.value.trim()
  return navigateTo({ name: 'search', query: text ? { text } : {} })
}
</script>
