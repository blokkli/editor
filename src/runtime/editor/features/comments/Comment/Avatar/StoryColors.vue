<template>
  <div class="flex flex-wrap gap-15 [--bk-comment-avatar-size:40px]">
    <CommentAvatar
      v-for="i in COLOR_COUNT"
      :key="i"
      :name="nameFor(i)"
      :seed="String.fromCharCode(96 + i)"
    />
  </div>
</template>

<script lang="ts" setup>
import CommentAvatar from './index.vue'

const COLOR_COUNT = 20

const FIRST_NAMES = [
  'Sarah',
  'Aisha',
  'Lukas',
  'Diego',
  'Martin',
  'John',
  'Greta',
  'Felix',
  'Anna',
  'Noah',
]

const LAST_NAMES = [
  'Chen',
  'Patel',
  'Müller',
  'Ramírez',
  'Faux',
  'Miller',
  'Hofer',
  'Bauer',
  'Beck',
  'Lang',
]

function nameFor(i: number): string {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`
}
</script>

<script lang="ts">
export default {
  name: 'CommentAvatarStoryColors',
}
</script>
