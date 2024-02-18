<template>
  <Teleport to="body">
    <ViewportBlockingRect id="tour-popup" class="bk bk-tour-popup">
      <div class="bk-tour-popup-title">
        <h2>{{ $t('tourLabel', 'Take a tour') }}</h2>
        <button class="bk-tour-popup-close" @click="$emit('close')">
          <Icon name="close" />
        </button>
      </div>

      <div class="bk-tour-popup-content">
        <p>
          {{
            $t(
              'tourIntro',
              'Explore the most important features of the editor and learn how to get started using blökkli.',
            )
          }}
        </p>

        <button class="bk-button" @click="$emit('start')">
          {{ $t('tourStartButton', 'Start the tour') }}
        </button>
      </div>
    </ViewportBlockingRect>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon, ViewportBlockingRect } from '#blokkli/components'
import { useBlokkli } from '#imports'

const { $t } = useBlokkli()

defineEmits(['start', 'close'])
</script>
