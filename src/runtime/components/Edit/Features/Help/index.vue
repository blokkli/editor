<template>
  <PluginSidebar
    id="help"
    :title="$t('featureHelpTitle', 'Help')"
    icon="chat-question"
    weight="100"
  >
    <div class="bk-help">
      <div class="bk-help-section">
        <h3>{{ $t('featureHelpShortcuts', 'Shortcuts') }}</h3>
        <Shortcuts />
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Shortcuts from './Shortcuts/index.vue'

defineBlokkliFeature({
  id: 'help',
  icon: 'question',
  label: 'Help',
  description:
    'Provides a sidebar pane with helpful information on how to use blokkli.',
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Help',
}
</script>
