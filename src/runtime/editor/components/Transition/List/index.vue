<template>
  <TransitionGroup :tag name="bk-list-transition" class="bk-list-transition">
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /**
     * Tag rendered by the underlying `<TransitionGroup>`. Defaults to `div`.
     */
    tag?: string
  }>(),
  { tag: 'div' },
)
</script>

<style lang="postcss">
.bk-list-transition {
  /*
   * Allows direct children to interpolate `height` between `0` and intrinsic
   * keyword values like `auto`, removing the need for JS-driven height
   * measurements. Inherited, so descendants pick it up automatically.
   */
  interpolate-size: allow-keywords;
}

.bk-list-transition-enter-active,
.bk-list-transition-leave-active {
  transition:
    height 250ms cubic-bezier(0.56, 0.04, 0.25, 1),
    opacity 200ms ease;
  overflow: hidden;
}

.bk-list-transition-enter-from,
.bk-list-transition-leave-to {
  height: 0;
  opacity: 0;
}

.bk-list-transition-move {
  transition: transform 250ms cubic-bezier(0.56, 0.04, 0.25, 1);
}
</style>
