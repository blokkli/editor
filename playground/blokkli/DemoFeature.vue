<template>
  <PluginSidebar
    id="demo-feature"
    v-slot="{ toggleSidebar }"
    title="Playground Demo"
    icon="logo"
  >
    <div class="p-20 ck-content">
      <h3>Welcome to the blökkli demo!</h3>

      <p>
        You can freely try out all features of the editor, edit all content, add
        comments, etc. All changes are only stored in local storage of your
        browser.
      </p>

      <p>
        This demo shows every feature available in blökkli. While the
        <strong>AI Assistant</strong> feature is available, it is not actually
        performing any API requests to OpenAI. It contains pre-generated text to
        show how the feature would work.
      </p>

      <p>
        Additionally, since this is a static page with no server running, copy
        pasting images from the clipboard does not work as well.
      </p>

      <button class="bk-button bk-is-primary w-full" @click="toggleSidebar">
        Close demo pane
      </button>
    </div>
  </PluginSidebar>
</template>

<script setup lang="ts">
import { defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'demo-feature',
  label: 'Demo Playground Feature',
  description: 'Provides a simple demo feature for the playground.',
  icon: 'logo',
})
</script>
