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
import { PluginToolbarButton } from '#blokkli/plugins'
import QrCode from './QrCode/index.vue'
import { DialogModal } from '#blokkli/components'

defineBlokkliFeature({
  id: 'preview',
  label: 'Preview',
  icon: 'preview',
  description: 'Implements various preview features.',
})

const { adapter, $t, ui } = useBlokkli()

const qrCodeVisible = ref(false)

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

function openPreview() {
  window.open(previewUrl.value)
}
</script>

<script lang="ts">
export default {
  name: 'Preview',
}
</script>
