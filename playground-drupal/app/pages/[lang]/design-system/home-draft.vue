<template>
  <DesignSystemMockup>
    <div
      class="container-wide flex flex-col gap-section pb-8 lg:gap-24 lg:pb-12"
    >
      <section
        class="band grid gap-x-grid gap-y-8 py-8 lg:grid-cols-12 lg:items-center lg:py-12"
      >
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
        <DesignSystemPlaceholder
          label="[Bild: das Titelbild der Seite]"
          class="aspect-3/2 lg:col-span-5"
        />
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
        <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
        >
          <h2 class="font-serif text-h2">Aktuelles</h2>
          <a href="#" class="font-semibold text-primary hover:underline">
            Alle Meldungen →
          </a>
        </div>
        <div class="grid gap-x-grid gap-y-10 md:grid-cols-3">
          <a
            v-for="item in NEWS"
            :key="item.title"
            href="#"
            class="group flex flex-col gap-3 text-ink"
          >
            <DesignSystemPlaceholder :label="item.image" class="aspect-3/2" />
            <p class="pt-1 text-small text-muted">{{ item.date }}</p>
            <h3
              class="font-serif text-h3 font-semibold group-hover:text-primary group-hover:underline"
            >
              {{ item.title }}
            </h3>
            <p>{{ item.lead }}</p>
          </a>
        </div>
      </section>

      <section
        class="flex flex-col gap-6 bg-surface p-6 md:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-grid"
      >
        <div class="flex max-w-content flex-col gap-3">
          <p class="text-label text-primary uppercase">Politik</p>
          <h2 class="font-serif text-h2 text-balance">
            Gemeindeversammlung vom 2. Dezember 2026
          </h2>
          <p>
            Die Stimmberechtigten entscheiden über das Budget 2027 und den
            Kredit für die Sanierung der Schulhausturnhalle.
          </p>
        </div>
        <a href="#" class="button shrink-0 self-start lg:self-center">
          Traktanden und Unterlagen
        </a>
      </section>

      <div class="grid gap-x-grid gap-y-section lg:grid-cols-2">
        <section
          v-for="list in LISTS"
          :key="list.title"
          class="flex flex-col gap-4"
        >
          <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          >
            <h2 class="font-serif text-h2">{{ list.title }}</h2>
            <a href="#" class="font-semibold text-primary hover:underline">
              {{ list.more }}
            </a>
          </div>
          <div class="border-t border-ink">
            <a
              v-for="item in list.items"
              :key="item.title"
              href="#"
              class="group flex items-center gap-4 border-b border-line py-4 text-ink"
            >
              <span
                v-if="'day' in item"
                class="flex size-15 shrink-0 flex-col items-center justify-center bg-primary-light text-primary-dark"
                aria-hidden="true"
              >
                <strong class="text-h3">{{ item.day }}</strong>
                <span class="text-label uppercase">{{ item.month }}</span>
              </span>
              <span
                v-else
                class="flex size-15 shrink-0 items-center justify-center bg-surface text-primary"
                aria-hidden="true"
              >
                <SpriteSymbol name="document" class="size-6" />
              </span>
              <span class="flex grow flex-col">
                <span
                  class="font-semibold group-hover:text-primary group-hover:underline"
                >
                  {{ item.title }}
                </span>
                <span class="text-small text-muted">{{ item.meta }}</span>
              </span>
              <SpriteSymbol
                name="arrow-right"
                class="size-5 shrink-0 text-primary"
              />
            </a>
          </div>
        </section>
      </div>
    </div>
  </DesignSystemMockup>
</template>

<script lang="ts" setup>
import { createError, useHead, useRoute } from '#imports'
import {
  DesignSystemMockup,
  DesignSystemPlaceholder,
  SearchField,
  SpriteSymbol,
} from '#components'
import { isLanguage } from '#shared/languages'

// The home page as it will be built (15f), simplified from the canvas's
// mockup (home.vue):
// - the hero is the node's title, lead and hero image; the search field and
//   the "Today" row are hardcoded in the page component
// - the frequently searched links are the site config page's
// - the blocks: the automatic teaser lists (news as cards, events and
//   publications as lists; the teasers' own markup) and a call to action with
//   one link
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

useHead({ title: 'Startseite (Entwurf) – Mockup' })

const TODAY = [
  {
    label: 'Gemeindeverwaltung',
    value: 'Heute geöffnet',
    open: true,
    note: '08.00–11.30 und 14.00–17.00',
  },
  {
    label: 'Nächste Abfuhr',
    value: 'Kehricht · Dienstag, 6. Oktober',
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

// News have no categories: the date is the teaser's meta.
const NEWS = [
  {
    image: '[Bild: Dorfplatz]',
    date: '24. September 2026',
    title: 'Neugestaltung des Dorfplatzes beginnt im Oktober',
    lead: 'Der Wochenmarkt zieht während der Bauzeit auf das Schulhausareal.',
  },
  {
    image: '[Bild: Gemeindehaus]',
    date: '18. September 2026',
    title: 'Neue Öffnungszeiten der Gemeindekanzlei',
    lead: 'Ab November zusätzlich am Donnerstagabend geöffnet.',
  },
  {
    image: '[Bild: Grüngutsammlung]',
    date: '11. September 2026',
    title: 'Grüngutabfuhr im Winter nur noch alle zwei Wochen',
    lead: 'Die Termine sind im Sammelkalender eingetragen.',
  },
]

const LISTS = [
  {
    title: 'Veranstaltungen',
    more: 'Alle Veranstaltungen →',
    items: [
      {
        day: '8',
        month: 'Okt',
        title: 'Informationsabend Dorfplatz',
        meta: 'Donnerstag, 8. Oktober, 19.30 · Mehrzweckhalle',
      },
      {
        day: '24',
        month: 'Okt',
        title: 'Herbstmarkt',
        meta: 'Samstag, 24. Oktober, 09.00–16.00 · Schulhausareal',
      },
      {
        day: '2',
        month: 'Dez',
        title: 'Gemeindeversammlung',
        meta: 'Mittwoch, 2. Dezember, 20.00 · Mehrzweckhalle',
      },
    ],
  },
  {
    title: 'Amtliche Publikationen',
    more: 'Alle Publikationen →',
    items: [
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
    ],
  },
]
</script>
