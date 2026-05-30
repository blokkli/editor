<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <div v-if="fieldMappingValidations.length" class="bk bk-dev-mode">
      <div class="bk-dev-mode-inner">
        <Banner id="dev-mode" scheme="red">
          <BannerInner icon="bk_mdi_logo_dev" text="Invalid definitions found!">
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
          </BannerInner>
        </Banner>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { Banner, BannerInner } from '#blokkli/editor/components'
import {
  addElementClasses,
  defineViewOption,
} from '#blokkli/editor/composables'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'dev-mode',
  label: 'Dev Mode',
  icon: 'bk_mdi_logo_dev',
  description: 'Feature enabled in development mode.',
  viewports: ['desktop'],
  devOnly: true,
})

const { $t, types, definitions, ui } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'dev_mode',
  label: $t('toggleInteractionLayers', 'Toggle interaction layers'),
  titleOn: $t('interactionLayersOn', 'Hide interaction layers'),
  titleOff: $t('interactionLayerOff', 'Show interaction layers'),
  icon: 'bk_mdi_logo_dev',
  keyCode: 'I',
  weight: -99999,
})

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
  isVisible,
)
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

.bk.bk-dev-mode {
  grid-area: viewport;
  @apply pointer-events-none;
  @apply pt-15;

  .bk-dev-mode-inner {
    @apply pointer-events-auto select-text;

    .bk-dev-mode-banner {
      @apply w-full;
    }

    code {
      @apply bg-red-dark rounded px-3;
    }

    table {
      @apply w-full;
    }

    h3 {
      @apply text-xl font-bold mb-25;
    }

    thead {
      th {
        @apply font-semibold text-left pb-5;
        @apply text-xs uppercase tracking-wide;
      }
    }

    tbody {
      td {
        @apply py-5;
      }
    }

    td,
    th {
      @apply text-left;
    }

    tr {
      @apply border-b border-b-red-light/50;
    }
  }
}
</style>
