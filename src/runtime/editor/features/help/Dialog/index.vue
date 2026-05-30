<template>
  <DialogModal
    id="help"
    :title="$t('featureHelpTitle', 'Help')"
    hide-buttons
    icon="bk_mdi_help"
    mono
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-help">
      <div v-if="isTourEnabled" class="bk-help-section">
        <button
          class="bk-button bk-scheme-yellow bk-is-fullwidth"
          :disabled="tour.isTouring.value"
          @click="onStartTour"
        >
          {{ $t('tourLabel', 'Take a tour') }}
        </button>
      </div>
      <div class="bk-help-section">
        <h3>{{ $t('featureHelpShortcuts', 'Shortcuts') }}</h3>
        <Shortcuts />
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli, computed, defineAsyncComponent } from '#imports'
import { DialogModal } from '#blokkli/editor/components'

const Shortcuts = defineAsyncComponent(() => import('../Shortcuts/index.vue'))

const { $t, features, tour } = useBlokkli()

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const isTourEnabled = computed(() =>
  features.mountedFeatures.value.find((v) => v.id === 'tour'),
)

function onStartTour() {
  tour.isTouring.value = true
  emit('cancel')
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
