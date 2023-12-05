<template>
  <PluginSidebar id="violations" title="Validierungen" icon="alert">
    <div class="pb pb-errors pb-control">
      <ul v-if="state.violations.value.length">
        <li v-for="item in state.violations.value">
          <h3>{{ item.message }}</h3>
          <p>{{ item.code }}</p>
          <p>{{ item.propertyPath }}</p>
        </li>
      </ul>
      <div v-else class="pb-errors-success">
        <figure>
          <Icon name="check" />
        </figure>
        <h3>Keine Validierungsfehler gefunden.</h3>
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { PluginSidebar } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { state } = useBlokkli()
</script>
