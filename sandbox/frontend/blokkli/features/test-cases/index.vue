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
    'Triggers for editor flows used by manual testing and the E2E tests.',
  icon: 'bk_mdi_science',
  // Only in development builds: the E2E tests run against the dev server, the
  // hosted sandbox runs a production build.
  devOnly: true,
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
