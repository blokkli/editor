<template>
  <PluginToolbarButton
    v-if="previewGrantUrl && !ui.isMobile.value"
    :title="$t('previewWithSmartphone')"
    region="after-menu"
    icon="qrcode"
    @click="qrCodeVisible = true"
  />

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
import { ref, useBlokkli, useAsyncData, defineBlokkliFeature } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'
import QrCode from './QrCode/index.vue'
import { DialogModal } from '#blokkli/components'

const { adapter } = defineBlokkliFeature({
  id: 'preview-grant',
  label: 'Preview Grant',
  icon: 'qrcode',
  description:
    'Provides a button to open a dialog with a QR code to preview the page on a smartphone.',
  requiredAdapterMethods: ['getPreviewGrantUrl'],
})

const { $t, ui } = useBlokkli()

const qrCodeVisible = ref(false)

const { data: previewGrantUrl } = await useAsyncData(() =>
  Promise.resolve(adapter.getPreviewGrantUrl()),
)
</script>

<script lang="ts">
export default {
  name: 'PreviewGrant',
}
</script>
