<template>
  <div :class="[spacing, { 'container-content': hasContainer }]">
    <div class="flex flex-col gap-4 bg-ink p-6 text-on-dark">
      <h2
        v-blokkli-editable:field_title
        class="text-h2"
        :style="{ color: options.textColor }"
        :data-test-text-color="options.textColor"
      >
        {{ title }}
      </h2>
      <p data-test="widget-lead">{{ lead }}</p>
      <a v-if="link?.uri" :href="link.uri.path" class="underline">
        <span v-blokkli-editable="{ name: 'field_link.title' }">{{
          link.title
        }}</span>
      </a>
      <table class="text-small">
        <tbody>
          <tr v-for="(value, key) in options" :key="key">
            <th class="pr-4 text-left">{{ key }}</th>
            <td :data-test="`widget-option-${key}`">
              {{ JSON.stringify(value) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphWidgetFragment } from '#graphql-operations'

// For the E2E tests, like the mock playground's widget: an option of every
// type, each value in a cell of its own, and the field combinations the demo
// has no use for. No field of the site allows it; a test module allows it on
// detail pages in E2E sandboxes.
//
// The title is bound to an element. The text isn't, on purpose: it's only
// mapped through `propsFieldMapping`. The link's title is addressed by its
// property path; the dotted name can't go through the directive's `:arg`
// shorthand (Vue reads `field_link.title` as an arg with a modifier).
defineProps<ParagraphWidgetFragment>()

const block = defineBlokkli({
  bundle: 'widget',
  globalOptions: ['bkVisibleLanguages'],
  propsFieldMapping: {
    title: { type: 'editable', name: 'field_title' },
    lead: { type: 'editable', name: 'field_lead' },
    link: { type: 'editable', name: 'field_link.title' },
  },
  options: {
    showAllOptions: {
      type: 'checkbox',
      label: {
        en: 'Show all options',
        de: 'Alle Optionen anzeigen',
        fr: 'Afficher toutes les options',
      },
      description: {
        en: 'When selected, all other options are shown',
        de: 'Wenn ausgewählt, werden alle anderen Optionen angezeigt',
        fr: 'Lorsque cette option est activée, toutes les autres options sont affichées',
      },
      default: true,
    },
    textColor: {
      type: 'color',
      label: { en: 'Text colour', de: 'Textfarbe', fr: 'Couleur du texte' },
      default: '#ffffff',
    },
    range: {
      type: 'range',
      label: { en: 'Range', de: 'Bereich', fr: 'Plage' },
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    dateTimeLocal: {
      type: 'datetime-local',
      label: { en: 'Date and time', de: 'Datum und Zeit', fr: 'Date et heure' },
    },
    rows: {
      type: 'number',
      label: { en: 'Number', de: 'Zahl', fr: 'Nombre' },
      default: 0,
      min: 0,
      max: 8,
    },
    paddingTop: {
      type: 'range',
      label: { en: 'Top', de: 'Oben', fr: 'Haut' },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingBottom: {
      type: 'range',
      label: { en: 'Bottom', de: 'Unten', fr: 'Bas' },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingLeft: {
      type: 'range',
      label: { en: 'Left', de: 'Links', fr: 'Gauche' },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingRight: {
      type: 'range',
      label: { en: 'Right', de: 'Rechts', fr: 'Droite' },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    columns: {
      type: 'radios',
      label: { en: 'Columns', de: 'Spalten', fr: 'Colonnes' },
      default: 'two',
      displayAs: 'icons',
      group: 'Radios',
      options: {
        two: {
          icon: 'bk_mdi_looks_two',
          label: { en: 'Two', de: 'Zwei', fr: 'Deux' },
        },
        three: {
          icon: 'bk_mdi_looks_3',
          label: { en: 'Three', de: 'Drei', fr: 'Trois' },
        },
        four: {
          icon: 'bk_mdi_looks_4',
          label: { en: 'Four', de: 'Vier', fr: 'Quatre' },
        },
      },
    },
    countries: {
      type: 'checkboxes',
      label: { en: 'Countries', de: 'Länder', fr: 'Pays' },
      default: ['ch', 'de', 'at'],
      options: {
        ch: { en: 'Switzerland', de: 'Schweiz', fr: 'Suisse' },
        de: { en: 'Germany', de: 'Deutschland', fr: 'Allemagne' },
        at: { en: 'Austria', de: 'Österreich', fr: 'Autriche' },
        it: { en: 'Italy', de: 'Italien', fr: 'Italie' },
        fr: { en: 'France', de: 'Frankreich', fr: 'France' },
      },
    },
    anchorId: {
      type: 'text',
      label: { en: 'Anchor ID', de: 'Anker-ID', fr: "ID d'ancre" },
      placeholder: { en: 'contact-us', de: 'kontakt', fr: 'contact' },
      description: {
        en: 'The ID of the anchor',
        de: 'Die ID des Ankers',
        fr: "L'ID de l'ancre",
      },
      default: '',
      inputType: 'text',
    },
    buttonType: {
      type: 'radios',
      group: 'Radios',
      label: {
        en: 'Button type',
        de: 'Schaltflächentyp',
        fr: 'Type de bouton',
      },
      default: 'primary',
      options: {
        primary: { label: { en: 'Primary', de: 'Primär', fr: 'Principal' } },
        secondary: {
          label: { en: 'Secondary', de: 'Sekundär', fr: 'Secondaire' },
        },
      },
    },
    radiosWithLabelDescription: {
      type: 'radios',
      label: {
        en: 'With double description',
        de: 'Mit doppelter Beschreibung',
        fr: 'Avec double description',
      },
      description: {
        en: 'This is the option description.',
        de: 'Dies ist die Beschreibung der Option.',
        fr: "Ceci est la description de l'option.",
      },
      default: 'one',
      options: {
        one: {
          label: { en: 'One', de: 'Eins', fr: 'Un' },
          description: {
            en: 'The description of the first choice.',
            de: 'Die Beschreibung der ersten Auswahl.',
            fr: 'La description du premier choix.',
          },
        },
        two: {
          label: { en: 'Two', de: 'Zwei', fr: 'Deux' },
          description: {
            en: 'The description of the second choice.',
            de: 'Die Beschreibung der zweiten Auswahl.',
            fr: 'La description du deuxième choix.',
          },
        },
      },
    },
    columnsGrid: {
      type: 'radios',
      group: 'Radios',
      label: { en: 'Columns', de: 'Spalten', fr: 'Colonnes' },
      default: 'equal',
      displayAs: 'grid',
      options: {
        equal: { columns: [1, 1], label: '50% / 50%' },
        oneTwo: { columns: [1, 2], label: '33% / 66%' },
        twoOne: { columns: [2, 1], label: '66% / 33%' },
        quarterOne: { columns: [3, 1], label: '75% / 25%' },
      },
    },
    color: {
      type: 'radios',
      group: 'Radios',
      label: { en: 'Colour', de: 'Farbe', fr: 'Couleur' },
      default: 'normal',
      displayAs: 'colors',
      options: {
        normal: {
          hex: '#FFFFFF',
          label: { en: 'White', de: 'Weiss', fr: 'Blanc' },
        },
        primary: {
          hex: '#0550e6',
          label: { en: 'Blue', de: 'Blau', fr: 'Bleu' },
        },
      },
    },
    nestedCheckbox: {
      type: 'checkbox',
      label: {
        en: 'Nested checkbox',
        de: 'Verschachtelte Checkbox',
        fr: 'Case à cocher imbriquée',
      },
      default: true,
      group: 'Radios',
    },
  },
  editor: {
    icon: 'bk_mdi_widgets',
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('h2')?.textContent,
    determineVisibleOptions: (ctx) =>
      ctx.options.showAllOptions
        ? [
            'showAllOptions',
            'color',
            'columns',
            'anchorId',
            'countries',
            'columnsGrid',
            'buttonType',
            'textColor',
            'range',
            'paddingTop',
            'paddingLeft',
            'paddingRight',
            'paddingBottom',
            'rows',
            'nestedCheckbox',
            'dateTimeLocal',
            'radiosWithLabelDescription',
          ]
        : ['showAllOptions'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
