<template>
  <PluginSidebar
    id="violations"
    ref="plugin"
    :title="$t('validationsToolbarLabel', 'Validations')"
    :tour-text="
      $t(
        'validationsTourText',
        'See validation errors for content or structure on the current page.',
      )
    "
    icon="check"
    weight="-10"
  >
    <div class="bk bk-errors bk-control">
      <ul v-if="state.violations.value.length">
        <li v-for="(item, i) in state.violations.value" :key="item.message + i">
          <SidebarItem v-bind="item" />
        </li>
      </ul>
      <div v-else class="bk-errors-success">
        <figure>
          <Icon name="check" />
        </figure>
        <h3>{{ $t('validationsNoneFound', 'No validation errors found.') }}</h3>
      </div>
    </div>

    <template v-if="validations.length" #badge>
      <div class="bk-sidebar-badge bk-is-red">{{ validations.length }}</div>
    </template>
  </PluginSidebar>

  <ValidationOverlay v-if="validations.length" :validations="validations" />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed, ref } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import ValidationOverlay from './Overlay/index.vue'
import SidebarItem from './SidebarItem/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineBlokkliFeature({
  id: 'validations',
  icon: 'check',
  label: 'Validations',
  description: 'Provides a sidebar pane to render validations.',
})

const plugin = ref<InstanceType<typeof PluginSidebar> | null>(null)

const { state, $t } = useBlokkli()

const validations = computed(() => state.violations.value)

onBlokkliEvent('publish:failed', function () {
  // When publishing failed and we have validations, show the sidebar.
  if (plugin.value && validations.value.length) {
    plugin.value.showSidebar()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Validations',
}
</script>
