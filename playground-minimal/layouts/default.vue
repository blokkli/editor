<template>
  <div class="container">
    <header>
      <p>Minimal blökkli example</p>
    </header>
    <slot></slot>
  </div>
</template>

<style>
body {
  font-family: sans-serif;
  line-height: 1.5;
}

.container {
  max-width: 768px;
  margin: 0 auto;
}
</style>
