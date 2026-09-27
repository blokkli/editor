<template>
  <DesignSystemMockup section="Verwaltung">
    <div class="pb-section">
      <!-- Below lg the sidebar's parts join the column (display: contents):
           the table of contents after the header, the contact at the end. -->
      <div
        class="container-wide flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-x-grid"
      >
        <div
          class="band flex flex-col gap-4 py-6 lg:col-span-8 lg:row-start-1 lg:pt-8 lg:pb-12"
        >
          <Breadcrumb
            class="mb-2"
            :items="[
              { label: 'Startseite', url: '#' },
              { label: 'Verwaltung', url: '#' },
              { label: 'Bauen & Planen', url: '#' },
              { label: 'Baugesuch einreichen' },
            ]"
          />
          <p class="text-label text-primary uppercase">Bauen & Planen</p>
          <h1 class="font-serif text-h1 text-balance">Baugesuch einreichen</h1>
          <p class="max-w-content font-serif text-lead">
            Wer baut, umbaut oder die Nutzung eines Gebäudes ändert, braucht in
            den meisten Fällen eine Baubewilligung. Hier erfahren Sie, wie das
            Verfahren abläuft und welche Unterlagen nötig sind.
          </p>
          <p class="flex flex-wrap gap-x-7 gap-y-1 text-small text-muted">
            <span>
              Zuständig: <strong class="text-ink">Bauverwaltung</strong>
            </span>
            <span>Aktualisiert am 14. September 2026</span>
          </p>
        </div>

        <!-- A white panel cut into the band. -->
        <aside
          class="contents lg:relative lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mt-8 lg:flex lg:flex-col lg:gap-10 lg:bg-white lg:p-6"
        >
          <nav aria-label="Auf dieser Seite" class="flex flex-col">
            <h2
              class="border-b border-ink pb-2.5 text-label text-muted uppercase"
            >
              Auf dieser Seite
            </h2>
            <ul>
              <li v-for="(item, index) in TOC" :key="item.id">
                <!-- The current section: a bar on the panel's edge (the
                     page's edge below lg), so the text stays aligned. -->
                <a
                  :href="`#${item.id}`"
                  class="relative block py-2 text-ink hover:text-primary"
                  :class="{
                    'font-bold before:absolute before:inset-y-1 before:-left-gutter before:w-1 before:bg-primary lg:before:-left-6':
                      index === 0,
                  }"
                  :aria-current="index === 0 ? 'true' : undefined"
                >
                  {{ item.label }}
                </a>
              </li>
            </ul>
          </nav>
          <div class="order-last flex flex-col gap-3 lg:order-none">
            <h2
              class="border-b border-ink pb-2.5 text-label text-muted uppercase"
            >
              Kontakt
            </h2>
            <p class="font-serif text-h3 font-semibold">Bauverwaltung</p>
            <p>
              Gemeindehaus, 1. Stock<br />Dorfstrasse 1<br />Termine nach
              Vereinbarung
            </p>
            <p>[Telefon]<br />[E-Mail]</p>
            <a href="#" class="button">Termin vereinbaren</a>
          </div>
        </aside>

        <article class="flex flex-col gap-flow lg:col-span-8 lg:row-start-2">
          <Callout type="info">
            <strong>Elektronisch einreichen:</strong> Baugesuche können Sie auch
            über den
            <a href="#" class="text-primary underline">Online-Schalter</a>
            einreichen. Pläne laden Sie als PDF hoch.
          </Callout>

          <div class="rich-text">
            <h2 id="bewilligung">Wann braucht es eine Bewilligung?</h2>
            <p>
              Eine Baubewilligung ist nötig für alle Bauten und Anlagen, die das
              Orts- oder Landschaftsbild, die Umwelt oder die Nachbarschaft
              betreffen können. Dazu gehören insbesondere:
            </p>
            <ul>
              <li>Neubauten, Anbauten und Aufstockungen</li>
              <li>Umbauten mit Änderung der Fassade oder des Dachs</li>
              <li>Umnutzungen, z. B. von Gewerbe- zu Wohnraum</li>
              <li>Stützmauern, Einfriedungen und Terrainveränderungen</li>
              <li>Abbrüche von Gebäuden</li>
            </ul>
            <p>
              Kleine Vorhaben wie Gartenhäuschen oder Solaranlagen auf dem Dach
              sind teilweise bewilligungsfrei, müssen aber gemeldet werden. Im
              Zweifelsfall hilft eine kurze <a href="#">Vorabklärung</a> bei der
              Bauverwaltung.
            </p>
          </div>

          <div class="flex flex-col gap-4">
            <h2 id="ablauf" class="font-serif text-h2">Ablauf</h2>
            <ol class="border-t border-line">
              <li
                v-for="(step, index) in STEPS"
                :key="step.title"
                class="flex gap-5 border-b border-line py-4"
              >
                <span
                  class="flex size-11 shrink-0 items-center justify-center font-serif text-h3 font-semibold"
                  :class="
                    index === STEPS.length - 1
                      ? 'bg-primary-light text-primary-dark'
                      : 'bg-primary text-white'
                  "
                >
                  {{ index + 1 }}
                </span>
                <div class="flex flex-col gap-1">
                  <h3 class="text-h3">{{ step.title }}</h3>
                  <p>{{ step.text }}</p>
                </div>
              </li>
            </ol>
          </div>

          <Callout type="warning">
            <strong>Wichtig:</strong> Beginnen Sie erst mit den Bauarbeiten,
            wenn die Bewilligung rechtskräftig ist. Andernfalls kann ein
            Baustopp verfügt werden.
          </Callout>

          <div class="rich-text">
            <h2 id="gebuehren">Gebühren</h2>
            <table>
              <thead>
                <tr>
                  <th>Vorhaben</th>
                  <th class="text-right">Gebühr</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in FEES" :key="row[0]">
                  <td>{{ row[0] }}</td>
                  <td class="text-right">{{ row[1] }}</td>
                </tr>
              </tbody>
            </table>
            <p class="text-small text-muted">
              Grundlage ist das Gebührenreglement der Gemeinde Blockingen.
            </p>
          </div>

          <div class="flex flex-col gap-4">
            <h2 id="unterlagen" class="font-serif text-h2">Unterlagen</h2>
            <LinkList download :items="DOCUMENTS" />
          </div>

          <div class="flex flex-col gap-4">
            <h2 id="fragen" class="font-serif text-h2">Häufige Fragen</h2>
            <div class="border-t border-ink">
              <details
                v-for="(item, index) in FAQ"
                :key="item.question"
                class="group border-b border-line"
                :open="index === 0"
              >
                <summary
                  class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-h3 [&::-webkit-details-marker]:hidden"
                >
                  {{ item.question }}
                  <SpriteSymbol
                    name="plus"
                    class="size-5 shrink-0 text-primary group-open:hidden"
                  />
                  <SpriteSymbol
                    name="minus"
                    class="hidden size-5 shrink-0 text-primary group-open:block"
                  />
                </summary>
                <p class="pb-5">{{ item.answer }}</p>
              </details>
            </div>
          </div>

          <div class="flex flex-col gap-4 border-t-2 border-ink pt-6">
            <h2 class="text-label text-muted uppercase">Verwandte Themen</h2>
            <ul class="grid gap-x-grid gap-y-6 md:grid-cols-3">
              <li v-for="item in RELATED" :key="item.title">
                <a href="#" class="group flex flex-col gap-1">
                  <span
                    class="flex items-center gap-2 font-bold text-primary group-hover:underline"
                  >
                    {{ item.title }}
                    <SpriteSymbol
                      name="arrow-right"
                      class="size-4.5 shrink-0"
                    />
                  </span>
                  <span class="text-small text-muted">{{ item.text }}</span>
                </a>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  </DesignSystemMockup>
