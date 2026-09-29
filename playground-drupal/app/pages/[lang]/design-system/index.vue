<template>
  <!-- Documentation for the people building the demo: English, no $texts. -->
  <div lang="en" class="flex min-h-screen flex-col">
    <header class="border-b-4 border-primary">
      <div
        class="container-wide flex flex-wrap items-center gap-x-8 gap-y-3 py-4"
      >
        <div class="mr-auto flex items-center gap-3">
          <Logo class="h-11 w-auto shrink-0" />
          <span class="flex flex-col">
            <span class="font-serif text-h3 font-semibold">Design system</span>
            <span class="text-small text-muted">Blockingen / Bloquens</span>
          </span>
        </div>
        <nav aria-label="Mockups">
          <ul class="flex gap-6 font-semibold">
            <li v-for="mockup in MOCKUPS" :key="mockup.path">
              <a
                :href="`/${language}/design-system/${mockup.path}`"
                class="text-primary underline hover:text-primary-dark"
              >
                {{ mockup.label }}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <div
      class="container-wide grid grow gap-x-grid gap-y-10 py-10 lg:grid-cols-12"
    >
      <nav aria-label="Sections" class="lg:col-span-3">
        <ul
          class="flex flex-wrap gap-x-5 gap-y-1 lg:sticky lg:top-6 lg:flex-col"
        >
          <li v-for="section in SECTIONS" :key="section.id">
            <a :href="`#${section.id}`" class="block py-1 hover:text-primary">
              {{ section.label }}
            </a>
          </li>
        </ul>
      </nav>

      <main id="main" class="flex min-w-0 flex-col gap-section lg:col-span-9">
        <section id="principles" class="flex flex-col gap-5">
          <h1 class="font-serif text-h1">Design system</h1>
          <p class="max-w-content font-serif text-lead">
            The look of Blockingen / Bloquens: tokens, type and the parts pages
            are built from. It follows direction A (“Wappen”) of the Claude
            Design canvas, a work in progress, and is iterated on here and in
            the mockups.
          </p>
          <ul class="flex max-w-content list-disc flex-col gap-2 pl-6">
            <li>
              <strong>Everything fits together.</strong> Pages are built from
              blocks, so spacing, colours and type come from these tokens, never
              from one-off values.
            </li>
            <li>
              <strong>Red is the coat of arms.</strong> It marks actions, the
              current section and small accents. Large areas stay white, surface
              or ink.
            </li>
            <li>
              <strong>Square corners, rules instead of shadows.</strong>
            </li>
            <li>
              <strong>Readable first.</strong> Body text is 17–18 px, and every
              text colour passes WCAG AA on its ground.
            </li>
            <li>
              <strong>Mobile first.</strong> One column below 1024 px, the
              12-column grid from there.
            </li>
          </ul>
        </section>

        <section id="logo" :class="SECTION">
          <h2 class="font-serif text-h2">Logo</h2>
          <div class="grid gap-grid md:grid-cols-2">
            <div class="flex items-center gap-4 bg-surface p-8">
              <Logo class="h-20 w-auto shrink-0" />
              <span class="flex flex-col hyphens-none">
                <span class="font-serif text-h2">Gemeinde Blockingen</span>
                <span class="text-muted">Commune de Bloquens</span>
              </span>
            </div>
            <div class="grid grid-cols-3 gap-grid">
              <div class="flex items-center justify-center bg-primary p-6">
                <Logo negative class="h-14 w-auto" />
              </div>
              <div class="flex items-center justify-center bg-ink p-6">
                <Logo negative class="h-14 w-auto" />
              </div>
              <div
                class="flex items-end justify-center gap-4 border border-line p-6"
              >
                <Logo class="h-12 w-auto" />
                <Logo class="h-8 w-auto" />
                <Logo class="h-4 w-auto" />
              </div>
            </div>
          </div>
          <p class="max-w-content text-muted">
            A shield in Wappenrot with a wall of six blocks: heraldic, and the
            building-block principle of the editor. Always next to the name.
            Negative on the red and ink grounds.
          </p>
        </section>

        <section id="colours" :class="SECTION">
          <h2 class="font-serif text-h2">Colours</h2>
          <p class="max-w-content">
            Tailwind's default palette is removed: only these colours exist, as
            <code>bg-*</code>, <code>text-*</code>, <code>border-*</code> and so
            on.
          </p>
          <div
            v-for="group in COLOURS"
            :key="group.label"
            class="flex flex-col gap-3"
          >
            <h3 class="text-h3">{{ group.label }}</h3>
            <ul class="grid grid-cols-2 gap-grid sm:grid-cols-3 xl:grid-cols-5">
              <li
                v-for="colour in group.colours"
                :key="colour.token"
                class="flex flex-col gap-1"
              >
                <span
                  class="mb-1 h-16 border border-line"
                  :class="colour.swatch"
                />
                <code class="font-semibold">{{ colour.token }}</code>
                <span class="text-small text-muted">{{ colour.hex }}</span>
                <span class="text-small">{{ colour.use }}</span>
              </li>
            </ul>
          </div>
          <div id="chart-colours" class="flex flex-col gap-3">
            <h3 class="text-h3">Charts</h3>
            <p class="max-w-content">
              Only for charts (<code>shared/chartColors.ts</code>, blökkli's
              <code>colorOptions</code>): a family per colour above, its 600.
              Editors pick any shade; new charts use the outlined main shades,
              in this order.
            </p>
            <ul class="flex flex-col gap-2">
              <li
                v-for="family in chartColours"
                :key="family.id"
                class="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] items-center gap-1"
              >
                <code class="font-semibold">{{ family.id }}</code>
                <span
                  v-for="shade in family.shades"
                  :key="shade.id"
                  class="flex h-10 items-end p-1 text-small"
                  :class="[
                    shade.id >= '500' ? 'text-white' : 'text-ink',
                    { 'outline-2 outline-offset-2 outline-ink': shade.isMain },
                  ]"
                  :style="{ backgroundColor: shade.hex }"
                >
                  {{ shade.id }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section id="typography" :class="SECTION">
          <h2 class="font-serif text-h2">Typography</h2>
          <div class="grid gap-grid md:grid-cols-2">
            <div class="flex flex-col gap-1 bg-surface p-6">
              <span class="font-serif text-[4.5rem] leading-none font-semibold">
                Aa
              </span>
              <strong>Source Serif 4</strong>
              <span class="text-small text-muted">
                h1, h2, lead and names · 600, with optical sizes
              </span>
            </div>
            <div class="flex flex-col gap-1 bg-surface p-6">
              <span class="text-[4.5rem] leading-none">Aa</span>
              <strong>Source Sans 3</strong>
              <span class="text-small text-muted">
                Text, h3 and the interface · 400, 600, 700
              </span>
            </div>
          </div>
          <p class="max-w-content">
            Self-hosted (<code>@fontsource-variable</code>), no request to
            Google. The sizes are fluid between a 375 and a 1440 px wide
            viewport; each token carries its line height and weight, so
            templates use no <code>leading-*</code> or <code>tracking-*</code>.
          </p>
          <ul class="flex flex-col border-t border-ink">
            <li
              v-for="type in TYPE"
              :key="type.token"
              class="grid gap-x-grid gap-y-2 border-b border-line py-5 md:grid-cols-4"
            >
              <div class="flex flex-col text-small">
                <code class="font-semibold">{{ type.token }}</code>
                <span class="text-muted">{{ type.size }}</span>
                <span class="text-muted">{{ type.details }}</span>
              </div>
              <p class="md:col-span-3" :class="type.classes">
                {{ type.sample }}
              </p>
            </li>
          </ul>
          <h3 class="text-h3">Rich text</h3>
          <p class="max-w-content">
            Formatted text from Drupal gets <code>.rich-text</code>: headings,
            lists, links and tables in the same scale.
          </p>
          <div lang="de" class="rich-text max-w-content border border-line p-6">
            <h2>Kehrichtabfuhr</h2>
            <p>
              Der Hauskehricht wird jeden Dienstag ab 07.00 Uhr abgeholt.
              Stellen Sie gebührenpflichtige Säcke am Vorabend an den
              Strassenrand. Mehr dazu im <a href="#">Sammelkalender</a>.
            </p>
            <h3>Was gehört nicht in den Kehricht?</h3>
            <ul>
              <li>Glas, Metall und Papier</li>
              <li>Grüngut und Küchenabfälle</li>
              <li>Batterien und Elektrogeräte</li>
            </ul>
            <table>
              <thead>
                <tr>
                  <th>Abfall</th>
                  <th>Abholung</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Kehricht</td>
                  <td>Jeden Dienstag</td>
                </tr>
                <tr>
                  <td>Grüngut</td>
                  <td>Donnerstag, alle zwei Wochen</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="layout" :class="SECTION">
          <h2 class="font-serif text-h2">Layout</h2>
          <p class="max-w-content">
            Mobile first with Tailwind's breakpoints. Content sits in a
            container, aligned to the left of the grid:
            <code>container-wide</code> (75rem plus the gutter on both sides; at
            1440 px it leaves 120 px of margin, as in the canvas) or
            <code>container-content</code>, the content column: the wide
            container's left 8 of 12 columns from lg, about 80 characters a
            line. A block's width option picks one of them, or the whole page.
          </p>
          <p class="max-w-content">
            Two page types. The <strong>detail page</strong>, the last page in
            its branch of the menu, always has the sidebar layout of the detail
            mockup (<code>Host/Layout</code>) from lg: the header in columns
            1–8, the sidebar as a white panel cutting into the header in columns
            9–12, the blocks below the header. Inside, every container means the
            column. It has no hero image; its responsible office fills the
            header's meta and the contact fragment in the sidebar. The
            <strong>editorial page</strong> (the home page, overview pages,
            landing pages) has a hero image and no sidebar. So do events and
            offices: their key facts (<code>Facts</code>, the editorial mockup's
            row under a primary rule) follow the header. An event's date, time
            and place are large; an office has its address, contact and opening
            hours.
          </p>
          <p class="max-w-content">
            Both are in Drupal's main menu. The header shows its first level;
            the breadcrumb (Drupal's, from the menu) sits above the title; a
            detail page's eyebrow is its parent; an editorial page lists its
            children at the top of its body.
          </p>
          <p class="max-w-content">
            The blocks know where they are from their field list type:
            <code>sidebar</code>, <code>footer</code> (the ink ground: buttons,
            links and neutral colours flip, see <code>on-dark</code>),
            <code>notice</code> (the banner above the header) or
            <code>service</code> (the header's service links).
          </p>
          <p class="max-w-content">
            <code>band</code> puts a page's header on a
            <code>surface</code> background as wide as the window. The hero
            image follows it, as wide as the container, with the band reaching
            halfway down the image. No overlays or gradients: the title never
            sits on the image. An ancestor clips the band with
            <code>overflow-x-clip</code>.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[32rem] text-left">
              <thead>
                <tr class="border-b-2 border-ink">
                  <th class="py-2 pr-4">Token</th>
                  <th class="py-2 pr-4">Below md</th>
                  <th class="py-2 pr-4">md (768)</th>
                  <th class="py-2 pr-4">lg (1024)</th>
                  <th class="py-2">For</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in SPACING"
                  :key="row.token"
                  class="border-b border-line"
                >
                  <td class="py-3 pr-4">
                    <code>{{ row.token }}</code>
                  </td>
                  <td
                    v-for="value in row.values"
                    :key="value"
                    class="py-3 pr-4"
                  >
                    {{ value }}
                  </td>
                  <td class="py-3 text-small text-muted">{{ row.use }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="text-h3">Grid</h3>
          <p class="max-w-content">
            12 columns from lg, with <code>gap-grid</code>; below, one column.
            The editor's grid overlay shows the same columns.
          </p>
          <div class="grid grid-cols-12 gap-grid">
            <span
              v-for="column in 12"
              :key="column"
              class="flex h-16 items-end justify-center bg-primary-light pb-1 text-small text-primary-dark"
            >
              {{ column }}
            </span>
          </div>
        </section>

        <section id="icons" :class="SECTION">
          <h2 class="font-serif text-h2">Icons</h2>
          <p class="max-w-content">
            <code>&lt;SpriteSymbol name="…" class="size-5" /&gt;</code> from
            <code>app/assets/symbols</code>: 24 × 24, a 2 px stroke in
            <code>currentColor</code>, square caps. The size comes from the
            class.
          </p>
          <ul class="grid grid-cols-3 gap-grid sm:grid-cols-4 md:grid-cols-6">
            <li
              v-for="name in allSymbolNames"
              :key="name"
              class="flex flex-col items-center gap-2 border border-line py-5"
            >
              <SpriteSymbol :name class="size-6" />
              <code class="text-small text-muted">{{ name }}</code>
            </li>
          </ul>
        </section>

        <section id="components" :class="SECTION">
          <h2 class="font-serif text-h2">Components</h2>

          <h3 class="text-h3">Buttons and links</h3>
          <div class="flex flex-wrap items-center gap-4">
            <a href="#" class="button">Termin vereinbaren</a>
            <a href="#" class="button is-secondary">Mitmachen</a>
            <ArrowLink to="#">Alle Meldungen</ArrowLink>
          </div>
          <div class="on-dark flex flex-wrap items-center gap-4 bg-primary p-6">
            <a href="#" class="button is-on-dark">Einsatz wählen</a>
            <a href="#" class="button is-secondary is-on-dark">Mitmachen</a>
            <a href="#" class="text-white underline">Link on red</a>
          </div>
          <p class="text-small text-muted">
            <code>.button</code>, <code>.button.is-secondary</code>,
            <code>.button.is-on-dark</code>: at least 48 px high. On dark
            grounds, <code>on-dark</code> turns the focus ring white, and
            <code>ink</code>, <code>muted</code> and <code>line</code> inside it
            become their light counterparts.
          </p>

          <h3 class="text-h3">Search field</h3>
          <div class="grid gap-grid md:grid-cols-2">
            <SearchField
              label="In «Verwaltung» suchen"
              placeholder="z. B. Pass, Steuern"
            />
            <SearchField
              large
              label="Suche"
              placeholder="z. B. Abfallkalender, Baugesuch"
            />
          </div>

          <h3 class="text-h3">Callouts</h3>
          <div lang="de" class="grid gap-grid md:grid-cols-2">
            <Callout type="info" title="Neu ab Januar">
              Der Sammelkalender 2027 liegt vor und kann als PDF bezogen werden.
            </Callout>
            <Callout type="success" title="Gesuch eingereicht">
              Sie erhalten eine Bestätigung per E-Mail.
            </Callout>
            <Callout type="warning" title="Geschlossen">
              Am 1. August bleibt der Werkhof geschlossen.
            </Callout>
            <Callout type="error">
              <strong>Strassensperrung:</strong> Die Dorfstrasse ist vom 11. bis
              13. Juni gesperrt.
            </Callout>
          </div>

          <h3 class="text-h3">Link lists</h3>
          <div lang="de" class="grid gap-grid md:grid-cols-2">
            <LinkList
              :items="[
                { label: 'Sammelkalender 2027', url: '#' },
                { label: 'Grüngutabfuhr', url: '#' },
                {
                  label: 'Traktandenliste',
                  url: '#',
                  meta: 'PDF · 120 KB',
                  download: true,
                },
              ]"
            />
            <LinkList
              :items="[
                {
                  label: 'Formular Baugesuch',
                  url: '#',
                  meta: 'PDF · 240 KB',
                  download: true,
                },
                {
                  label: 'Gebührenreglement',
                  url: '#',
                  meta: 'PDF · 310 KB',
                  download: true,
                },
              ]"
            />
          </div>

          <h3 class="text-h3">Tiles</h3>
          <p class="max-w-content">
            The square at the start of a row: a step's number, an event's date,
            a publication's icon. One size in every list.
          </p>
          <div lang="de" class="flex gap-4">
            <Tile tone="primary" class="font-serif text-h3 font-semibold">
              1
            </Tile>
            <Tile tone="light">
              <strong class="text-h3">12</strong>
              <span class="text-label uppercase">Okt</span>
            </Tile>
            <Tile tone="surface">
              <SpriteSymbol name="document" class="size-6" />
            </Tile>
          </div>

          <h3 class="text-h3">Breadcrumb and language switch</h3>
          <Breadcrumb
            :items="[
              { label: 'Startseite', url: '#' },
              { label: 'Verwaltung', url: '#' },
              { label: 'Abfall & Recycling' },
            ]"
          />
          <div class="flex flex-wrap gap-grid">
            <div class="border border-line px-4">
              <LanguageSwitch :links="languageLinks" />
            </div>
            <div class="on-dark bg-ink px-4 text-white">
              <LanguageSwitch :links="languageLinks" />
            </div>
          </div>
          <p class="text-small text-muted">
            The header, footer, cards and lists are in the mockups.
          </p>
        </section>

        <section id="charts" :class="SECTION">
          <h2 class="font-serif text-h2">Charts</h2>
          <p class="max-w-content">
            The chart block draws with blökkli's charts module, in the
            <a href="#chart-colours" class="text-primary underline"
              >chart colours</a
            >. Type, axes, legend and tooltip come from
            <code>components/Chart/transform.ts</code>.
          </p>
          <div class="grid gap-x-grid gap-y-10 md:grid-cols-2">
            <Chart
              v-for="(chart, index) in CHARTS"
              :key="index"
              :data="chart"
            />
          </div>
        </section>

        <section id="mockups" :class="SECTION">
          <h2 class="font-serif text-h2">Mockups</h2>
          <ul class="grid gap-grid md:grid-cols-2">
            <li v-for="mockup in MOCKUPS" :key="mockup.path">
              <a
                :href="`/${language}/design-system/${mockup.path}`"
                class="flex h-full flex-col gap-2 border border-line p-6 hover:border-ink"
              >
                <span class="flex items-center gap-2 font-bold text-primary">
                  {{ mockup.label }}
                  <SpriteSymbol name="arrow-right" class="size-5" />
                </span>
                <span class="text-muted">{{ mockup.description }}</span>
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, createError, useHead, useRoute } from '#imports'
import {
  ArrowLink,
  Breadcrumb,
  Callout,
  LanguageSwitch,
  LinkList,
  Logo,
  SearchField,
  SpriteSymbol,
  Tile,
} from '#components'
import { allSymbolNames } from '#nuxt-svg-icon-sprite/runtime'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'
import type { BlokkliChartData } from '#blokkli/charts/types'
import Chart from '~/components/Chart/index.vue'
import { useLanguage } from '~/composables/useLanguage'
import { CHART_COLORS } from '#shared/chartColors'
import { LANGUAGES, isLanguage } from '#shared/languages'

