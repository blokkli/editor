<template>
  <PluginViewOption
    id="dev_mode"
    v-model="isEnabled"
    :label="$t('toggleInteractionLayers', 'Toggle interaction layers')"
    :title-on="$t('interactionLayersOn', 'Hide interaction layers')"
    :title-off="$t('interactionLayerOff', 'Show interaction layers')"
    icon="bk_mdi_logo_dev"
    key-code="I"
    weight="-99999"
  />
  <Teleport :to="ui.mainLayoutElement.value">
    <div v-if="fieldMappingValidations.length" class="bk bk-dev-mode">
      <div class="bk-dev-mode-inner">
        <Banner
          id="dev-mode"
          icon="bk_mdi_logo_dev"
          text="Invalid definitions found!"
          scheme="red"
        >
          <div class="bk-dev-mode-banner">
            <h3>Some block components are invalid:</h3>
            <table>
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Error</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(item, index) in fieldMappingValidations"
                  :key="index"
                >
                  <td>{{ item.bundle }}</td>
                  <td v-html="item.validation" />
                </tr>
              </tbody>
            </table>
          </div>
        </Banner>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  ref,
  computed,
  onMounted,
} from '#imports'
import { PluginViewOption } from '#blokkli/editor/plugins'
import { Banner } from '#blokkli/editor/components'
import { addElementClasses } from '#blokkli/editor/composables'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'dev-mode',
  label: 'Dev Mode',
  icon: 'bk_mdi_logo_dev',
  description: 'Feature enabled in development mode.',
  viewports: ['desktop'],
})

const { $t, types, definitions, ui } = useBlokkli()

const isEnabled = ref(false)

const fieldMappingValidations = computed(() => {
  return definitions.blockDefinitions.value
    .flatMap((definition) => {
      if (definition.renderFor) {
        return null
      }

      const propsFieldMapping = definition.propsFieldMapping ?? {}

      const bundle = definition.bundle
      const fields = new Set(
        types.fieldConfig
          .forEntityTypeAndBundle(itemEntityType, bundle)
          .map((field) => field.name),
      )
      const mappings = Object.entries(propsFieldMapping)
        .map(([propName, mapping]) => {
          if (mapping && mapping.type === 'field') {
            return {
              propName,
              fieldName: mapping.name,
            }
          }
          return null
        })
        .filter(falsy)

      // The mappings for which no actual field exists.
      const invalidMappings = mappings
        .filter((mapping) => {
          return !fields.has(mapping.fieldName)
        })
        .map((mapping) => {
          return {
            bundle,
            validation: `The props field mapping <code>'${mapping.propName}': '${mapping.fieldName}'</code> is invalid, because <strong>${bundle}</strong> has no field <strong>${mapping.fieldName}</strong>`,
          }
        })

      const missingMappings = [...fields.values()]
        .filter((fieldName) => {
          return !mappings.find((mapping) => mapping.fieldName === fieldName)
        })
        .map((fieldName) => {
          return {
            bundle,
            validation: `Missing props field mapping for field <strong>${fieldName}</strong>`,
          }
        })

      return [...invalidMappings, ...missingMappings]
    })
    .filter(falsy)
})

addElementClasses(
  document.documentElement,
  'bk-hide-interaction-layers',
  isEnabled,
)

onMounted(() => {
  console.log(fieldMappingValidations.value)
})
</script>

<script lang="ts">
export default {
  name: 'DevMode',
}
</script>

<style lang="postcss">
html.bk-hide-interaction-layers {
  #bk-canvas-overlay {
    @apply !invisible;
  }
  .bk-main-canvas {
    @apply !pointer-events-auto;
  }
}
</style>