</template>

<script lang="ts" setup>
import { createError, useHead, useRoute } from '#imports'
import {
  Breadcrumb,
  Callout,
  DesignSystemMockup,
  LinkList,
  SpriteSymbol,
} from '#components'
import { isLanguage } from '#shared/languages'

// A mockup of a service page, to iterate on the design (see index.vue).
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

useHead({ title: 'Baugesuch einreichen – Mockup' })

const TOC = [
  { id: 'bewilligung', label: 'Wann braucht es eine Bewilligung?' },
  { id: 'ablauf', label: 'Ablauf' },
  { id: 'gebuehren', label: 'Gebühren' },
  { id: 'unterlagen', label: 'Unterlagen' },
  { id: 'fragen', label: 'Häufige Fragen' },
]

const STEPS = [
  {
    title: 'Vorabklärung',
    text: 'Besprechen Sie Ihr Vorhaben frühzeitig mit der Bauverwaltung. Das spart Zeit und Überarbeitungen.',
  },
  {
    title: 'Gesuch einreichen',
    text: 'Formular, Situationsplan und Baupläne vollständig und unterzeichnet einreichen.',
  },
  {
    title: 'Prüfung und Publikation',
    text: 'Die Bauverwaltung prüft das Gesuch. Anschliessend werden Profile gestellt und das Gesuch öffentlich aufgelegt.',
  },
  {
    title: 'Einsprachefrist',
    text: 'Während der Auflage können Betroffene Einsprache erheben. Die Frist beträgt 30 Tage.',
  },
  {
    title: 'Bauentscheid',
    text: 'Der Gemeinderat entscheidet über das Gesuch. Nach Rechtskraft dürfen Sie mit dem Bau beginnen.',
  },
]

const FEES = [
  ['Kleinbauten und Meldeverfahren', '[Betrag]'],
  ['Um- und Anbauten', '[Betrag]'],
  ['Neubauten', 'nach Bausumme'],
  ['Publikation im Amtsblatt', 'nach Aufwand'],
]

const DOCUMENTS = [
  { label: 'Formular Baugesuch', url: '#', meta: 'PDF · 240 KB' },
  { label: 'Merkblatt Solaranlagen', url: '#', meta: 'PDF · 180 KB' },
  { label: 'Baureglement der Gemeinde', url: '#', meta: 'PDF · 1.1 MB' },
  { label: 'Gebührenreglement', url: '#', meta: 'PDF · 310 KB' },
]

const FAQ = [
  {
    question: 'Wie lange dauert ein Bewilligungsverfahren?',
    answer:
      'Bei vollständigen Unterlagen und ohne Einsprachen rechnen Sie mit sechs bis zehn Wochen. Einsprachen oder kantonale Zusatzbewilligungen verlängern das Verfahren.',
  },
  {
    question: 'Muss ich die Nachbarn informieren?',
    answer:
      'Die Gemeinde informiert die direkten Nachbarn mit der öffentlichen Auflage. Ein frühes Gespräch vermeidet aber oft Einsprachen.',
  },
  {
    question: 'Brauche ich eine Architektin oder einen Architekten?',
    answer:
      'Für kleine Vorhaben nicht. Die Pläne müssen aber vollständig und massstäblich sein.',
  },
]

const RELATED = [
  { title: 'Zonenplan', text: 'Welche Nutzung gilt für Ihr Grundstück?' },
  {
    title: 'Amtliche Publikationen',
    text: 'Aufgelegte Baugesuche einsehen',
  },
  { title: 'Energie & Förderung', text: 'Beiträge für Sanierungen' },
]
</script>
