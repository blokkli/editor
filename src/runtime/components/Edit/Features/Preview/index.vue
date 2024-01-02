<template>
  <PluginToolbarButton
    :title="$t('previewNewWindow')"
    region="after-menu"
    icon="openinnew"
    @click="openPreview"
  />

  <PluginToolbarButton
    v-if="previewGrantUrl && !ui.isMobile.value"
    :title="$t('previewWithSmartphone')"
    region="after-menu"
    icon="qrcode"
    @click="qrCodeVisible = true"
  />

  <PluginSidebar
    v-if="!ui.isMobile.value"
    id="mobile-preview"
    v-slot="{ isDetached }"
    :title="$t('previewMobileFrame')"
    :min-width="400"
    :min-height="800"
    :size="size"
    icon="preview"
    region="left"
  >
    <PreviewFrame :detached="isDetached">
      <template v-if="isDetached">
        <button @click="isRotated = !isRotated">
          <Icon name="rotate-phone" />
        </button>
        <select v-model="selectedViewport">
          <option
            v-for="option in viewportOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ buildViewportLabel(option) }}
          </option>
        </select>
      </template>
    </PreviewFrame>
  </PluginSidebar>

  <Teleport to="body">
    <Transition appear name="bk-slide-up">
      <DialogModal
        v-if="qrCodeVisible && previewGrantUrl"
        :title="$t('previewDialogTitle')"
        :lead="$t('previewDialogLead')"
        :submit-label="$t('close')"
        is-danger
        hide-buttons
        :width="490"
        @submit="qrCodeVisible = false"
        @cancel="qrCodeVisible = false"
      >
        <QrCode :url="previewGrantUrl" />
      </DialogModal>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  useRoute,
  useAsyncData,
  defineBlokkliFeature,
} from '#imports'
import { PluginToolbarButton, PluginSidebar } from '#blokkli/plugins'
import PreviewFrame from './Frame/index.vue'
import QrCode from './QrCode/index.vue'
import { DialogModal, Icon } from '#blokkli/components'

defineBlokkliFeature({
  description: 'Implements various preview features.',
})

const { adapter, $t, ui, storage } = useBlokkli()

const qrCodeVisible = ref(false)
const selectedViewport = storage.use('mobile-preview:viewport', 'custom')
const isRotated = storage.use('mobile-preview:rotated', false)

const route = useRoute()

const { data: previewGrantUrl } = await useAsyncData(() => {
  if (!adapter.getPreviewGrantUrl) {
    return Promise.resolve(null)
  }
  return Promise.resolve(adapter.getPreviewGrantUrl())
})

const previewUrl = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

type ViewportOption = {
  label: string
  id: string
  width?: number
  height?: number
}

const size = computed(() => {
  const selected = viewportOptions.value.find(
    (v) => v.id === selectedViewport.value,
  )
  if (selected?.width && selected.height) {
    return {
      width: isRotated.value ? selected.height : selected.width,
      height: (isRotated.value ? selected.width : selected.height) + 50,
    }
  }
})

const buildViewportLabel = (option: ViewportOption) => {
  const h = option.height
  const w = option.width
  if (w && h) {
    const sizing = [isRotated.value ? h : w, isRotated.value ? w : h].join(
      ' x ',
    )
    return `${option.label} (${sizing})`
  }

  return option.label
}

const viewportOptions = computed<ViewportOption[]>(() => {
  return [
    {
      label: 'Custom',
      id: 'custom',
    },
    {
      label: 'iPhone 15 Pro Max',
      id: 'iphone-15-pro-max',
      width: 430,
      height: 932,
    },
    {
      label: 'iPhone 15',
      id: 'iphone-15',
      width: 393,
      height: 852,
    },
    {
      label: 'iPhone SE',
      id: 'iphone-se',
      width: 375,
      height: 667,
    },
    {
      label: 'iPad Mini',
      id: 'ipad-mini',
      width: 768,
      height: 1024,
    },
  ]
})

function openPreview() {
  window.open(previewUrl.value)
}
</script>

<script lang="ts">
export default {
  name: 'Preview',
}
</script>
