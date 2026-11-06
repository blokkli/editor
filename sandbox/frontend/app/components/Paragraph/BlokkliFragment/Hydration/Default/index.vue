<template>
  <div
    class="py-4"
    data-test="hydration-default"
    :data-test-mounted="isMounted"
  >
    <button
      type="button"
      class="border border-line px-3 py-2"
      data-test="hydration-default-button"
      :data-test-count="count"
      @click="count++"
    >
      {{ count }}
    </button>
  </div>
</template>

<script lang="ts" setup>
// For the E2E tests of `hydrate` (test/e2e-drupal/features/hydration), the
// control: without `hydrate`, it hydrates with the page. A button that counts
// its clicks and a marker that onMounted sets: both only work once the fragment
// has hydrated. Each of these fragments is self-contained, so that the tests
// can tell their code apart. Only on the dev server and in the E2E build
// (Nuxt's ignore, nuxt.config.ts).
defineBlokkliFragment({
  name: 'hydrate_default',
  label: 'Hydration: default',
  description: 'For the E2E tests only.',
})

const count = ref(0)
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})
</script>
