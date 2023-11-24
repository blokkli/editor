<template>
  <PluginToolbarButton
    title="Mobile Vorschau"
    meta
    key-code="P"
    region="after-menu"
    @click="previewVisible = !previewVisible"
    :active="previewVisible"
  >
    <IconPreview />
  </PluginToolbarButton>

  <PluginToolbarButton
    title="Vorschau (neues Fenster)"
    region="after-menu"
    @click="openPreview"
  >
    <IconOpenInNew />
  </PluginToolbarButton>

  <PluginToolbarButton
    title="Vorschau (mit Smartphone)"
    region="after-menu"
    @click="qrCodeVisible = true"
  >
    <IconQrCode />
  </PluginToolbarButton>

  <Teleport to="body">
    <PreviewFrame v-if="previewVisible" />

    <Transition appear name="pb-slide-up">
      <PbDialog
        v-if="qrCodeVisible"
        title="Vorschau mit Smartphone"
        lead="Scannen Sie den QR-Code mit Ihrem Smartphone um die Vorschau zu öffnen."
        submit-label="Schliessen"
        is-danger
        hide-buttons
        :width="490"
        @submit="qrCodeVisible = false"
        @cancel="qrCodeVisible = false"
      >
        <QrCode :url="previewGrantUrl || previewUrl" />
      </PbDialog>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import IconPreview from './../../Icons/Preview.vue'
import IconOpenInNew from './../../Icons/OpenInNew.vue'
import IconQrCode from './../../Icons/QrCode.vue'
import PluginToolbarButton from './../../Plugin/ToolbarButton/index.vue'
import PreviewFrame from './Frame/index.vue'
import QrCode from './QrCode/index.vue'
import PbDialog from './../../Dialog/index.vue'

const previewVisible = ref(false)
const qrCodeVisible = ref(false)

const route = useRoute()

const { previewGrantUrl } = useParagraphsBuilderStore()

const previewUrl = computed(() =>
  route.fullPath.replace('pbEditing', 'pbPreview'),
)

function openPreview() {
  window.open(previewUrl.value)
}
</script>
