<template>
  <footer class="on-dark bg-ink text-on-dark">
    <div class="container-wide flex flex-col gap-10 pt-12 pb-8 lg:pt-14">
      <div class="grid gap-x-grid gap-y-8 md:grid-cols-2 lg:grid-cols-12">
        <div class="flex flex-col gap-4 md:col-span-2 lg:col-span-4">
          <div class="flex items-center gap-3 text-white">
            <Logo negative class="h-11 w-auto shrink-0" />
            <span class="flex flex-col hyphens-none">
              <span class="font-serif text-h3 font-semibold">{{ name }}</span>
              <span v-if="nameSecondary" class="text-small text-on-dark-muted">
                {{ nameSecondary }}
              </span>
            </span>
          </div>
          <slot name="address" />
        </div>
        <!-- The columns: each sets its span, e.g. lg:col-span-3. -->
        <slot />
      </div>
      <div
        class="flex flex-col gap-3 border-t border-on-dark-line pt-5 text-small text-on-dark-muted md:flex-row md:justify-between"
      >
        <slot name="bottom" />
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { Logo } from '#components'

defineProps<{
  name: string
  nameSecondary?: string
}>()
</script>
