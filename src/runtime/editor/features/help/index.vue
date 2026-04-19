<template>
  <PluginSidebar
    id="help"
    :title="$t('featureHelpTitle', 'Help')"
    :tour-text="$t('helpTourText', 'Shows a list of available shortcuts.')"
    icon="bk_mdi_help"
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
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'

const Shortcuts = defineAsyncComponent(() => import('./Shortcuts/index.vue'))

defineBlokkliFeature({
  id: 'help',
  icon: 'bk_mdi_help',
  label: 'Help',
  description:
    'Provides a sidebar pane with helpful information on how to use blokkli.',
  viewports: ['desktop'],
})

const { $t, features, tour } = useBlokkli()

const isTourEnabled = computed(() =>
  features.mountedFeatures.value.find((v) => v.id === 'tour'),
)
</script>

<script lang="ts">
export default {
  name: 'Help',
}
</script>

<style lang="postcss">
.bk.bk-help {
  @apply p-20;
  container-type: inline-size;

  .bk-help-section {
    &:not(:last-child) {
      @apply mb-20;
    }
    > h3 {
      @apply text-lg font-bold;
    }
  }
}
</style>
