<template>
  <PluginSidebar
    id="mobile-preview"
    v-slot="{ width, height, isDetached, isResizing }"
    :title="$t('responsivePreviewTitle', 'Responsive Preview')"
    :tour-text
    weight="10"
    :disabled="!state.canEdit.value"
    :min-width="375"
    :min-height="375"
    :size
    icon="bk_mdi_mobile"
    region="left"
  >
    <PreviewFrame :detached="isDetached" :is-resizing="isResizing">
      <button
        :disabled="!selectedViewport.canRotate"
        class="bk-is-rotate"
        @click="isRotated = !isRotated"
      >
        <Icon name="bk_mdi_mobile_rotate" />
      </button>
      <div class="bk-dropdown">
        <button
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
          <Icon name="bk_mdi_arrow_drop_down" />
        </button>
        <div v-if="dropdownOpen" class="bk-dropdown-content">
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
import {
  ref,
  computed,
  useBlokkli,
  defineBlokkliFeature,
  watch,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const PreviewFrame = defineAsyncComponent(() => import('./Frame/index.vue'))

defineBlokkliFeature({
  id: 'responsive-preview',
  icon: 'bk_mdi_mobile',
  label: 'Responsive Preview',
  viewports: ['desktop'],
  description:
    'Provides a responsive preview of the current edit state in an iframe.',
})

const { $t, storage, state } = useBlokkli()

const selectedViewportId = storage.use('mobile-preview:viewport', 'iphone-se')
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
    return viewportOptions.value[0]!
  }
  return selected
})

const size = computed(() => {
  const w = selectedViewport.value?.width
  const h = selectedViewport.value?.height
  const rotate = isRotated.value && selectedViewport.value.canRotate
  if (w && h) {
    return {
      width: rotate ? h : w,
      height: (rotate ? w : h) + 50,
    }
  }
  return undefined
})

const buildViewportSubtitle = (
  w?: number,
  h?: number,
  canRotate?: boolean,
): string | undefined => {
  if (w && h) {
    return [
      Math.round(isRotated.value && canRotate ? h : w),
      Math.round(isRotated.value && canRotate ? w : h),
    ].join(' x ')
  }
}

const viewportOptions = computed<ViewportOption[]>(() => {
  const base: ViewportOption[] = [
    {
      label: $t('responsivePreviewCustomViewport', 'Custom'),
      id: 'custom',
      icon: 'bk_mdi_resize',
    },
    {
      label: 'iPhone SE',
      id: 'iphone-se',
      width: 375,
      height: 667,
      icon: 'bk_mdi_mobile',
      canRotate: true,
    },
    {
      label: 'iPhone 15',
      id: 'iphone-15',
      width: 393,
      height: 852,
      icon: 'bk_mdi_mobile',
      canRotate: true,
    },
    {
      label: 'iPhone 15 Pro Max',
      id: 'iphone-15-pro-max',
      width: 430,
      height: 932,
      icon: 'bk_mdi_mobile',
      canRotate: true,
    },
    {
      label: 'iPad Mini',
      id: 'ipad-mini',
      width: 768,
      height: 1024,
      icon: 'bk_mdi_tablet',
      canRotate: true,
    },
    {
      label: '13" Laptop',
      id: '13-laptop',
      width: 1280,
      height: 800,
      icon: 'bk_mdi_laptop_mac',
    },
    {
      label: '24" Monitor',
      id: '24-monitor',
      width: 1920,
      height: 1200,
      icon: 'bk_mdi_monitor',
    },
  ]

  return base.map((option) => {
    return {
      ...option,
      subtitle: buildViewportSubtitle(
        option.width,
        option.height,
        option.canRotate,
      ),
    }
  })
})

const tourText = computed(() =>
  $t(
    'responsivePreviewTourText',
    `See how your changes look like on smaller screens, such as smartphones. Click on the "detach" button to be able to select additional viewport sizes.`,
  ),
)
</script>

<script lang="ts">
export default {
  name: 'ResponsivePreview',
}
</script>
