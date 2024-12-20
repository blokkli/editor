<template>
  <PluginSidebar
    v-if="debug.isEnabled.value"
    id="debug"
    title="Debug"
    icon="bug"
    weight="200"
  >
    <div class="bk bk-debug">
      <section>
        <h2>Keyboard</h2>
        <div class="bk-debug-list">
          <div>
            <div>Space</div>
            <div>{{ keyboard.isPressingSpace.value }}</div>
          </div>
          <div>
            <div>Control</div>
            <div>{{ keyboard.isPressingControl.value }}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Selection</h2>
        <div class="bk-debug-list">
          <div>
            <div>Count</div>
            <div>{{ selection.uuids.value.length }}</div>
          </div>
          <div>
            <div>isDragging</div>
            <div>{{ selection.isDragging.value }}</div>
          </div>
          <div>
            <div>isDraggingExisting</div>
            <div>{{ selection.isDraggingExisting.value }}</div>
          </div>
          <div>
            <div>Is multiselecting</div>
            <div>{{ selection.isMultiSelecting.value }}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Rendering</h2>
        <div class="bk-debug-list">
          <div v-for="overlay in debug.overlays.value" :key="overlay.id">
            <label class="bk-checkbox-toggle">
              <input
                :checked="overlay.active"
                type="checkbox"
                @change="debug.toggleOverlay(overlay.id)"
              />
              <div />
              <span>{{ overlay.label }}</span>
            </label>
          </div>
          <div>
            <label class="bk-checkbox-toggle">
              <input
                :checked="ui.isTransforming.value"
                type="checkbox"
                @change="toggleTransforming"
              />
              <div />
              <span>Set transforming</span>
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2>Icons</h2>
        <div class="bk-debug-icons">
          <div v-for="icon in iconItems" :key="icon">
            <Icon :name="icon" />
            <p>{{ icon }}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Features</h2>
        <div class="bk-debug-features">
          <div v-for="feature in featuresList" :key="feature.id">
            <div>
              <span
                class="bk-status-indicator"
                :class="feature.mounted ? 'bk-is-success' : 'bk-is-danger'"
              />
            </div>
            <div>
              <h3>{{ feature.label }}</h3>
              <div>{{ feature.id }}</div>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </PluginSidebar>

  <PluginDebugOverlay id="viewport" title="Show viewport overlay">
    <DebugViewport />
  </PluginDebugOverlay>

  <PluginDebugOverlay id="rects" title="Show field and block rects">
    <DebugRects />
  </PluginDebugOverlay>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
  computed,
} from '#imports'
import { PluginSidebar, PluginDebugOverlay } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import { icons, type BlokkliIcon } from '#blokkli/icons'
import { featureComponents } from '#blokkli-runtime/features'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import DebugViewport from './Viewport/index.vue'
import DebugRects from './Rects/index.vue'

const { logger } = defineBlokkliFeature({
  id: 'debug',
  label: 'Debug',
  icon: 'bug',
  description: 'Provides debugging functionality.',
})

const { keyboard, selection, eventBus, features, debug, ui } = useBlokkli()

const iconItems = computed(() => Object.keys(icons) as BlokkliIcon[])

const featuresList = computed(() => {
  return featureComponents.map((v) => {
    const feature = features.features.value.find((f) => f.id === v.id)
    return {
      id: v.id,
      label: v.label,
      description: v.description,
      dependencies: v.dependencies.join(', '),
      mounted: !!feature,
    }
  })
})

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    debug.toggle()
  }
})

const onEvent = (name: string | number | symbol, data: any) => {
  if (!debug.isEnabled.value) {
    return
  }
  if (
    name === 'animationFrame' ||
    name === 'animationFrame:before' ||
    name === 'canvas:draw'
  ) {
    return
  }
  logger.log('Event: ' + String(name), data)
}

function toggleTransforming() {
  if (ui.isTransforming.value) {
    ui.setTransform()
  } else {
    ui.setTransform('Transform plugin label')
  }
}

onMounted(() => {
  eventBus.on('*', onEvent)
})

onBeforeUnmount(() => {
  eventBus.off('*', onEvent)
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
