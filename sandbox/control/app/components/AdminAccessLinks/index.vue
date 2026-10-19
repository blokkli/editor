<template>
  <div class="flex flex-col gap-3">
    <table v-if="accessLinks.length" class="w-full border-collapse text-small">
      <thead>
        <tr>
          <th :class="th">Link</th>
          <th :class="th">User</th>
          <th :class="th">Note</th>
          <th :class="th">Created</th>
          <th :class="th">Opened</th>
          <th :class="th">Last opened</th>
          <th :class="th"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="link in accessLinks"
          :key="link.token"
          :class="link.revoked ? 'text-muted' : ''"
        >
          <td :class="td">
            <code class="break-all">{{ accessLink(link.token) }}</code>
          </td>
          <td :class="td">{{ link.user }}</td>
          <td :class="td">{{ link.note }}</td>
          <td :class="td">{{ formatTime(link.created) }}</td>
          <td :class="td">{{ link.uses }}</td>
          <td :class="td">{{ formatTime(link.lastUse) }}</td>
          <td :class="td">
            <span v-if="link.revoked">
              Revoked {{ formatTime(link.revoked) }}
            </span>
            <span v-else class="flex gap-3">
              <button type="button" class="underline" @click="copy(link.token)">
                {{ copied === link.token ? 'Copied' : 'Copy' }}
              </button>
              <button
                type="button"
                class="text-error underline"
                @click="revoke(link.token)"
              >
                Revoke
              </button>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="create">
      <label class="flex flex-col gap-1 text-small">
        User
        <select
          v-model="user"
          class="min-h-12 border-2 border-line bg-white px-3 text-body"
        >
          <option
            v-for="option in users"
            :key="option.name"
            :value="option.name"
          >
            {{ option.name }} ({{ option.label }})
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-small">
        Note (optional)
        <input
          v-model="note"
          type="text"
          class="min-h-12 w-80 border-2 border-line px-3 text-body"
        />
      </label>
      <button type="submit" class="button">New access link</button>
    </form>
  </div>
</template>

<script lang="ts" setup>
// A premium sandbox's access links on the admin page: each logs into the
// sandbox as its user, as often as needed, until it's revoked.
const props = defineProps<{
  id: string
  accessLinks: {
    token: string
    user: string
    note: string
    created: number
    revoked: number | null
    lastUse: number | null
    uses: number
  }[]
  users: readonly { name: string; label: string }[]
}>()

const emit = defineEmits<{
  change: []
}>()

const th = 'border-b-2 border-ink py-2 pr-4 text-left align-bottom'
const td = 'border-b border-line py-2 pr-4 text-left align-top'

const origin = useRequestURL().origin
const user = ref(props.users[0]?.name ?? '')
const note = ref('')
const copied = ref('')

function accessLink(token: string): string {
  return `${origin}/access/${token}`
}

async function copy(token: string) {
  await navigator.clipboard.writeText(accessLink(token))
  copied.value = token
}

async function create() {
  await $fetch('/api/admin/access-links', {
    method: 'POST',
    body: { sandbox: props.id, user: user.value, note: note.value },
  })
  note.value = ''
  emit('change')
}

async function revoke(token: string) {
  await $fetch('/api/admin/access-links/revoke', {
    method: 'POST',
    body: { token },
  })
  emit('change')
}
</script>
