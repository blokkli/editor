<template>
  <DesignSystemMockup>
    <div class="container-wide flex flex-col gap-section py-8 lg:py-12">
      <section class="grid gap-x-grid gap-y-8 lg:grid-cols-12 lg:items-center">
        <div class="flex flex-col gap-5 lg:col-span-7">
          <h1 class="font-serif text-h1 text-balance">
            Wie können wir Ihnen helfen?
          </h1>
          <p class="max-w-content font-serif text-lead">
            Dienstleistungen, Auskünfte und Neuigkeiten der Gemeinde Blockingen
            – an einem Ort.
          </p>
          <SearchField
            large
            label="Suche"
            placeholder="z. B. Abfallkalender, Baugesuch, Hundetaxe"
            class="max-w-content"
          />
        </div>
        <figure class="flex flex-col gap-2 lg:col-span-5">
          <DesignSystemPlaceholder
            label="[Bild: Dorfansicht Blockingen]"
            class="aspect-3/2"
          />
          <figcaption class="text-small text-muted">
            Blick über den Dorfkern Richtung Kirche
          </figcaption>
        </figure>
      </section>

      <section
        aria-label="Heute"
        class="grid divide-y divide-line border-y border-t-ink border-b-line md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <div
          v-for="item in TODAY"
          :key="item.label"
          class="flex flex-col gap-1 py-5 md:px-6 md:first:pl-0"
        >
          <h2 class="text-label text-muted uppercase">{{ item.label }}</h2>
          <p class="flex items-center gap-2 font-semibold">
            <span v-if="item.open" class="size-2.5 shrink-0 bg-success" />
            {{ item.value }}
          </p>
          <a
            v-if="item.link"
            href="#"
            class="text-small text-primary underline hover:text-primary-dark"
          >
            {{ item.link }}
          </a>
          <p v-else class="text-small text-muted">{{ item.note }}</p>
        </div>
      </section>

      <section class="flex flex-col gap-5">
        <h2 class="font-serif text-h2">Häufig gesucht</h2>
        <ul class="grid gap-x-grid sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="label in FREQUENT" :key="label">
            <a
              href="#"
              class="flex items-center gap-3.5 border-b border-line py-4 font-semibold text-ink hover:text-primary"
            >
              <span class="size-3 shrink-0 bg-primary" />
              {{ label }}
            </a>
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-6">
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="font-serif text-h2">Aktuelles</h2>
          <a href="#" class="font-semibold text-primary hover:underline">
            Alle Meldungen →
          </a>
        </div>
        <div class="grid gap-x-grid gap-y-10 md:grid-cols-3">
          <article
            v-for="item in NEWS"
            :key="item.title"
            class="flex flex-col gap-3"
          >
            <DesignSystemPlaceholder :label="item.image" class="aspect-3/2" />
            <p class="pt-1 text-small text-muted">{{ item.meta }}</p>
            <h3 class="font-serif text-h3 font-semibold">
              <a href="#" class="text-ink hover:text-primary hover:underline">
                {{ item.title }}
              </a>
            </h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </section>

      <section
        class="grid gap-x-grid gap-y-8 bg-surface p-6 md:p-10 lg:grid-cols-12 lg:items-center"
      >
        <div class="flex flex-col gap-3 lg:col-span-7">
          <p class="text-label text-primary uppercase">Politik</p>
          <h2 class="font-serif text-h2 text-balance">
            Gemeindeversammlung vom 2. Dezember 2026
          </h2>
          <p class="max-w-content">
            Stimmberechtigte entscheiden über das Budget 2027 und den Kredit für
            die Sanierung der Schulhausturnhalle.
          </p>
        </div>
        <LinkList :items="ASSEMBLY" class="lg:col-span-5" />
      </section>

      <section class="grid gap-x-grid gap-y-section lg:grid-cols-2">
        <div class="flex flex-col gap-4">
          <div class="flex items-baseline justify-between gap-4">
            <h2 class="font-serif text-h2">Veranstaltungen</h2>
            <a href="#" class="font-semibold text-primary hover:underline">
              Kalender →
            </a>
          </div>
          <ul class="border-t border-ink">
            <li v-for="(item, index) in EVENTS" :key="item.title">
              <a
                href="#"
                class="flex items-center gap-4 border-b border-line py-4 text-ink hover:text-primary"
              >
                <span
                  class="flex size-15 shrink-0 flex-col items-center justify-center"
                  :class="
                    index === 0
                      ? 'bg-primary text-white'
                      : 'bg-primary-light text-primary-dark'
                  "
                >
                  <strong class="text-h3">{{ item.day }}</strong>
                  <span class="text-label">{{ item.month }}</span>
                </span>
                <span class="flex flex-col">
                  <span class="font-semibold">{{ item.title }}</span>
                  <span class="text-small text-muted">{{ item.meta }}</span>
                </span>
              </a>
            </li>
          </ul>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex items-baseline justify-between gap-4">
            <h2 class="font-serif text-h2">Amtliche Publikationen</h2>
            <a href="#" class="font-semibold text-primary hover:underline">
              Alle →
            </a>
          </div>
          <ul class="border-t border-ink">
            <li v-for="item in PUBLICATIONS" :key="item.title">
              <a
                href="#"
                class="flex items-center gap-4 border-b border-line py-4 text-ink hover:text-primary"
              >
                <span
                  class="flex size-15 shrink-0 items-center justify-center bg-surface text-primary"
                >
                  <SpriteSymbol name="document" class="size-6" />
                </span>
                <span class="flex flex-col">
                  <span class="font-semibold">{{ item.title }}</span>
                  <span class="text-small text-muted">{{ item.meta }}</span>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </DesignSystemMockup>
