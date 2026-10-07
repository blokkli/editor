<template>
  <div>
    <div class="band container-wide flex flex-col items-start gap-6 py-section">
      <h1 class="font-serif text-h1">{{ texts.title }}</h1>
      <p class="max-w-content text-lead">{{ texts.intro }}</p>
      <SiteLink v-if="links.start" :to="links.start" class="button">
        {{ texts.start }}
      </SiteLink>
      <p class="max-w-content">{{ texts.startText }}</p>
    </div>

    <div class="container-wide flex flex-col gap-heading py-section">
      <section aria-labelledby="tasks" class="flex flex-col gap-6">
        <h2 id="tasks" class="font-serif text-h2">{{ texts.tasksTitle }}</h2>
        <div class="grid gap-grid md:grid-cols-2 lg:grid-cols-3">
          <WelcomeTask
            v-for="task in tasks"
            :key="task.id"
            v-bind="task"
            :link-label="texts.openEditor"
          />
        </div>
      </section>

      <section aria-labelledby="more" class="flex max-w-content flex-col gap-6">
        <h2 id="more" class="font-serif text-h2">{{ texts.moreTitle }}</h2>
        <ul class="flex flex-col gap-5">
          <li
            v-for="item in more"
            :key="item.id"
            class="flex flex-col items-start gap-1"
          >
            <p>{{ item.text }}</p>
            <ArrowLink v-if="item.url" :to="item.url">
              {{ texts.openEditor }}
            </ArrowLink>
          </li>
        </ul>
      </section>

      <WelcomeSandbox />

      <section
        aria-labelledby="developers"
        class="flex max-w-content flex-col gap-6"
      >
        <h2 id="developers" class="font-serif text-h2">
          {{ texts.developersTitle }}
        </h2>
        <p>{{ texts.developersText }}</p>
        <ul class="flex flex-col gap-2">
          <li v-for="link in developerLinks" :key="link.url">
            <ArrowLink :to="link.url">{{ link.label }}</ArrowLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { WelcomeQuery } from '#graphql-operations'
import type { WelcomeTask as Task } from '~/utils/welcomeTexts'

// Where the control app sends a new sandbox's visitor: what to try, each with
// a link into the editor of the page where it works. About blökkli, not the
// town, so the texts are in the code. Drupal doesn't know the path, so the
// header has no language switch here. The paths are shared/utils/welcome.ts's.
definePageMeta({
  name: 'welcome',
  path: '/welcome',
  languageMapping: { de: '/willkommen', fr: '/bienvenue' },
  layout: 'drupal',
})

const language = useLanguage()
const texts = computed(() => WELCOME_TEXTS[language.value])

useHead(() => ({
  title: texts.value.title,
  meta: [{ name: 'robots', content: 'noindex' }],
}))

const { data } = await useAsyncGraphqlQuery('welcome')

// The comment thread on "Applying for a building permit"
// (content/comments.yml: counter-question).
const COMMENT_UUID = '46178dd3-f386-5345-b6d5-062c9b8ac679'

// The language the content was written in. The editor opens a translation in
// translation mode, where nothing can be added: the tasks open the original,
// except the one about the French.
const source = computed(() => {
  const pool = data.value?.data.lakesidePool
  return pool && 'uuid' in pool
    ? pool.translations?.find(
        (translation) =>
          translation &&
          'defaultLangcode' in translation &&
          translation.defaultLangcode,
      )?.langcode
    : undefined
})

/**
 * The editor of a page in a language, or null if the visitor can't see it.
 */
function editorUrl(
  target: WelcomeQuery['lakesidePool'],
  langcode = source.value,
  query: Record<string, string> = {},
): string | null {
  if (!target || !('uuid' in target)) {
    return null
  }
  const translation = target.translations?.find(
    (item) => item?.langcode === langcode,
  )
  const path =
    translation && 'url' in translation ? translation.url?.path : null
  if (!path) {
    return null
  }
  const params = new URLSearchParams({ blokkliEditing: target.uuid, ...query })
  return `${path}?${params}`
}

const links = computed(() => {
  const targets = data.value?.data
  return {
    start: editorUrl(targets?.lakesidePool),
    analyze: editorUrl(targets?.lakesidePool),
    // With French as the original, there's no outdated French.
    translate:
      source.value === 'fr' ? null : editorUrl(targets?.poolOpening, 'fr'),
    review: editorUrl(targets?.buildingPermits, source.value, {
      blokkliComment: COMMENT_UUID,
    }),
    schedule: editorUrl(targets?.poolOpening),
    reuse: editorUrl(targets?.sorting),
    agent: editorUrl(targets?.fees),
    chart: editorUrl(targets?.inNumbers),
    footer: editorUrl(targets?.footer),
  }
})

const hasAgent = computed(
  () => !!data.value?.data.paragraphsBlokkliAvailableFeatures?.agent,
)

type TaskCard = {
  id: Task
  title: string
  text: string
  label?: string
  url?: string
}

// The tasks whose page the visitor can open. The agent's is a teaser where
// it isn't available: outside premium sandboxes.
const tasks = computed(() => {
  const ids: Task[] = [
    'analyze',
    'translate',
    'review',
    'schedule',
    'reuse',
    'agent',
  ]
  return ids.flatMap((id): TaskCard[] => {
    if (id === 'agent' && !hasAgent.value) {
      return [{ id, ...texts.value.premium }]
    }
    const url = links.value[id]
    return url ? [{ id, ...texts.value.tasks[id], url }] : []
  })
})

const more = computed(() => [
  { id: 'chart', text: texts.value.more.chart, url: links.value.chart },
  { id: 'footer', text: texts.value.more.footer, url: links.value.footer },
  { id: 'roles', text: texts.value.more.roles, url: null },
])

const developerLinks = computed(() => [
  { label: texts.value.links.docs, url: 'https://blokk.li' },
  { label: texts.value.links.code, url: 'https://github.com/blokkli/editor' },
  {
    label: texts.value.links.module,
    url: 'https://www.drupal.org/project/paragraphs_blokkli',
  },
  {
    label: texts.value.links.skills,
    url: 'https://github.com/blokkli/editor/tree/main/skills',
  },
])
</script>
