<template>
  <div>
    <PanelSection :title="$t('qrCode', 'QR code')" padded>
      <QrCodeVue
        :value="fullUrl"
        :size="430"
        level="H"
        class="!w-full !h-auto aspect-square"
      />
    </PanelSection>
    <PanelSection :title="$t('link', 'Link')" padded>
      <p class="mb-15">
        {{
          $t('previewQrCodeText', 'You can also copy the link and share it.')
        }}
      </p>
      <input :value="fullUrl" class="bk-form-input" readonly @focus="onFocus" />
    </PanelSection>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import QrCodeVue from 'qrcode.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const { $t } = useBlokkli()

const props = defineProps<{
  url: string
}>()

const fullUrl = computed(() => {
  return window.location.origin + props.url
})

function onFocus(e: FocusEvent) {
  if (e.target && e.target instanceof HTMLInputElement) {
    e.target.select()
  }
}
</script>