</template>

<script lang="ts" setup>
import { createError, useHead, useRoute } from '#imports'
import {
  DesignSystemMockup,
  DesignSystemPlaceholder,
  LinkList,
  SearchField,
  SpriteSymbol,
} from '#components'
import { isLanguage } from '#shared/languages'

// A mockup of the home page, to iterate on the design (see index.vue).
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

useHead({ title: 'Startseite – Mockup' })

const TODAY = [
  {
    label: 'Gemeindeverwaltung',
    value: 'Heute geöffnet',
    open: true,
    note: '08.00–11.30 und 14.00–17.00',
  },
  {
    label: 'Nächste Abfuhr',
    value: 'Kehricht · Dienstag, 29. September',
    link: 'Sammelkalender',
  },
  {
    label: 'Gemeindeversammlung',
    value: 'Mittwoch, 2. Dezember 2026',
    link: 'Traktanden',
  },
]

const FREQUENT = [
  'Online-Schalter',
  'Abfall & Recycling',
  'Steuern',
  'Baugesuch einreichen',
  'Wohnsitz melden',
  'Schule & Betreuung',
  'Raumvermietung',
  'Offene Stellen',
]

const NEWS = [
  {
    image: '[Bild: Dorfplatz]',
    meta: '24. September 2026 · Bau',
    title: 'Neugestaltung des Dorfplatzes beginnt im Oktober',
    text: 'Der Wochenmarkt zieht während der Bauzeit auf das Schulhausareal.',
  },
  {
    image: '[Bild: Gemeindehaus]',
    meta: '18. September 2026 · Verwaltung',
    title: 'Neue Öffnungszeiten der Gemeindekanzlei',
    text: 'Ab November zusätzlich am Donnerstagabend geöffnet.',
  },
  {
    image: '[Bild: Grüngutsammlung]',
    meta: '11. September 2026 · Umwelt',
    title: 'Grüngutabfuhr im Winter nur noch alle zwei Wochen',
    text: 'Die Termine sind im Sammelkalender eingetragen.',
  },
]

const ASSEMBLY = [
  { label: 'Traktandenliste', url: '#', meta: 'PDF · 120 KB' },
  {
    label: 'Botschaft an die Stimmberechtigten',
    url: '#',
    meta: 'PDF · 2.4 MB',
  },
  { label: 'Protokoll letzte Versammlung', url: '#', meta: 'PDF · 310 KB' },
]

const EVENTS = [
  {
    day: '08',
    month: 'OKT',
    title: 'Informationsabend Dorfplatz',
    meta: '19.30 · Mehrzweckhalle',
  },
  {
    day: '24',
    month: 'OKT',
    title: 'Herbstmarkt',
    meta: '09.00–16.00 · Schulhausareal',
  },
  {
    day: '02',
    month: 'DEZ',
    title: 'Gemeindeversammlung',
    meta: '20.00 · Mehrzweckhalle',
  },
]

const PUBLICATIONS = [
  {
    title: 'Baugesuch: Anbau Wintergarten, Rebweg 12',
    meta: 'Auflage bis 26. Oktober 2026',
  },
  {
    title: 'Verkehr: Temporäre Sperrung Dorfstrasse',
    meta: 'Ab 7. Oktober 2026',
  },
  {
    title: 'Reglement: Revision Gebühren Wasser',
    meta: 'Vernehmlassung bis 30. November 2026',
  },
]
</script>
