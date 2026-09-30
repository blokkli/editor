<template>
  <div class="grid gap-x-grid gap-y-8 md:grid-cols-12">
    <div class="flex flex-col gap-2 md:col-span-12">
      <p class="text-label text-primary uppercase">
        {{ $texts('fee_calculator.rates', 'Rates') }} {{ RATES.year }}
      </p>
      <h1 class="font-serif text-h2">
        {{ $texts('fee_calculator.title', 'Fee calculator') }}
      </h1>
      <p>
        {{
          $texts(
            'fee_calculator.intro',
            'Estimate the yearly fees of your household for water, sewage and waste.',
          )
        }}
      </p>
    </div>

    <form class="flex flex-col gap-6 md:col-span-5" @submit.prevent>
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-small font-semibold">
          {{ $texts('fee_calculator.dwelling', 'Dwelling') }}
        </legend>
        <label
          v-for="option in dwellings"
          :key="option.value"
          class="flex items-center gap-3"
        >
          <input
            v-model="dwelling"
            type="radio"
            :value="option.value"
            class="size-5 accent-primary"
          />
          {{ option.label }}
        </label>
      </fieldset>

      <div class="flex flex-col gap-2">
        <label :for="`${id}-persons`" class="text-small font-semibold">
          {{ $texts('fee_calculator.persons', 'People in the household') }}
        </label>
        <input
          :id="`${id}-persons`"
          v-model.number="persons"
          type="number"
          min="1"
          max="12"
          :aria-describedby="`${id}-persons-hint`"
          class="h-12 w-24 border-2 border-ink bg-white px-4"
        />
        <p :id="`${id}-persons-hint`" class="text-small text-muted">
          {{
            $texts(
              'fee_calculator.persons_hint',
              'Used to estimate the water use.',
            )
          }}
        </p>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-small font-semibold">
          {{ $texts('fee_calculator.bag_size', 'Waste bags') }}
        </legend>
        <div class="flex gap-6">
          <label
            v-for="size in BAG_SIZES"
            :key="size"
            class="flex items-center gap-3"
          >
            <input
              v-model="bagSize"
              type="radio"
              :value="size"
              class="size-5 accent-primary"
            />
            {{ size }} l
          </label>
        </div>
      </fieldset>

      <div class="flex flex-col gap-2">
        <label :for="`${id}-bags`" class="text-small font-semibold">
          {{ $texts('fee_calculator.bags_per_week', 'Bags per week') }}
        </label>
        <input
          :id="`${id}-bags`"
          v-model.number="bagsPerWeek"
          type="number"
          min="0"
          max="10"
          class="h-12 w-24 border-2 border-ink bg-white px-4"
        />
      </div>

      <label class="flex items-center gap-3">
        <input
          v-model="greenBin"
          type="checkbox"
          class="size-5 accent-primary"
        />
        {{ $texts('fee_calculator.green_bin', 'Green waste bin (140 l)') }}
      </label>
    </form>

    <section
      class="flex flex-col gap-4 md:col-span-7"
      :aria-labelledby="`${id}-fees`"
    >
      <h2 :id="`${id}-fees`" class="font-serif text-h3">
        {{ $texts('fee_calculator.fees', 'Your fees per year') }}
      </h2>
      <table class="w-full border-t-2 border-ink">
        <tbody
          v-for="group in groups"
          :key="group.label"
          class="border-b border-line"
        >
          <tr>
            <th
              colspan="2"
              scope="rowgroup"
              class="pt-4 pb-1 text-left text-label uppercase"
            >
              {{ group.label }}
            </th>
          </tr>
          <tr v-for="line in group.lines" :key="line.label">
            <td class="pr-4 pb-2">
              {{ line.label }}
              <span v-if="line.detail" class="block text-small text-muted">
                {{ line.detail }}
              </span>
            </td>
            <td class="pb-2 text-right align-top tabular-nums">
              {{ money.format(line.amount) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" class="pt-4 text-left">
              {{ $texts('fee_calculator.total', 'Total per year') }}
            </th>
            <td class="pt-4 text-right font-semibold tabular-nums">
              <output>{{ money.format(total) }}</output>
            </td>
          </tr>
          <tr>
            <th scope="row" class="text-left font-normal text-muted">
              {{ $texts('fee_calculator.per_month', 'Per month') }}
            </th>
            <td class="text-right text-muted tabular-nums">
              {{ money.format(total / 12) }}
            </td>
          </tr>
        </tfoot>
      </table>
      <p class="text-small text-muted">
        {{
          $texts(
            'fee_calculator.note',
            'An estimate, VAT included. The bill follows your water meter.',
          )
        }}
      </p>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useEasyTexts, useId } from '#imports'
import { useLanguage } from '~/composables/useLanguage'
import { RATES, WATER_PER_PERSON, type BagSize, type Dwelling } from './rates'

// The town's fee calculator: an app of its own, embedded in pages with the
// embed paragraph type (pages/embed/fee-calculator.vue).
const { $texts } = useEasyTexts()
const language = useLanguage()
const id = useId()

const BAG_SIZES: BagSize[] = [17, 35, 60]

type FeeLine = { label: string; detail?: string; amount: number }

const dwelling = ref<Dwelling>('apartment')
const persons = ref(2)
const bagSize = ref<BagSize>(35)
const bagsPerWeek = ref(1)
const greenBin = ref(false)

const dwellings = computed<{ value: Dwelling; label: string }[]>(() => [
  {
    value: 'apartment',
    label: $texts('fee_calculator.apartment', 'Apartment'),
  },
  { value: 'house', label: $texts('fee_calculator.house', 'House') },
])

// An emptied number input is an empty string.
function clamp(value: number | string, min: number, max: number): number {
  const number = Number(value)
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, Math.round(number)))
    : min
}

