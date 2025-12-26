<template>
  <PluginToolbarButton
    v-if="!ui.isMobile.value"
    id="preview_with_smartphone"
    :title="$t('previewWithSmartphone', 'Preview (with smartphone)')"
    :disabled="!state.canEdit.value"
    weight="20"
    :tour-text="
      $t(
        'previewWithSmartphoneTourText',
        'Shows a QR code to quickly open a preview of the changes with your smartphone.',
      )
    "
    region="after-menu"
    icon="bk_mdi_qr_code"
    @click="qrCodeVisible = true"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="qrCodeVisible"
        id="preview-grant"
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
        <QrCode v-if="previewGrantUrl" :url="previewGrantUrl" />
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import QrCode from './QrCode/index.vue'
import { DialogModal, BlokkliTransition } from '#blokkli/components'

const { adapter } = defineBlokkliFeature({
  id: 'preview-grant',
  label: 'Preview Grant',
  icon: 'bk_mdi_qr_code',
  description:
    'Provides a button to open a dialog with a QR code to preview the page on a smartphone.',
  requiredAdapterMethods: ['getPreviewGrantUrl'],
  viewports: ['desktop'],
})

const { $t, ui, state } = useBlokkli()

const qrCodeVisible = ref(false)
const previewGrantUrl = ref<string | undefined | null>('')

watch(qrCodeVisible, async function (isVisible) {
  if (isVisible && !previewGrantUrl.value) {
    previewGrantUrl.value = await adapter.getPreviewGrantUrl()
  }
})
</script>

<script lang="ts">
export default {
  name: 'PreviewGrant',
}
</script>
