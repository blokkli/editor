<template>
  <main class="container-wide flex flex-col gap-section py-section">
    <h1 class="font-serif text-h1">Sandboxes</h1>

    <section class="flex flex-col gap-4">
      <h2 class="font-serif text-h2">Invitations</h2>
      <p class="max-w-content">
        Each link creates one premium sandbox (7 days), without the captcha and
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
import { ref, useFetch, useHead, useRequestURL } from '#imports'

// The admin page: invitations and sandboxes. server/middleware/admin.ts asks
// for the password. Fetched in the browser, so that times are in its zone.
useHead({ title: 'Sandboxes', htmlAttrs: { lang: 'en' } })

const th = 'border-b-2 border-ink py-2 pr-4 text-left align-bottom'
const td = 'border-b border-line py-2 pr-4 text-left align-top'

const { data, refresh } = useFetch('/api/admin/overview', { server: false })

const origin = useRequestURL().origin
const note = ref('')

function invitationLink(token: string): string {
  return `${origin}/?invitation=${token}`
}

function formatTime(time: number | null): string {
  return time
    ? new Date(time * 1000).toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '–'
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
