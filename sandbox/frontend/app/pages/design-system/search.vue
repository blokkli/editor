<template>
  <DesignSystemMockup>
    <div class="flex flex-col gap-10 pb-section">
      <header
        class="band container-content flex flex-col gap-4 py-8 lg:pt-10 lg:pb-12"
      >
        <Breadcrumb
          class="mb-2"
          :items="[{ label: 'Startseite', url: '#' }, { label: 'Suche' }]"
        />
        <h1 class="font-serif text-h1 text-balance">Suche</h1>
        <SearchField label="Die Website durchsuchen" large text="Bau" />
      </header>

      <div class="container-content flex flex-col gap-6">
        <p class="font-semibold">14 Ergebnisse für «Bau»</p>
        <ul class="border-t border-ink">
          <li v-for="item in RESULTS" :key="item.title">
            <a
              href="#"
              class="group flex items-center gap-4 border-b border-line py-4 text-ink"
            >
              <span class="flex grow flex-col gap-0.5">
                <span class="text-label text-muted uppercase">
                  {{ item.type }}
                </span>
                <span
                  class="font-semibold group-hover:text-primary group-hover:underline"
                >
                  {{ item.title }}
                </span>
                <span class="line-clamp-2 text-small text-muted">
                  {{ item.text }}
                </span>
              </span>
              <SpriteSymbol
                name="arrow-right"
                class="size-5 shrink-0 text-primary"
              />
            </a>
          </li>
        </ul>
        <Pagination :page="1" :pages="2" :to="() => '#'" />
      </div>
    </div>
  </DesignSystemMockup>
</template>

<script lang="ts" setup>
// A mockup of the search page's results: the type above each title, then the
// date or the lead.
useHead({ title: 'Suche – Mockup' })

const RESULTS = [
  {
    type: 'Seite',
    title: 'Baubewilligungen',
    text: 'Wann es eine Bewilligung braucht und wie Sie sie beantragen.',
  },
  {
    type: 'Amtliche Publikation',
    title: 'Anbau Wintergarten, Rebweg 12',
    text: 'Baugesuch, bis 26. Oktober 2026',
  },
  {
    type: 'Amt',
    title: 'Bauverwaltung',
    text: 'Baugesuche, Bewilligungen und die Beratung vor dem Bauen.',
  },
  {
    type: 'News',
    title: 'Der neue Dorfplatz ist eröffnet',
    text: '26. September 2026',
  },
  {
    type: 'Veranstaltung',
    title: 'Informationsabend zum Dorfplatz',
    text: '8. Oktober 2026, 19:30–21:00',
  },
  {
    type: 'Seite',
    title: 'Gebühren',
    text: 'Was Bewilligungen, die Abfuhr und das Wasser kosten.',
  },
]
</script>
