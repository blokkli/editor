<template>
  <div class="py-4" data-test="hydration-idle" :data-test-mounted="isMounted">
    <button
      type="button"
      class="border border-line px-3 py-2"
      data-test="hydration-idle-button"
      :data-test-count="count"
      @click="count++"
    >
      {{ count }}
    </button>
  </div>
</template>

<script lang="ts" setup>
// For the E2E tests of `hydrate` (test/e2e-drupal/features/hydration):
// hydrates when the browser is idle. See Hydration/Default.
defineBlokkliFragment({
  name: 'hydrate_idle',
  label: 'Hydration: idle',
  description: 'For the E2E tests only.',
  hydrate: 'idle',
})

const count = ref(0)
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})
</script>
