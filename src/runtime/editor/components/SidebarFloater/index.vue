<template>
  <div class="sticky bottom-0 z-50 mt-15 p-15 bk-sidebar-floater">
    <div
      class="border border-mono-300 shadow-md-even overflow-hidden rounded focus-within:border-mono-500 bg-white"
    >
      <slot />
    </div>
  </div>
</template>

<style lang="postcss">
.bk-sidebar-floater {
  background: linear-gradient(0deg, white, rgba(255, 255, 255, 0));
}
</style>
