<template>
  <PluginSidebar
    id="violations"
    :title="$t('validationsToolbarLabel')"
    icon="alert"
    weight="-10"
  >
    <div class="bk bk-errors bk-control">
      <ul v-if="state.violations.value.length">
        <li v-for="(item, i) in state.violations.value" :key="item.message + i">
          <h3>{{ item.message }}</h3>
          <p>{{ item.code }}</p>
          <p>{{ item.propertyPath }}</p>
        </li>
      </ul>
      <div v-else class="bk-errors-success">
        <figure>
          <Icon name="check" />
        </figure>
        <h3>{{ $t('validationsNoneFound') }}</h3>
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

defineBlokkliFeature({
  id: 'validations',
  icon: 'alert',
  label: 'Validations',
  description: 'Provides a sidebar pane to render validations.',
})

const { state, $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Validations',
}
</script>
