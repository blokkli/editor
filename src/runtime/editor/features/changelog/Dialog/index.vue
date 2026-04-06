<template>
  <DialogModal
    id="changelog"
    :title="$t('changelogDialogTitle', 'What\'s New')"
    :width="876"
    hide-buttons
    icon="bk_mdi_campaign"
    @cancel="$emit('cancel')"
  >
    <div class="bk-changelog grid gap-30 select-text">
      <div
        v-for="(entry, index) in entries"
        :key="entry.version"
        :class="{ 'pt-30 border-t border-mono-400 border-dashed': index > 0 }"
      >
        <div class="flex items-center gap-10 mb-15 justify-between">
          <h2
            class="text-sm font-bold font-mono bg-accent-100 text-accent-800 rounded-full px-10 py-2"
          >
            {{ entry.date }}
          </h2>
          <span class="text-mono-500">{{ entry.version }}</span>
        </div>
        <div class="bk-changelog-content" v-html="entry.html" />
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
      date: ui.formatDate(entry.date, { dateStyle: 'long' }),
      html,
    }
  }),
)
</script>

<style lang="postcss">
.bk {
  .bk-changelog-content {
    h3 {
      @apply text-sm font-semibold text-accent-700 mt-25 mb-15 uppercase tracking-wide;
    }

    h4 {
      @apply text-base font-bold mt-25;
    }

    h3 + h4 {
      @apply mt-0;
    }

    > div:last-child > h3:first-child {
      @apply mt-0;
    }

    ul {
      @apply grid gap-5 mb-0;
    }

    li {
      @apply pl-15 relative;

      &::before {
        content: '';
        @apply absolute left-0 top-[9px] size-[5px] rounded-full bg-mono-400;
      }

      strong {
        @apply text-mono-900 font-semibold;
      }
    }
  }
}
</style>