// The design system of the demo: the tokens from main.css and the shared
// components, next to the two mockups it's iterated on with.
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

useHead({ title: 'Design system' })

const language = useLanguage()

const SECTION = 'flex flex-col gap-6 border-t-2 border-ink pt-6'

const SECTIONS = [
  { id: 'principles', label: 'Principles' },
  { id: 'logo', label: 'Logo' },
  { id: 'colours', label: 'Colours' },
  { id: 'typography', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'icons', label: 'Icons' },
  { id: 'components', label: 'Components' },
  { id: 'charts', label: 'Charts' },
  { id: 'mockups', label: 'Mockups' },
]

// The chart colours, with each family's shades.
const chartColours = Object.entries(CHART_COLORS).map(([id, family]) => ({
  id,
  shades: Object.entries(family.shades).map(([shade, hex]) => ({
    id: shade,
    hex,
    isMain: shade === family.mainShade,
  })),
}))

// One chart of each common kind, with made-up data.
const CHARTS: BlokkliChartData[] = [
  {
    type: 'bar',
    title: 'Visitors to the lakeside pool',
    valueAxisTitle: 'Visitors',
    categories: ['May', 'June', 'July', 'August', 'September'],
    series: [
      { name: '2024', color: 'lake', data: [3120, 8940, 15210, 13870, 4010] },
      { name: '2025', color: 'ochre', data: [3480, 10230, 16940, 12650, 4390] },
    ],
    categoryColors: [],
    footnotes: [],
    numberFormat: { locale: 'de-CH' },
  },
  {
    type: 'line',
    title: 'Water use per resident',
    valueAxisTitle: 'Litres per day',
    categories: [
      '2018',
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
    ],
    series: [
      {
        name: 'Water use',
        color: 'lake',
        data: [166, 161, 172, 163, 158, 156, 151, 149],
      },
    ],
    categoryColors: [],
    footnotes: ['2020: more time at home during the pandemic.'],
  },
  {
    type: 'donut',
    title: 'The way to work',
    categories: ['Public transport', 'Car', 'Bike', 'On foot', 'Other'],
    series: [{ name: 'Share', color: 'lake', data: [34, 31, 18, 12, 5] }],
    categoryColors: ['lake', 'ochre', 'forest', 'plum', 'stone'],
    footnotes: [],
    numberFormat: { suffix: ' %' },
    typeOptions: { showLabels: true },
  },
  {
    type: 'bar',
    title: 'Turnout in 2025',
    categories: [
      'Federal vote, February',
      'Federal vote, June',
      'Municipal elections',
      'Federal vote, September',
    ],
    series: [
      { name: 'Turnout', color: 'forest', data: [52.4, 47.1, 38.6, 49.8] },
    ],
    categoryColors: [],
    footnotes: ['Share of the registered voters.'],
    numberFormat: { suffix: ' %', decimals: 1 },
    typeOptions: { horizontal: true, dataLabels: true },
  },
]

