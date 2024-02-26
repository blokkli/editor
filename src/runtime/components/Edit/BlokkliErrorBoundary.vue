<template>
  <slot></slot>

  <Teleport to="body">
    <div
      v-if="errors.length"
      class="bk bk-fatal-error-overlay"
      @wheel.passive.stop
      @click.stop
      @mousedown.stop
      @touchstart.passive.stop
      @mousemove.stop
    >
      <div class="bk-fatal-error-overlay-info">
        <Icon name="dead" />
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
          <button class="bk-button" @click="errors = []">
            {{ $t('fatalErrorButton', 'Continue anyway...') }}
          </button>
        </div>
      </div>
      <div class="bk-fatal-error-overlay-list">
        <div v-for="(e, i) in unique" :key="i">
          <h3>{{ e.name }}: {{ e.message }}</h3>
          <code>
            <pre>{{ e.stack }}</pre>
          </code>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, onErrorCaptured } from '#imports'
import { Icon } from '#blokkli/components'
import textProvider from '#blokkli/helpers/textProvider'

const errors = ref<Error[]>([])

const $t = textProvider()

onErrorCaptured((err) => {
  errors.value.push(err)
  return false
})

const unique = computed(() => {
  return errors.value.filter((value, index, self) => {
    return self.findIndex((v) => v.name === value.name) === index
  })
})
</script>
