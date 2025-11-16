<template>
  <div>
    <div>
      <FormToggle v-model="logEvents" label="Log Events" />
    </div>
    <div>
      <FormCheckboxes
        id="debug-loggers"
        v-model="debug.enabledLoggers.value"
        label="Enabled Loggers"
        description="If none selected, all will log. Select one or more to filter."
        :options="loggerOptions"
      />
    </div>
    <div>
      <button
        class="bk-button bk-is-small"
        @click.prevent="() => console.log(dom.getDebugData())"
      >
        Log DOM state
      </button>
    </div>

    <div>
      <button class="bk-button bk-is-small" @click.prevent="getAllMessages">
        Log all messages
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, computed, onMounted, onBeforeUnmount } from '#imports'
import { FormToggle, FormCheckboxes } from '#blokkli/components'
import type { DebugLogger } from '#blokkli/helpers/providers/debug'

const props = defineProps<{
  logger: DebugLogger
}>()

const { debug, dom, storage, eventBus } = useBlokkli()

const logEvents = storage.use('debug:log-events', true)

const loggerOptions = computed(() => {
  return debug.registeredLoggers.value
    .map((name) => ({
      value: name,
      label: name,
    }))
    .sort((a, b) => {
      return a.label.localeCompare(b.label)
    })
})

const onEvent = (name: string | number | symbol, data: any) => {
  if (!logEvents.value) {
    return
  }
  if (
    name === 'animationFrame' ||
    name === 'animationFrame:before' ||
    name === 'animationFrame:after' ||
    name === 'canvas:draw'
  ) {
    return
  }
  props.logger.log('Event: ' + String(name), data)
}

onMounted(() => {
  eventBus.on('*', onEvent)
})

onBeforeUnmount(() => {
  eventBus.off('*', onEvent)
})

function getAllMessages() {
  console.log(debug.getMessages())
}
</script>
