<template>
  <footer class="on-dark bg-ink text-on-dark">
    <div class="container-wide flex flex-col gap-10 pt-12 pb-8 lg:pt-14">
      <!-- The columns, in a grid of their own, e.g. the footer's blocks. -->
      <slot />
      <div
        class="flex flex-col gap-4 border-t border-on-dark-line pt-6 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex items-center gap-3 text-white">
          <Logo class="h-11 w-auto shrink-0" />
          <p class="hyphens-none">
            <span class="block font-serif text-h3 font-semibold">
              {{ name }}
            </span>
            <span
              v-if="nameSecondary"
              class="block text-small text-on-dark-muted"
            >
              {{ nameSecondary }}
            </span>
          </p>
        </div>
        <div
          class="flex flex-col gap-3 text-small text-on-dark-muted md:flex-row md:gap-6"
        >
          <slot name="bottom" />
        </div>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
defineProps<{
  name: string
  nameSecondary?: string
}>()
</script>
