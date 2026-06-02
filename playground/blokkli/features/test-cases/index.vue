<template>
  <PluginSidebar
    id="test-cases"
    title="Test Cases"
    icon="bk_mdi_science"
    :weight="210"
    region="right"
  >
    <div class="flex flex-col gap-10 p-15">
      <p class="text-sm text-mono-600">
        Manual triggers for editor flows that are otherwise hard to reach
        (external APIs, agent, etc.). Each button also backs an E2E test via
        <code>window.__BLOKKLI__.test</code>.
      </p>

      <!-- One self-contained component per test case. Each renders its own
           trigger(s) and registers its slice of the imperative test API. -->
      <DiffApprovalCase @register="register" />
      <AgentToolCase @register="register" />
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { defineBlokkliFeature, onMounted, onBeforeUnmount } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import DiffApprovalCase from './cases/DiffApproval/index.vue'
import AgentToolCase from './cases/AgentTool/index.vue'
import type { BlokkliTestApi } from './types'

defineBlokkliFeature({
  id: 'test-cases',
  label: 'Test Cases',
  description:
    'Playground-only triggers for editor flows used by manual testing and E2E.',
  icon: 'bk_mdi_science',
  // TODO: should be `devOnly: true`, but devOnly features are stripped from
  // production builds (see src/build/templates/definitions/features.ts), and
  // E2E currently runs against a production build to avoid dev-mode HMR reloads.
  // Restore `devOnly: true` once E2E can run in dev mode.
})

// Each case component contributes its part of the imperative test API; we merge
// the fragments and expose the result on `window.__BLOKKLI__.test` so E2E specs
// can trigger flows directly. Child `mounted` runs before ours, so the fragments
// are registered before the assignment below.
const testApi: Partial<BlokkliTestApi> = {}
function register(fragment: Partial<BlokkliTestApi>) {
  Object.assign(testApi, fragment)
}

onMounted(() => {
  // TODO: unconditional for now (see the `devOnly` note above). Re-gate behind
  // `import.meta.dev` once E2E can run in dev mode.
  if (window.__BLOKKLI__) {
    window.__BLOKKLI__.test = testApi as BlokkliTestApi
  }
})

onBeforeUnmount(() => {
  if (window.__BLOKKLI__?.test) {
    delete window.__BLOKKLI__.test
  }
})
</script>

<script lang="ts">
export default {
  name: 'TestCases',
}
</script>
