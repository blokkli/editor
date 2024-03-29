<template>
  <PluginSidebar
    id="help"
    :title="$t('featureHelpTitle', 'Help')"
    :tour-text="$t('helpTourText', 'Shows a list of available shortcuts.')"
    icon="help"
    weight="100"
    key-code="F1"
  >
    <div class="bk bk-help">
      <div v-if="isTourEnabled" class="bk-help-section">
        <button
          class="bk-button bk-is-warning bk-is-fullwidth"
          :disabled="tour.isTouring.value"
          @click="tour.isTouring.value = true"
        >
          {{ $t('tourLabel', 'Take a tour') }}
        </button>
      </div>
      <div class="bk-help-section">
        <h3>{{ $t('featureHelpShortcuts', 'Shortcuts') }}</h3>
        <Shortcuts />
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Shortcuts from './Shortcuts/index.vue'

defineBlokkliFeature({
  id: 'help',
  icon: 'help',
  label: 'Help',
  description:
    'Provides a sidebar pane with helpful information on how to use blokkli.',
  viewports: ['desktop'],
})

const { $t, features, tour } = useBlokkli()

const isTourEnabled = computed(() =>
  features.features.value.find((v) => v.id === 'tour'),
)
</script>

<script lang="ts">
export default {
  name: 'Help',
}
</script>
