<template>
  <main class="container-wide flex flex-col gap-section py-section">
    <h1 class="font-serif text-h1">Sandboxes</h1>

    <section class="flex flex-col gap-4">
      <h2 class="font-serif text-h2">Invitations</h2>
      <p class="max-w-content">
        Each link creates one premium sandbox (21 days), without the captcha and
        the limits.
      </p>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="invite">
        <label class="flex flex-col gap-1 text-small">
          Note (optional)
          <input
            v-model="note"
            type="text"
            class="min-h-12 w-80 border-2 border-line px-3 text-body"
          />
        </label>
        <button type="submit" class="button">New invitation</button>
      </form>

      <table class="w-full border-collapse text-small">
        <thead>
          <tr>
            <th :class="th">Link</th>
            <th :class="th">Note</th>
            <th :class="th">Created</th>
            <th :class="th">Used</th>
            <th :class="th">Sandbox</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invitation in data?.invitations" :key="invitation.token">
            <td :class="td">
              <code class="break-all">{{
                invitationLink(invitation.token)
              }}</code>
            </td>
            <td :class="td">{{ invitation.note }}</td>
            <td :class="td">{{ formatTime(invitation.created) }}</td>
            <td :class="td">{{ formatTime(invitation.used) }}</td>
            <td :class="td">{{ invitation.sandbox ?? '–' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="font-serif text-h2">Access links</h2>
      <p class="max-w-content">
        Each link logs into its premium sandbox as its user, as often as needed
        and in any browser, until it's revoked or the sandbox is deleted. Anyone
        with the link can edit the sandbox. Revoking ends the link, not the
        sessions it already opened. Link previews (Slack, Teams, mail scanners)
        count as openings.
      </p>
      <p v-if="!premiumSandboxes.length" class="text-muted">
        No premium sandboxes.
      </p>
      <div
        v-for="sandbox in premiumSandboxes"
        :key="sandbox.id"
        class="flex flex-col gap-3 border-t-2 border-line pt-4"
      >
        <h3 class="text-h3">
          <a :href="sandbox.url" class="underline">{{ sandbox.id }}</a>
          <span v-if="sandbox.invitationNote" class="font-normal">
            – {{ sandbox.invitationNote }}
          </span>
        </h3>
        <p class="text-small text-muted">
          Content: {{ sandbox.source }} · expires
          {{ formatTime(sandbox.expires) }}
        </p>
        <AdminAccessLinks
          :id="sandbox.id"
          :access-links="sandbox.accessLinks"
          :users="data?.users ?? []"
          @change="refresh"
        />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="font-serif text-h2">Sandboxes</h2>
      <p class="max-w-content">
        The sandboxes this app created, newest first. Those made with drush
        (dev, E2E) aren't listed, and never expire.
      </p>
      <table class="w-full border-collapse text-small">
        <thead>
          <tr>
            <th :class="th">Id</th>
            <th :class="th">Content</th>
            <th :class="th">Premium</th>
            <th :class="th">Created</th>
            <th :class="th">Last use</th>
            <th :class="th">Expires</th>
            <th :class="th">Deleted</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sandbox in data?.sandboxes" :key="sandbox.id">
            <td :class="td">
              <a v-if="!sandbox.deleted" :href="sandbox.url" class="underline">
                {{ sandbox.id }}
              </a>
              <template v-else>{{ sandbox.id }}</template>
            </td>
            <td :class="td">{{ sandbox.source }}</td>
            <td :class="td">{{ sandbox.premium ? 'yes' : '–' }}</td>
            <td :class="td">{{ formatTime(sandbox.created) }}</td>
            <td :class="td">{{ formatTime(sandbox.lastUse) }}</td>
            <td :class="td">
              {{ sandbox.deleted ? '–' : formatTime(sandbox.expires) }}
            </td>
            <td :class="td">{{ formatTime(sandbox.deleted) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script lang="ts" setup>
// The admin page: invitations, access links and sandboxes. server/middleware/admin.ts asks
// for the password. Fetched in the browser, so that times are in its zone.
useHead({ title: 'Sandboxes', htmlAttrs: { lang: 'en' } })

const th = 'border-b-2 border-ink py-2 pr-4 text-left align-bottom'
const td = 'border-b border-line py-2 pr-4 text-left align-top'

const { data, refresh } = useFetch('/api/admin/overview', { server: false })

// The premium sandboxes that are still there: those with access links.
const premiumSandboxes = computed(
  () =>
    data.value?.sandboxes.filter(
      (sandbox) => sandbox.premium && !sandbox.deleted,
    ) ?? [],
)

const origin = useRequestURL().origin
const note = ref('')

function invitationLink(token: string): string {
  return `${origin}/?invitation=${token}`
}

async function invite() {
  await $fetch('/api/admin/invitations', {
    method: 'POST',
    body: { note: note.value },
  })
  note.value = ''
  await refresh()
}
</script>
