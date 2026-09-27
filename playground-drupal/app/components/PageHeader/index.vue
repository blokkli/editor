<template>
  <header>
    <a
      href="#main"
      class="sr-only bg-white px-4 py-3 font-semibold text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20"
    >
      {{ $texts('header.skip_to_content', 'Skip to content') }}
    </a>

    <div class="on-dark bg-ink text-white">
      <div class="container-wide flex items-center justify-end gap-6">
        <nav
          :aria-label="$texts('header.service_navigation', 'Service')"
          class="hidden md:block"
        >
          <ul class="flex gap-6 text-small">
            <li v-for="link in serviceLinks" :key="link.url + link.label">
              <a :href="link.url" class="block py-2 hover:underline">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>
        <LanguageSwitch :links="languageLinks" />
      </div>
    </div>

    <div class="border-b-4 border-primary bg-white">
      <div class="container-wide flex items-center gap-3 py-3 lg:gap-8 lg:py-5">
        <a :href="homeUrl" class="mr-auto flex items-center gap-3 text-ink">
          <Logo class="h-11 w-auto shrink-0 lg:h-12" />
          <span class="flex flex-col hyphens-none">
            <span class="font-serif text-body font-semibold lg:text-h3">
              {{ name }}
            </span>
            <span v-if="nameSecondary" class="text-small text-muted">
              {{ nameSecondary }}
            </span>
          </span>
        </a>

        <nav
          :aria-label="$texts('header.main_navigation', 'Main navigation')"
          class="hidden lg:block"
        >
          <ul class="flex gap-8 font-semibold">
            <li v-for="link in links" :key="link.url + link.label">
              <a
                :href="link.url"
                :aria-current="link.isActive ? 'true' : undefined"
                class="block py-2 decoration-2 underline-offset-8 hover:text-primary hover:underline"
                :class="link.isActive ? 'text-primary underline' : 'text-ink'"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          class="flex size-11 shrink-0 items-center justify-center border border-line hover:border-ink"
          aria-controls="page-header-search"
          :aria-expanded="isSearchOpen"
          :aria-label="$texts('header.search', 'Search')"
          @click="toggleSearch"
        >
          <SpriteSymbol
            :name="isSearchOpen ? 'close' : 'search'"
            class="size-5"
          />
        </button>

        <button
          type="button"
          class="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 border border-line px-2.5 font-semibold hover:border-ink lg:hidden"
          aria-controls="page-header-menu"
          :aria-expanded="isMenuOpen"
          @click="toggleMenu"
        >
          <SpriteSymbol :name="isMenuOpen ? 'close' : 'menu'" class="size-5" />
          <span class="sr-only sm:not-sr-only">
            {{ $texts('header.menu', 'Menu') }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-show="isSearchOpen"
      id="page-header-search"
      class="border-b border-line bg-surface"
    >
      <div class="container-wide py-5">
        <SearchField
          :label="$texts('header.search_label', 'Search the website')"
        />
      </div>
    </div>

    <div
      v-show="isMenuOpen"
      id="page-header-menu"
      class="border-b border-line bg-white lg:hidden"
    >
      <div class="container-wide pb-4">
        <nav :aria-label="$texts('header.main_navigation', 'Main navigation')">
          <ul>
            <li
              v-for="link in links"
              :key="link.url + link.label"
              class="border-b border-line"
            >
              <a
                :href="link.url"
                :aria-current="link.isActive ? 'true' : undefined"
                class="flex items-center justify-between gap-4 py-4 text-h3"
                :class="link.isActive ? 'text-primary' : 'text-ink'"
                @click="isMenuOpen = false"
              >
                {{ link.label }}
                <SpriteSymbol name="arrow-right" class="size-5 text-primary" />
              </a>
            </li>
          </ul>
        </nav>
        <ul class="flex flex-col pt-3 md:hidden">
          <li v-for="link in serviceLinks" :key="link.url + link.label">
            <a :href="link.url" class="block py-2 underline">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import { LanguageSwitch, Logo, SearchField, SpriteSymbol } from '#components'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'

type Link = { label: string; url: string }

// The site's header: a service bar with the language switch, the logo and the
// main navigation. Below lg, the navigation is a panel behind a menu button.
defineProps<{
  name: string
  nameSecondary?: string
  homeUrl: string
  // isActive: the current page is in this section.
  links: (Link & { isActive?: boolean })[]
  serviceLinks: Link[]
  languageLinks: LanguageSwitchLinkFragment[]
}>()

const isMenuOpen = ref(false)
const isSearchOpen = ref(false)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  isSearchOpen.value = false
}

function toggleSearch() {
  isSearchOpen.value = !isSearchOpen.value
  isMenuOpen.value = false
}
</script>
