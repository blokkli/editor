<template>
  <PluginToolbarButton
    v-if="previewGrantUrl && !ui.isMobile.value"
    id="preview_with_smartphone"
    :title="$t('previewWithSmartphone', 'Preview (with smartphone)')"
    :tour-text="
      $t(
        'previewWithSmartphoneTourText',
        'Shows a QR code to quickly open a preview of the changes with your smartphone.',
      )
    "
    region="after-menu"
    icon="qrcode"
    @click="qrCodeVisible = true"
  />

  <Teleport to="body">
    <Transition appear name="bk-slide-up">
      <DialogModal
        v-if="qrCodeVisible && previewGrantUrl"
        :title="$t('previewDialogTitle', 'Preview with smartphone')"
        :lead="
          $t(
            'previewDialogLead',
            'Scan the QR code with your smartphone to open the preview.',
          )
        "
        :submit-label="$t('close', 'Close')"
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
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
} from '#imports'
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
  viewports: ['desktop'],
})

const { $t, ui } = useBlokkli()

const qrCodeVisible = ref(false)

const { data: previewGrantUrl } = await useLazyAsyncData(() =>
  Promise.resolve(adapter.getPreviewGrantUrl()),
)
</script>

<script lang="ts">
export default {
  name: 'PreviewGrant',
}
</script>
