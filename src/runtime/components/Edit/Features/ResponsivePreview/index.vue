<template>
  <PluginSidebar
    v-if="!ui.isMobile.value"
    id="mobile-preview"
    v-slot="{ width, height, isDetached }"
    :title="$t('responsivePreviewTitle')"
    :min-width="375"
    :min-height="375"
    :size="size"
    icon="preview"
    region="left"
  >
    <PreviewFrame :detached="isDetached">
      <button
        :disabled="!selectedViewport.canRotate"
        class="bk-is-rotate"
        @click="isRotated = !isRotated"
      >
        <Icon name="rotate-phone" />
      </button>
      <div class="bk-dropdown">
        <button
          class="bk-dropdown-toggle"
          :class="{ 'bk-is-open': dropdownOpen }"
          @click="dropdownOpen = !dropdownOpen"
        >
          <div class="bk-preview-viewport-option">
            <Icon :name="selectedViewport.icon" />
            <div>
              <strong>{{ selectedViewport.label }}</strong>
              <div>
                {{
                  selectedViewport.subtitle ||
                  buildViewportSubtitle(width, height)
                }}
              </div>
            </div>
          </div>
          <Icon name="caret" />
        </button>
        <div v-show="dropdownOpen" class="bk-dropdown-content">
          <label v-for="option in viewportOptions" :key="option.id">
            <input
              v-model="selectedViewportId"
              type="radio"
              name="responsive-preview-viewport"
              :value="option.id"
            />
            <div class="bk-preview-viewport-option">
              <Icon :name="option.icon" />
              <div>
                <strong>{{ option.label }}</strong>
                <div>
                  {{ option.subtitle || buildViewportSubtitle(width, height) }}
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>
    </PreviewFrame>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature, watch } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import PreviewFrame from './Frame/index.vue'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'

defineBlokkliFeature({
  description:
    'Provides a responsive preview of the current edit state in an iframe.',
})

const { $t, ui, storage } = useBlokkli()

const selectedViewportId = storage.use('mobile-preview:viewport', 'custom')
const isRotated = storage.use('mobile-preview:rotated', false)
const dropdownOpen = ref(false)

watch(selectedViewportId, () => (dropdownOpen.value = false))

type ViewportOption = {
  label: string
  subtitle?: string
  id: string
  width?: number
  height?: number
  icon: BlokkliIcon
  canRotate?: boolean
}

const selectedViewport = computed<ViewportOption>(() => {
  const selected = viewportOptions.value.find(
    (v) => v.id === selectedViewportId.value,
  )
  if (!selected) {
    return viewportOptions.value[0]
  }
  return selected
})

const size = computed(() => {
  const w = selectedViewport.value?.width
  const h = selectedViewport.value?.height
  if (w && h) {
    return {
      width: isRotated.value ? h : w,
      height: (isRotated.value ? w : h) + 50,
    }
  }
})

const buildViewportSubtitle = (
  w?: number,
  h?: number,
  canRotate?: boolean,
): string | undefined => {
  if (w && h) {
    return [
      isRotated.value && canRotate ? h : w,
      isRotated.value && canRotate ? w : h,
    ].join(' x ')
  }

  return
}

const viewportOptions = computed<ViewportOption[]>(() => {
  return [
    {
      label: 'Custom',
      id: 'custom',
      icon: 'resize',
    },
    {
      label: 'iPhone SE',
      id: 'iphone-se',
      width: 375,
      height: 667,
      icon: 'cellphone',
      canRotate: true,
    },
    {
      label: 'iPhone 15',
      id: 'iphone-15',
      width: 393,
      height: 852,
      icon: 'cellphone',
      canRotate: true,
    },
    {
      label: 'iPhone 15 Pro Max',
      id: 'iphone-15-pro-max',
      width: 430,
      height: 932,
      icon: 'cellphone',
      canRotate: true,
    },
    {
      label: 'iPad Mini',
      id: 'ipad-mini',
      width: 768,
      height: 1024,
      icon: 'tablet',
      canRotate: true,
    },
    {
      label: '13" Laptop',
      id: '13-laptop',
      width: 1280,
      height: 800,
      icon: 'laptop',
    },
    {
      label: '24" Monitor',
      id: '24-monitor',
      width: 1920,
      height: 1200,
      icon: 'monitor',
    },
  ].map((option) => {
    return {
      ...option,
      subtitle: buildViewportSubtitle(
        option.width,
        option.height,
        option.canRotate,
      ),
    } as ViewportOption
  })
})
</script>

<script lang="ts">
export default {
  name: 'ResponsivePreview',
}
</script>