<template>
  <PluginSidebar id="violations" title="Validierungen" icon="alert">
    <div class="pb pb-errors pb-control">
      <ul v-if="violations.length">
        <li v-for="item in violations">
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
import { PluginSidebar } from '#pb/plugins'
import { Icon } from '#pb/components'

const { violations } = useParagraphsBuilderStore()
</script>
