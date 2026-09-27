<template>
  <svg
    viewBox="0 0 100 120"
    aria-hidden="true"
    :class="negative ? 'fill-white' : 'fill-primary'"
  >
    <path d="M4 4H96V60C96 92 72 108 50 116C28 108 4 92 4 60Z" />
    <g :class="negative ? 'fill-primary' : 'fill-white'">
      <rect x="41" y="26" width="18" height="18" />
      <rect x="30" y="48" width="18" height="18" />
      <rect x="52" y="48" width="18" height="18" />
      <rect x="19" y="70" width="18" height="18" />
      <rect x="41" y="70" width="18" height="18" />
      <rect x="63" y="70" width="18" height="18" />
    </g>
  </svg>
</template>

<script lang="ts" setup>
// The coat of arms: a shield with six stacked blocks, a wall and the
// principle of the page at once. The size comes from the class, e.g.
// class="h-12 w-auto". Decorative: the site's name is always next to it.
defineProps<{
  // White shield, red blocks: on the red or ink ground.
  negative?: boolean
}>()
</script>
