<template>
  <DialogModal
    id="changelog"
    :title="$t('changelogDialogTitle', 'What\'s New')"
    :width="700"
    hide-buttons
    icon="bk_mdi_campaign"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-changelog">
      <div v-for="entry in entries" :key="entry.version" class="bk-changelog-entry">
        <div class="bk-changelog-entry-header">
          <h3>{{ entry.version }}</h3>
          <span>{{ entry.date }}</span>
        </div>
        <div v-html="entry.html" />
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { DialogModal } from '#blokkli/editor/components'
import data from '../changelog.json'

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
      date: entry.date,
      html,
    }
  }),
)
</script>
