<template>
  <PluginSidebar
    id="theme"
    :title="$t('theme', 'Theme')"
    :tour-text="
      $t(
        'themeTourText',
        'Change the colors of the theme and generate a theme file.',
      )
    "
    icon="bk_mdi_palette"
    weight="-100"
  >
    <div class="bk bk-theme-editor bk-control" @wheel.capture.stop.passive>
      <div class="bk-theme-editor-select">
        <select v-model="selectedTheme">
          <option v-for="option in themeOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
      <div :key="selectedThemeId" class="bk-theme-editor-groups">
        <div v-for="group in groups" :key="group" class="bk-theme-editor-group">
          <h2>{{ group }}</h2>
          <table class="bk-theme-editor-table">
            <Color
              v-for="shade in shades"
              :key="group + shade"
              :group="group"
              :shade="shade"
            />
          </table>
        </div>

        <div
          v-for="group in contextGroups"
          :key="group"
          class="bk-theme-editor-group"
        >
          <h2>{{ group }}</h2>
          <table class="bk-theme-editor-table">
            <Color
              v-for="shade in contextShades"
              :key="group + shade"
              :group="group"
              :shade="shade"
            />
          </table>
        </div>
      </div>

      <GeneratedCode />
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref, computed } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import Color from './Color/index.vue'
import GeneratedCode from './GeneratedCode/index.vue'
import type {
  ThemeColorGroup,
  ThemeColorShade,
  ThemeContextColorGroup,
  ThemeContextColorShade,
} from './../../../../global/types/theme'

import { themes } from '#blokkli-build/editor-config'

defineBlokkliFeature({
  id: 'theme',
  icon: 'bk_mdi_palette',
  label: 'Theme',
  description: 'Implements a theme editor.',
})

const { $t, theme } = useBlokkli()

const selectedThemeId = ref('custom')

const selectedTheme = computed({
  get() {
    return selectedThemeId.value
  },
  set(id: any) {
    selectedThemeId.value = id
    theme.applyTheme(id)
  },
})

const themeOptions = computed(() => ['custom', ...Object.keys(themes)])

const groups: ThemeColorGroup[] = ['accent', 'mono']
const shades: ThemeColorShade[] = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
]

const contextGroups: ThemeContextColorGroup[] = [
  'teal',
  'yellow',
  'red',
  'lime',
  'orange',
]
const contextShades: ThemeContextColorShade[] = ['light', 'normal', 'dark']
</script>

<script lang="ts">
export default {
  name: 'Theme',
}
</script>

<style lang="postcss">
.bk.bk-theme-editor {
  container-type: inline-size;
}

.bk {
  .bk-theme-editor-groups {
    @container (min-width: 600px) {
      @apply grid grid-cols-2;
    }
  }

  .bk-theme-editor-table {
    @apply w-full text-sm;

    tr {
      @apply border-b border-b-mono-300;
    }

    td {
      @apply px-10;
    }

    .bk-theme-editor-color-shade {
      @apply text-right font-medium;
    }

    .bk-theme-editor-color-buttons {
      svg {
        @apply w-20 h-20;
      }
    }

    .bk-theme-editor-color-hex {
      @apply w-full;
      input {
        @apply w-full font-mono;
      }
    }
    .bk-theme-editor-color-color {
      @apply w-0;
    }
  }

  .bk-theme-editor-code {
    textarea {
      @apply w-full font-mono text-sm;
    }
  }

  .bk-theme-editor-group {
    h2 {
      @apply uppercase font-semibold text-sm text-mono-600 px-15 py-5;
      @apply border-b border-b-mono-300;
      @apply bg-mono-100;
    }
  }

  .bk-theme-editor-select {
    @apply border-b border-b-mono-500;
    select {
      @apply w-full px-15 py-15 font-semibold;
    }
  }
}
</style>
