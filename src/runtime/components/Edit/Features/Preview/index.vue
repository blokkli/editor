<template>
  <PluginToolbarButton
    v-if="!ui.isMobile.value"
    :title="text('previewMobileFrame')"
    meta
    key-code="P"
    region="after-menu"
    :active="previewVisible"
    icon="preview"
    @click="previewVisible = !previewVisible"
  />

  <PluginToolbarButton
    :title="text('previewNewWindow')"
    region="after-menu"
    icon="openinnew"
    @click="openPreview"
  />

  <PluginToolbarButton
    v-if="previewGrantUrl && !ui.isMobile.value"
    :title="text('previewWithSmartphone')"
    region="after-menu"
    icon="qrcode"
    @click="qrCodeVisible = true"
  />

  <Teleport to="body">
    <PreviewFrame v-if="previewVisible && !ui.isMobile.value" />

    <Transition appear name="bk-slide-up">
      <DialogModal
        v-if="qrCodeVisible && previewGrantUrl"
        :title="text('previewDialogTitle')"
        :lead="text('previewDialogLead')"
        :submit-label="text('close')"
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
import { ref, computed, useBlokkli, useRoute, useAsyncData } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'
import PreviewFrame from './Frame/index.vue'
import QrCode from './QrCode/index.vue'
import { DialogModal } from '#blokkli/components'

const qrCodeVisible = ref(false)

const route = useRoute()

const { adapter, storage, text, ui } = useBlokkli()

const previewVisible = storage.use('preview:visible', false)

const { data: previewGrantUrl } = await useAsyncData(() =>
  adapter.getPreviewGrantUrl(),
)

const previewUrl = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

function openPreview() {
  window.open(previewUrl.value)
}
</script>

<script lang="ts">
export default {
  name: 'Preview',
}
</script>
