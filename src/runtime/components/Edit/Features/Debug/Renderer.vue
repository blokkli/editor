<template>
  <PluginSidebar id="debug" title="Debug" icon="bug" weight="200">
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
            <FormToggle
              :label="overlay.label"
              :model-value="overlay.active"
              @update:model-value="debug.toggleOverlay(overlay.id)"
            />
          </div>
          <div>
            <FormToggle
              label="Set transforming"
              :model-value="ui.isTransforming.value"
              @update:model-value="toggleTransforming"
            />
          </div>

          <div>
            <FormToggle
              label="Enable WebGL"
              :model-value="animation.webglEnabled.value"
              @update:model-value="toggleWebgl"
            />
          </div>
          <div>
            <button
              class="bk-button bk-is-small"
              @click.prevent="() => dom.updateVisibleRects()"
            >
              Refresh Rects
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2>Logging</h2>
        <div class="bk-debug-list">
          <div>
            <div>
              <FormToggle v-model="logEvents" label="Log Events" />
            </div>
            <div>
              <button
                class="bk-button bk-is-small"
                @click.prevent="() => console.log(dom.getDebugData())"
              >
                Log DOM state
              </button>
            </div>
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

  <PluginItemDropdown
    v-if="itemDropdownItems.length"
    id="selection"
    :title="$t('selectionActionGroupTitle', 'Selection')"
    enabled
    :items="itemDropdownItems"
    icon="bug"
    weight="200"
    @select="onSelectDropdownItem"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, onBeforeUnmount, computed } from '#imports'
import {
  PluginSidebar,
  PluginDebugOverlay,
  PluginItemDropdown,
} from '#blokkli/plugins'
import { Icon, FormToggle } from '#blokkli/components'
import { icons, type BlokkliIcon } from '#blokkli-build/icons'
import DebugViewport from './Viewport/index.vue'
import DebugRects from './Rects/index.vue'
import type { DebugLogger } from '#blokkli/helpers/debugProvider'

const { logger } = defineProps<{
  logger: DebugLogger
}>()

const {
  keyboard,
  selection,
  eventBus,
  features,
  debug,
  ui,
  animation,
  dom,
  storage,
  $t,
} = useBlokkli()

const logEvents = storage.use('debug:log-events', true)

const iconItems = computed(() => Object.keys(icons) as BlokkliIcon[])

const featuresList = computed(() => {
  return features.features.value.map((v) => {
    const feature = features.mountedFeatures.value.find((f) => f.id === v.id)
    return {
      id: v.id,
      label: v.label,
      description: v.description,
      dependencies: v.dependencies?.join(', '),
      mounted: !!feature,
    }
  })
})

const onEvent = (name: string | number | symbol, data: any) => {
  if (!logEvents.value) {
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

function toggleWebgl() {
  if (animation.webglEnabled.value) {
    animation.webglEnabled.value = false
  } else {
    animation.webglEnabled.value = true
  }
}

onMounted(() => {
  eventBus.on('*', onEvent)
})

onBeforeUnmount(() => {
  eventBus.off('*', onEvent)
})

const itemDropdownItems = computed(() => {
  if (selection.uuids.value.length === 1) {
    return [
      {
        id: 'copy-uuid',
        label: 'Copy UUID',
      },
    ]
  }
  return []
})

async function onSelectDropdownItem(item: { id: string }) {
  if (item.id === 'copy-uuid') {
    const type = 'text/plain'
    const clipboardItemData = {
      [type]: selection.uuids.value.at(0) ?? '',
    }
    const clipboardItem = new ClipboardItem(clipboardItemData)
    await navigator.clipboard.write([clipboardItem])
  }
}
</script>
