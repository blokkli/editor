<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <SettingsDialog v-if="showSettings" @cancel="onClose" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  defineAsyncComponent,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import {
  addElementClasses,
  defineMenuButton,
} from '#blokkli/editor/composables'

const SettingsDialog = defineAsyncComponent(() => import('./Dialog/index.vue'))

const { settings } = defineBlokkliFeature({
  id: 'settings',
  label: 'Settings',
  icon: 'bk_mdi_settings',
  description: 'Provides a menu button to display a settings dialog.',

  settings: {
    useAnimations: {
      type: 'checkbox',
      default: true,
      label: 'Use animations',
      description:
        'Animates UI elements like dialogs or drawers or interactions like drag and drop or scroll changes.',
      group: 'advanced',
    },
    lowPerformanceMode: {
      type: 'checkbox',
      default: false,
      label: 'Enable low performance mode',
      description:
        'Reduces the animations and interactivity to a minimum for devices with low performance.',
      group: 'advanced',
    },
    resetAllSettings: {
      type: 'method',
      label: 'Reset all settings',
      method: (app) => {
        app.storage.clearAll()
      },
      group: 'advanced',
    },
  },
})

const { ui, $t } = useBlokkli()

const showSettings = computed(() => ui.currentDialog.value?.id === 'settings')

function onClick() {
  ui.openDialog({ id: 'settings', alignment: 'center' })
}

function onClose() {
  ui.closeDialog('settings')
}

const lowPerformanceMode = computed(() => settings.value.lowPerformanceMode)

addElementClasses(
  document.documentElement,
  'bk-low-performance-mode',
  lowPerformanceMode,
)

defineMenuButton(() => {
  return {
    id: 'settings',
    title: $t('settingsMenuTitle', 'Settings'),
    description: $t(
      'settingsMenuDescription',
      'Personal settings for the editor',
    ),
    icon: 'bk_mdi_settings',
    secondary: true,
    callback: onClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>

<style lang="postcss">
.bk.bk-settings {
  .bk-settings-group-title {
    @apply text-xl font-bold leading-tight;
  }

  .bk-form-section {
    @apply grid grid-cols-[240px_1fr] mt-0;
    @apply py-25 border-b border-b-mono-300 first:pt-0 last:pb-0 last:border-b-0;
  }
}

.bk {
  .bk-settings-checkboxes {
    @apply grid gap-10;
  }

  .bk-settings-buttons {
    @apply grid gap-10;
  }
  .bk-settings-ui {
    @apply grid gap-15 grid-cols-3;
    li {
      @apply relative;
      &:focus-within {
        .bk-icon {
          @apply outline outline-accent-950/80 outline-offset-[3px];
        }
      }
      label {
        @apply block cursor-pointer;
      }
      input {
        @apply appearance-none absolute top-0 left-0 w-full h-full cursor-pointer opacity-0;
      }
      input + .bk-icon {
        @apply border rounded overflow-hidden pointer-events-none border-mono-300;
        svg {
          @apply w-full h-auto opacity-50;
        }
      }
      input:checked + .bk-icon {
        @apply ring ring-accent-700;
        svg {
          @apply opacity-100;
        }
      }
      input:checked + .bk-icon + span {
        @apply font-semibold text-mono-950;
      }
      input:not(:checked):hover + .bk-icon {
        @apply border-mono-500;
        svg {
          @apply opacity-70;
        }
      }
      input:not(:checked):hover + .bk-icon + span {
        @apply text-mono-800;
      }
      span {
        @apply inline-block mt-10 text-sm text-left w-full text-mono-600;
      }
    }
  }

  .bk-icon-theme-bg {
    @apply fill-mono-200;
  }

  .bk-icon-theme-fg {
    @apply fill-white;
  }

  .bk-icon-theme-text {
    @apply fill-mono-300;
  }

  .bk-icon-theme-toolbar {
    @apply fill-mono-950;
  }

  .bk-icon-theme-toolbar-dark-item {
    @apply fill-mono-800 stroke-mono-600;
  }

  .bk-icon-theme-toolbar-light-item {
    @apply fill-mono-200 stroke-mono-300;
  }
}
</style>