const money = computed(
  () =>
    new Intl.NumberFormat(`${language.value}-CH`, {
      style: 'currency',
      currency: 'CHF',
    }),
)

const cubicMetres = computed(
  () => clamp(persons.value, 1, 12) * WATER_PER_PERSON,
)

const groups = computed<{ label: string; lines: FeeLine[] }[]>(() => {
  const baseFee = $texts('fee_calculator.base_fee', 'Base fee')
  const consumption = $texts('fee_calculator.consumption', 'Consumption')
  const bags = clamp(bagsPerWeek.value, 0, 10) * 52
  const bagPrice = RATES.waste.bags[bagSize.value]

  return [
    {
      label: $texts('fee_calculator.water', 'Water'),
      lines: [
        { label: baseFee, amount: RATES.water.base[dwelling.value] },
        {
          label: consumption,
          detail: `${cubicMetres.value} m³ × ${money.value.format(RATES.water.perCubicMetre)}`,
          amount: cubicMetres.value * RATES.water.perCubicMetre,
        },
      ],
    },
    {
      label: $texts('fee_calculator.sewage', 'Sewage'),
      lines: [
        { label: baseFee, amount: RATES.sewage.base[dwelling.value] },
        {
          label: consumption,
          detail: `${cubicMetres.value} m³ × ${money.value.format(RATES.sewage.perCubicMetre)}`,
          amount: cubicMetres.value * RATES.sewage.perCubicMetre,
        },
      ],
    },
    {
      label: $texts('fee_calculator.waste', 'Waste'),
      lines: [
        { label: baseFee, amount: RATES.waste.base },
        {
          label: $texts('fee_calculator.bags', 'Bags'),
          detail: `${bags} × ${bagSize.value} l × ${money.value.format(bagPrice)}`,
          amount: bags * bagPrice,
        },
        ...(greenBin.value
          ? [
              {
                label: $texts(
                  'fee_calculator.green_bin',
                  'Green waste bin (140 l)',
                ),
                amount: RATES.waste.greenBin,
              },
            ]
          : []),
      ],
    },
  ]
})

const total = computed(() =>
  groups.value
    .flatMap((group) => group.lines)
    .reduce((sum, line) => sum + line.amount, 0),
)
</script>
