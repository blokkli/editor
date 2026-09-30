<template>
  <header>
    <a
      href="#main"
      class="sr-only bg-white px-4 py-3 font-semibold text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20"
    >
      {{ $texts('header.skip_to_content', 'Skip to content') }}
    </a>

    <slot name="banner" />

    <div class="border-b border-line bg-white">
      <div class="container-wide flex items-center gap-3 py-3 lg:gap-8 lg:py-4">
        <!-- No link while editing: the name is edited in place. -->
        <component
          :is="homeUrl ? SiteLink : 'div'"
          :to="homeUrl"
          class="mr-auto flex items-center gap-3 text-ink"
        >
          <slot name="logo">
            <Logo class="h-11 w-auto shrink-0 lg:h-12" />
          </slot>
          <span class="flex flex-col hyphens-none">
            <span class="font-serif text-body font-semibold lg:text-h3">
              <slot name="name" />
            </span>
            <span v-if="nameSecondary" class="text-small text-muted">
              {{ nameSecondary }}
            </span>
          </span>
        </component>

        <div class="flex flex-col items-end gap-1">
          <div
            v-if="$slots.service || serviceLinks?.length || languageLinks"
            class="hidden items-center gap-6 text-small text-muted lg:flex"
          >
            <nav
              v-if="$slots.service || serviceLinks?.length"
              :aria-label="$texts('header.service_navigation', 'Service')"
            >
              <slot name="service">
                <ul class="flex gap-6">
                  <li v-for="link in serviceLinks" :key="link.url + link.label">
                    <SiteLink :to="link.url" class="block py-1 hover:underline">
                      {{ link.label }}
                    </SiteLink>
                  </li>
                </ul>
              </slot>
            </nav>
            <LanguageSwitch
              v-if="languageLinks"
              :links="languageLinks"
              class="-mr-1.5"
            />
          </div>

          <div class="flex items-center gap-3 lg:gap-8">
            <nav
              v-if="links?.length"
              :aria-label="$texts('header.main_navigation', 'Main navigation')"
              class="hidden lg:block"
            >
              <ul class="flex gap-8 font-semibold">
                <li v-for="link in links" :key="link.url + link.label">
                  <SiteLink
                    :to="link.url"
                    :aria-current="link.isActive ? 'true' : undefined"
                    class="block py-2 decoration-2 underline-offset-8 hover:text-primary hover:underline"
                    :class="
                      link.isActive ? 'text-primary underline' : 'text-ink'
                    "
                  >
                    {{ link.label }}
                  </SiteLink>
                </li>
              </ul>
            </nav>

            <SiteLink
              v-if="searchUrl"
              :to="searchUrl"
              class="flex size-11 shrink-0 items-center justify-center border border-line hover:border-ink"
              :aria-label="$texts('header.search', 'Search')"
            >
              <SpriteSymbol name="search" class="size-5" />
            </SiteLink>

            <button
              v-if="hasMenu"
              type="button"
              class="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 border border-line px-2.5 font-semibold hover:border-ink lg:hidden"
              aria-controls="page-header-menu"
              :aria-expanded="isMenuOpen"
              @click="isMenuOpen = !isMenuOpen"
            >
              <SpriteSymbol
                :name="isMenuOpen ? 'close' : 'menu'"
                class="size-5"
              />
              <span class="sr-only sm:not-sr-only">
                {{ $texts('header.menu', 'Menu') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="hasMenu"
      v-show="isMenuOpen"
      id="page-header-menu"
      class="border-b border-line bg-white lg:hidden"
    >
      <div class="container-wide pb-4">
        <nav
          v-if="links?.length"
          :aria-label="$texts('header.main_navigation', 'Main navigation')"
        >
          <ul>
            <li
              v-for="link in links"
              :key="link.url + link.label"
              class="border-b border-line"
            >
              <SiteLink
                :to="link.url"
                :aria-current="link.isActive ? 'true' : undefined"
                class="flex items-center justify-between gap-4 py-4 text-h3"
                :class="link.isActive ? 'text-primary' : 'text-ink'"
                @click="isMenuOpen = false"
              >
                {{ link.label }}
                <SpriteSymbol name="arrow-right" class="size-5 text-primary" />
              </SiteLink>
            </li>
          </ul>
        </nav>
        <ul v-if="serviceLinks?.length" class="flex flex-col pt-3">
          <li v-for="link in serviceLinks" :key="link.url + link.label">
            <SiteLink
              :to="link.url"
              class="block py-2 underline"
              @click="isMenuOpen = false"
            >
              {{ link.label }}
            </SiteLink>
          </li>
        </ul>
        <LanguageSwitch
          v-if="languageLinks"
          :links="languageLinks"
          class="-ml-1.5 pt-3"
        />
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed, ref } from '#imports'
import { LanguageSwitch, Logo, SiteLink, SpriteSymbol } from '#components'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'

type Link = { label: string; url: string }

// The site's header: the logo, and on its right the service links and the
// language switch (small) above the main navigation and a link to the search
// page. Below lg, the navigation is a panel behind a menu button, with the
// service links and the language switch. Slots: the banner above everything
// else (e.g. a site-wide notice), the name (required), the logo (the Logo by
// default) and the service links above the navigation, e.g. an editable field
// (the panel still gets them as serviceLinks). Parts without content aren't
// rendered.
const props = defineProps<{
  nameSecondary?: string
  homeUrl?: string
  searchUrl?: string
  // isActive: the current page is in this section.
  links?: (Link & { isActive?: boolean })[]
  serviceLinks?: Link[]
  languageLinks?: LanguageSwitchLinkFragment[] | null
}>()

const hasMenu = computed(
  () =>
    !!props.links?.length ||
    !!props.serviceLinks?.length ||
    !!props.languageLinks,
)

const isMenuOpen = ref(false)
</script>
