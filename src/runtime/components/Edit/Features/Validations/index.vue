<template>
  <PluginSidebar
    id="violations"
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
          <h3>{{ item.message }}</h3>
          <p>{{ item.code }}</p>
          <p>{{ item.propertyPath }}</p>
        </li>
      </ul>
      <div v-else class="bk-errors-success">
        <figure>
          <Icon name="check" />
        </figure>
        <h3>{{ $t('validationsNoneFound', 'No validation errors found.') }}</h3>
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
  icon: 'check',
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
