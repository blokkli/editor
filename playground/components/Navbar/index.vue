<template>
  <header class="bg-accent-50 border-b border-b-mono-500/20">
    <div class="container flex justify-between items-center py-10 md:py-20">
      <div class="flex items-center gap-5 md:gap-10">
        <div
          class="w-20 h-20 md:w-50 md:h-50 bg-accent-700 flex items-center justify-center rounded"
        >
          <SpriteSymbol name="logo" class="text-white w-full h-full" />
        </div>
        <NuxtLink to="/" class="text-lg md:text-2xl text-mono-800">
          <span class="font-extrabold">blökkli</span>
          <sup class="ml-5 text-[0.5em] align-middle text-mono-800"
            >v{{ version }}</sup
          >
        </NuxtLink>
      </div>
      <nav>
        <ul
          class="flex gap-20 items-center leading-none justify-center md:justify-start text-sm"
        >
          <li>
            <a href="https://docs.blokk.li">Docs</a>
          </li>
          <li>
            <iframe
              src="https://ghbtns.com/github-btn.html?user=blokkli&repo=editor&type=star&count=true"
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

<script lang="ts" setup>
import { useRuntimeConfig } from '#imports'

const version = useRuntimeConfig().public.version
</script>
