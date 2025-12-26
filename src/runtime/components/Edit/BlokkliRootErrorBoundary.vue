<template>
  <slot />

  <Teleport to="body">
    <Transition name="bk-fade">
      <div
        v-if="errors.length"
        class="bk bk-fatal-error-overlay"
        @wheel.capture.passive.stop
        @click.stop
        @mousedown.stop
        @touchstart.passive.stop
        @mousemove.stop
      >
        <div class="bk-fatal-error-overlay-info">
          <Icon name="bk_mdi_sentiment_worried" />
          <div>
            <h2>{{ $t('fatalErrorTitle', 'blökkli has stopped working') }}</h2>
            <p>
              {{
                $t(
                  'fatalErrorText',
                  'Unfortunately blökkli has encountered a fatal error which prevents it from working normally. You may be able to continue using it, but things may not work as expected.',
                )
              }}
            </p>
            <div class="bk-fatal-error-buttons">
              <button class="bk-button bk-is-danger" @click="errors = []">
                {{ $t('fatalErrorButton', 'Continue anyway...') }}
              </button>
            </div>
          </div>
        </div>
        <div class="bk-fatal-error-overlay-list">
          <h3>{{ title }}</h3>
          <button class="bk-button" @click="downloadLogs">
            {{ $t('downloadLogsButton', 'Download Logs') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, onErrorCaptured } from '#imports'
import { Icon } from '#blokkli/components'
import textProvider from '#blokkli/helpers/providers/texts'
import { useGlobalBlokkliObject } from '#blokkli/editor/composables'

const errors = ref<Error[]>([])

const $t = textProvider()
const globalBlokkli = useGlobalBlokkliObject()

onErrorCaptured((err) => {
  errors.value.push(err)

  if (import.meta.dev) {
    console.error(err)
  }

  // Log error to global messages
  globalBlokkli.pushMessage({
    type: 'error',
    name: 'RootErrorBoundary',
    date: new Date().toISOString(),
    message: err.message,
    context: err.stack || '',
  })

  return false
})

const title = computed(() => {
  return errors.value
    .filter((value, index, self) => {
      return self.findIndex((v) => v.name === value.name) === index
    })
    .map((v) => {
      return v.name + ' ' + v.message
    })
    .join('')
})

function downloadLogs() {
  const messages = globalBlokkli.getMessages()

  // CSV header
  const header = 'Type,Logger,Timestamp,Message,Context\n'

  // Convert messages to CSV rows
  const rows = messages
    .map((msg) => {
      // Escape quotes and wrap fields in quotes
      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`
      return [
        escapeCsv(msg.type),
        escapeCsv(msg.name),
        escapeCsv(msg.date),
        escapeCsv(msg.message),
        escapeCsv(msg.context ?? ''),
      ].join(',')
    })
    .join('\n')

  const csv = header + rows

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `blokkli-logs-${new Date().toISOString()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>
