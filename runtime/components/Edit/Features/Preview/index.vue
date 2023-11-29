<template>
  <PluginToolbarButton
    title="Mobile Vorschau"
    meta
    key-code="P"
    region="after-menu"
    @click="previewVisible = !previewVisible"
    :active="previewVisible"
    icon="preview"
  />

  <PluginToolbarButton
    title="Vorschau (neues Fenster)"
    region="after-menu"
    @click="openPreview"
    icon="openinnew"
  />

  <PluginToolbarButton
    v-if="previewGrantUrl"
    title="Vorschau (mit Smartphone)"
    region="after-menu"
    @click="qrCodeVisible = true"
    icon="qrcode"
  />

  <Teleport to="body">
    <PreviewFrame v-if="previewVisible" />

    <Transition appear name="pb-slide-up">
      <DialogModal
        v-if="qrCodeVisible && previewGrantUrl"
        title="Vorschau mit Smartphone"
        lead="Scannen Sie den QR-Code mit Ihrem Smartphone um die Vorschau zu öffnen."
        submit-label="Schliessen"
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
import { PluginToolbarButton } from '#pb/plugins'
import PreviewFrame from './Frame/index.vue'
import QrCode from './QrCode/index.vue'
import { DialogModal } from '#pb/components'

const qrCodeVisible = ref(false)

const route = useRoute()

const { adapter, storage } = useBlokkli()

const previewVisible = storage.use('preview:visible', false)

const { data: previewGrantUrl } = await useAsyncData(() =>
  adapter.getPreviewGrantUrl(),
)

const previewUrl = computed(() =>
  route.fullPath.replace('pbEditing', 'pbPreview'),
)

function openPreview() {
  window.open(previewUrl.value)
}
</script>
