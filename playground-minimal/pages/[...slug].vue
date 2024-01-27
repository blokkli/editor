<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="page"
    entity-uuid="1"
    :can-edit="true"
  >
    <BlokkliField name="content_blocks" :list="blocks" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { getBlocks } from './../helpers/minimalState'
const blocks = getBlocks()
</script>
