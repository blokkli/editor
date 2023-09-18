<template>
  <SidebarInner title="Kommentare">
    <div class="pb pb-comments pb-control">
      <ul>
        <li v-for="comment in comments">
          <Comment v-bind="comment" />
        </li>
      </ul>
    </div>
  </SidebarInner>
</template>

<script lang="ts" setup>
import { PbComment } from './../../../../../types'
import Comment from './../../../Comment/index.vue'
import SidebarInner from './../../Inner/index.vue'

defineProps<{
  comments: PbComment[]
}>()
</script>
