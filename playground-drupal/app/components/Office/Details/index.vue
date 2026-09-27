<template>
  <dl class="flex flex-col gap-4">
    <div v-if="address && !compact">
      <dt class="text-small font-semibold text-muted">
        {{ $texts('office.address', 'Address') }}
      </dt>
      <dd class="whitespace-pre-line">{{ address }}</dd>
    </div>
    <div v-if="phone">
      <dt class="text-small font-semibold text-muted">
        {{ $texts('office.phone', 'Phone') }}
      </dt>
      <dd>
        <a :href="'tel:' + phone.replace(/[^+\d]/g, '')" class="underline">
          {{ phone }}
        </a>
      </dd>
    </div>
    <div v-if="email">
      <dt class="text-small font-semibold text-muted">
        {{ $texts('office.email', 'Email') }}
      </dt>
      <dd>
        <a :href="'mailto:' + email" class="underline">{{ email }}</a>
      </dd>
    </div>
    <div v-if="hours?.length && !compact">
      <dt class="text-small font-semibold text-muted">
        {{ $texts('office.opening_hours', 'Opening hours') }}
      </dt>
      <dd>
        <OfficeHours :hours />
      </dd>
    </div>
  </dl>
</template>

<script lang="ts" setup>
import type { OfficeDetailsFragment } from '#graphql-operations'
import OfficeHours from '~/components/Office/Hours/index.vue'

// Callers spread an office into it: its other fields (e.g. title) aren't
// attributes of the list.
defineOptions({ inheritAttrs: false })

defineProps<
  OfficeDetailsFragment & {
    /** Only the phone and the email. */
    compact?: boolean
  }
>()
</script>
