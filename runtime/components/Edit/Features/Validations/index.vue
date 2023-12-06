<template>
  <PluginSidebar
    id="violations"
    :title="text('validationsToolbarLabel')"
    icon="alert"
  >
    <div class="bk bk-errors bk-control">
      <ul v-if="state.violations.value.length">
        <li v-for="item in state.violations.value">
          <h3>{{ item.message }}</h3>
          <p>{{ item.code }}</p>
          <p>{{ item.propertyPath }}</p>
        </li>
      </ul>
      <div v-else class="bk-errors-success">
        <figure>
          <Icon name="check" />
        </figure>
        <h3>{{ text('validationsNoneFound') }}</h3>
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { PluginSidebar } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { state, text } = useBlokkli()
</script>
