<template>
  <SidebarInner title="Validierungen">
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
          <IconCheck />
        </figure>
        <h3>Keine Validierungsfehler gefunden.</h3>
      </div>
    </div>
  </SidebarInner>
</template>

<script lang="ts" setup>
import { PbViolation } from './../../../../../types'
import SidebarInner from './../../Inner/index.vue'
import IconCheck from './../../../Icons/Check.vue'

defineProps<{
  violations: PbViolation[]
}>()
</script>
