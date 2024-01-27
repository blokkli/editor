<template>
  <hr />
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'horizontal_rule',
})
</script>

<style>
hr {
  height: 6px;
  background: none;
  border: none;
  border-top: 2px solid;
}
</style>
