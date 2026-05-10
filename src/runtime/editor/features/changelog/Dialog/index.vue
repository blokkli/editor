<template>
  <DialogModal
    id="changelog"
    :title="$t('changelogDialogTitle', 'What\'s New')"
    hide-buttons
    icon="bk_mdi_campaign"
    mono
    @cancel="$emit('cancel')"
  >
    <div class="select-text">
      <PanelSection
        v-for="entry in entries"
        :key="entry.version"
        :title="entry.date"
        padded
      >
        <template #post-title>
          <Pill :text="entry.version" />
        </template>
        <div class="bk-rich-content" v-html="entry.html" />
      </PanelSection>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { DialogModal, Pill } from '#blokkli/editor/components'
import data from '../changelog.json'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const { $t, ui } = useBlokkli()

defineEmits<{
  (e: 'cancel'): void
}>()

const entries = computed(() =>
  data.map((entry) => {
    const lang = ui.interfaceLanguage.value
    const html =
      lang in entry.body
        ? entry.body[lang as keyof typeof entry.body]
        : entry.body.en
    return {
      version: entry.version,
      date: ui.formatDate(entry.date, { dateStyle: 'long' }),
      html,
    }
  }),
)
</script>
