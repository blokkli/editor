<template>
  <header class="bg-blue-50 border-b border-b-slate-500/20">
    <div
      class="container flex flex-col md:flex-row items-center md:justify-between md:items-end py-20"
    >
      <div class="flex items-center gap-10">
        <div
          class="w-50 h-50 bg-blue-700 flex items-center justify-center rounded"
        >
          <SpriteSymbol name="logo" class="text-white w-full h-full" />
        </div>
        <NuxtLink to="/" class="font-extrabold text-2xl text-slate-800"
          >blökkli</NuxtLink
        >
      </div>
      <nav class="mt-20">
        <ul
          class="flex gap-20 items-end leading-none justify-center md:justify-start"
        >
          <li>
            <a href="/">Documentation</a>
          </li>
          <li>
            <a href="/">Features</a>
          </li>
          <li>
            <iframe
              src="https://ghbtns.com/github-btn.html?user=dulnan&repo=nuxt-multi-cache&type=star&count=true"
              frameborder="0"
              scrolling="0"
              width="84"
              height="20"
              title="GitHub"
              class="block"
            ></iframe>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script lang="ts" setup></script>