const MOCKUPS = [
  {
    path: 'home',
    label: 'Home',
    description: 'Search, today, frequent links, news, politics, events.',
  },
  {
    path: 'home-draft',
    label: 'Home (draft)',
    description: 'The home page as it will be built, simplified (15f).',
  },
  {
    path: 'detail',
    label: 'Detail',
    description: 'A service page with a sidebar, steps, a table and an FAQ.',
  },
]

// The swatches' classes are literal, so Tailwind generates them.
const COLOURS = [
  {
    label: 'Base',
    colours: [
      {
        token: 'white',
        swatch: 'bg-white',
        hex: '#FFFFFF',
        use: 'Page ground',
      },
      {
        token: 'ink',
        swatch: 'bg-ink',
        hex: '#1E1C1B',
        use: 'Text, rules, the dark ground',
      },
      {
        token: 'muted',
        swatch: 'bg-muted',
        hex: '#5C5652',
        use: 'Secondary text',
      },
      {
        token: 'line',
        swatch: 'bg-line',
        hex: '#D9D4CF',
        use: 'Borders, dividers',
      },
      {
        token: 'surface',
        swatch: 'bg-surface',
        hex: '#F5F2EE',
        use: 'Boxes, sections',
      },
    ],
  },
  {
    label: 'Brand',
    colours: [
      {
        token: 'primary',
        swatch: 'bg-primary',
        hex: '#A3212B',
        use: 'Wappenrot: actions, accents',
      },
      {
        token: 'primary-dark',
        swatch: 'bg-primary-dark',
        hex: '#7A1820',
        use: 'Hover, text on the tint',
      },
      {
        token: 'primary-light',
        swatch: 'bg-primary-light',
        hex: '#F6E7E8',
        use: 'Tint, selection',
      },
    ],
  },
  {
    label: 'Status',
    colours: [
      {
        token: 'info',
        swatch: 'bg-info',
        hex: '#1F5A8C',
        use: 'Info, focus ring',
      },
      {
        token: 'info-light',
        swatch: 'bg-info-light',
        hex: '#E6EEF6',
        use: 'Info ground, the "Lake" section',
      },
      {
        token: 'success',
        swatch: 'bg-success',
        hex: '#2C6B3F',
        use: 'Success, open',
      },
      {
        token: 'success-light',
        swatch: 'bg-success-light',
        hex: '#E5F0E8',
        use: 'Success ground',
      },
      {
        token: 'warning',
        swatch: 'bg-warning',
        hex: '#8A5A00',
        use: 'Warning',
      },
      {
        token: 'warning-light',
        swatch: 'bg-warning-light',
        hex: '#FBF1DC',
        use: 'Warning ground, site notice',
      },
      { token: 'error', swatch: 'bg-error', hex: '#8E2A5B', use: 'Error' },
      {
        token: 'error-light',
        swatch: 'bg-error-light',
        hex: '#F3E4EC',
        use: 'Error ground',
      },
    ],
  },
  {
    label: 'On the ink ground',
    colours: [
      { token: 'on-dark', swatch: 'bg-on-dark', hex: '#E8E4E0', use: 'Text' },
      {
        token: 'on-dark-muted',
        swatch: 'bg-on-dark-muted',
        hex: '#CFC9C4',
        use: 'Secondary text',
      },
      {
        token: 'on-dark-line',
        swatch: 'bg-on-dark-line',
        hex: '#4A4644',
        use: 'Rules',
      },
    ],
  },
]

