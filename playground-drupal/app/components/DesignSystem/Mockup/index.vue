<template>
  <div class="flex min-h-screen flex-col">
    <PageHeader
      name-secondary="Commune de Bloquens"
      :home-url="`/${language}/design-system/home`"
      :links
      :service-links="[
        { label: 'Online-Schalter', url: '#' },
        { label: 'Kontakt', url: '#' },
      ]"
      :language-links
      search-url="#"
    >
      <template #name>Gemeinde Blockingen</template>
    </PageHeader>

    <main id="main" lang="de" class="grow overflow-x-clip">
      <slot />
    </main>

    <PageFooter name="Gemeinde Blockingen" name-secondary="Commune de Bloquens">
      <template #address>
        <p>Gemeindeverwaltung<br />Dorfstrasse 1<br />[PLZ] Blockingen</p>
      </template>

      <div class="flex flex-col gap-2 lg:col-span-3">
        <h2 class="text-label text-white uppercase">Öffnungszeiten</h2>
        <p>
          Mo–Fr 08.00–11.30<br />Mo, Di, Do 14.00–17.00<br />oder nach
          Vereinbarung
        </p>
      </div>
      <div class="flex flex-col gap-2 lg:col-span-2">
        <h2 class="text-label text-white uppercase">Kontakt</h2>
        <p>[Telefon]<br />[E-Mail]</p>
      </div>
      <div class="flex flex-col gap-2 lg:col-span-3">
        <h2 class="text-label text-white uppercase">Direkt</h2>
        <ul>
          <li v-for="label in DIRECT" :key="label">
            <a href="#" class="text-white underline hover:no-underline">{{
              label
            }}</a>
          </li>
        </ul>
      </div>

      <template #bottom>
        <span>© Gemeinde Blockingen</span>
        <ul class="flex flex-wrap gap-x-6 gap-y-2">
          <li v-for="label in LEGAL" :key="label">
            <a href="#" class="underline hover:text-white">{{ label }}</a>
          </li>
        </ul>
      </template>
    </PageFooter>
  </div>
</template>

<script lang="ts" setup>
import { computed, useRoute } from '#imports'
import { PageFooter, PageHeader } from '#components'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'
import { LANGUAGE_NAMES, LANGUAGES } from '#shared/languages'

// The site's shell around a mockup, with German copy as in the canvas.
const props = defineProps<{
  // The main navigation's section the page belongs to.
  section?: string
}>()

const DIRECT = ['Online-Schalter', 'Behörden & Kommissionen', 'Reglemente']
const LEGAL = ['Impressum', 'Datenschutz', 'Barrierefreiheit']

const route = useRoute()
const language = useLanguage()

const links = computed(() =>
  ['Leben & Wohnen', 'Verwaltung', 'Politik', 'Aktuelles'].map((label) => ({
    label,
    url: '#',
    isActive: label === props.section,
  })),
)

// The same mockup in every language: only the UI strings change.
const languageLinks = computed<LanguageSwitchLinkFragment[]>(() =>
  LANGUAGES.map((id) => ({
    title: LANGUAGE_NAMES[id],
    language: { id },
    url: { path: route.path.replace(/^\/[a-z]+/, `/${id}`) },
  })),
)
</script>
