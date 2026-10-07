<template>
  <DesignSystemMockup section="Aktuelles">
    <div class="flex flex-col gap-10 pb-section">
      <header
        class="band container-content flex flex-col gap-4 py-8 lg:pt-10 lg:pb-12"
      >
        <Breadcrumb
          class="mb-2"
          :items="[
            { label: 'Startseite', url: '#' },
            { label: 'Aktuelles', url: '#' },
            { label: 'Veranstaltungen' },
          ]"
        />
        <h1 class="font-serif text-h1 text-balance">Veranstaltungen</h1>
        <p class="font-serif text-lead">
          Was in Blockingen los ist: Märkte, Konzerte, Sport und Versammlungen.
        </p>
      </header>

      <div class="container-content flex flex-col gap-6">
        <FilterChips label="Filter" :items="chips" />
        <ul class="border-t border-ink">
          <li v-for="item in EVENTS" :key="item.title">
            <a
              href="#"
              class="group flex items-center gap-4 border-b border-line py-4 text-ink"
            >
              <Tile tone="light">
                <strong class="text-h3">{{ item.day }}</strong>
                <span class="text-label uppercase">{{ item.month }}</span>
              </Tile>
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
          </li>
        </ul>
        <Pagination :page="2" :pages="5" :to="() => '#'" />
      </div>
    </div>
  </DesignSystemMockup>
</template>

<script lang="ts" setup>
// A mockup of an overview page: the upcoming events, filtered by category,
// with pages (15h).
useHead({ title: 'Veranstaltungen – Mockup' })

const chips = ['Alle', 'Kultur', 'Sport', 'Familie', 'Markt', 'Politik'].map(
  (label) => ({ label, to: '#', active: label === 'Sport' }),
)

const EVENTS = [
  {
    day: '11',
    month: 'Okt',
    title: 'Seeuferlauf',
    meta: '11. Oktober 2026, 10:00–13:00, Strandbad',
  },
  {
    day: '18',
    month: 'Okt',
    title: 'Schnuppertraining Unihockey',
    meta: '18. Oktober 2026, 14:00–16:00, Turnhalle',
  },
  {
    day: '25',
    month: 'Okt',
    title: 'Herbstturnier des Tennisclubs',
    meta: '25.–26. Oktober 2026, Tennisanlage Seewiese',
  },
  {
    day: '8',
    month: 'Nov',
    title: 'Hallenbad: Familienschwimmen',
    meta: '8. November 2026, 9:00–12:00',
  },
  {
    day: '15',
    month: 'Nov',
    title: 'Velotour ins Nachbardorf',
    meta: '15. November 2026, 9:30, Treffpunkt Dorfplatz',
  },
  {
    day: '29',
    month: 'Nov',
    title: 'Adventslauf',
    meta: '29. November 2026, 17:00, Dorfplatz',
  },
]
</script>