const TYPE = [
  {
    token: 'text-h1',
    classes: 'font-serif text-h1',
    size: '34 → 56 px',
    details: 'Serif · 600 · 1.08',
    sample: 'Leben in Blockingen',
  },
  {
    token: 'text-h2',
    classes: 'font-serif text-h2',
    size: '26 → 32 px',
    details: 'Serif · 600 · 1.2',
    sample: 'Gemeindeversammlung',
  },
  {
    token: 'text-h3',
    classes: 'text-h3',
    size: '19 → 21 px',
    details: 'Sans · 700 · 1.3',
    sample: 'Traktanden und Unterlagen',
  },
  {
    token: 'text-lead',
    classes: 'font-serif text-lead',
    size: '19 → 22 px',
    details: 'Serif · 400 · 1.5',
    sample:
      'Die Gemeinde informiert über Vorlagen, Termine und Dienstleistungen – verständlich und auf einen Blick.',
  },
  {
    token: 'text-body',
    classes: 'text-body',
    size: '17 → 18 px',
    details: 'Sans · 400 · 1.6',
    sample:
      'Die Unterlagen zur Versammlung liegen ab zwei Wochen vor dem Termin in der Gemeindekanzlei auf und stehen hier zum Download bereit.',
  },
  {
    token: 'text-small',
    classes: 'text-small text-muted',
    size: '15 px',
    details: 'Sans · 400 · 1.5',
    sample: 'Publiziert am 14. September 2026 · Gemeindekanzlei',
  },
  {
    token: 'text-label',
    classes: 'text-label uppercase',
    size: '14 px',
    details: 'Sans · 700 · 0.08em, uppercase',
    sample: 'Gemeindeverwaltung',
  },
]

const SPACING = [
  {
    token: 'gutter',
    values: ['16 px', '32 px', '48 px'],
    use: 'The page margin: px-gutter, the containers',
  },
  {
    token: 'grid',
    values: ['16 px', '24 px', '32 px'],
    use: 'Between columns: gap-grid',
  },
  {
    token: 'section',
    values: ['40 px', '56 px', '64 px'],
    use: 'Between the sections of a page: gap-section',
  },
  {
    token: 'flow',
    values: ['32 px', '32 px', '32 px'],
    use: 'Between the blocks of a field: flow',
  },
]

const languageLinks = computed<LanguageSwitchLinkFragment[]>(() =>
  LANGUAGES.map((id) => ({
    title: id.toUpperCase(),
    language: { id },
    url: { path: `/${id}/design-system` },
  })),
)
</script>
