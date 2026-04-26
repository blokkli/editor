<template>
  <Transition name="bk-collapse-transition">
    <slot />
  </Transition>
</template>

<style lang="postcss">
.bk-collapse-transition-enter-active,
.bk-collapse-transition-leave-active {
  /*
   * Allows `height` to interpolate between `0` and the intrinsic `auto`
   * value without measuring with JS. Inherited, so the property only needs
   * to be set on the transitioning element itself.
   */
  interpolate-size: allow-keywords;
  transition:
    height 250ms cubic-bezier(0.56, 0.04, 0.25, 1),
    opacity 200ms ease;
  overflow: hidden;
}

.bk-collapse-transition-enter-from,
.bk-collapse-transition-leave-to {
  height: 0;
  opacity: 0;
}
</style>
