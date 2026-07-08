<template>
  <div class="container">
    <h2
      class="text-xl font-bold mb-25"
      :style="{
        color: options.textColor,
      }"
      :data-test-text-color="options.textColor"
    >
      This block demonstrates all possible option types.
    </h2>
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Type</th>
            <th class="w-full">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>showAllOptions</th>
            <td>checkbox</td>
            <td data-test="widget-option-showAllOptions">
              {{ JSON.stringify(options.showAllOptions) }}
            </td>
          </tr>
          <tr>
            <th>columns</th>
            <td>radios</td>
            <td data-test="widget-option-columns">
              {{ JSON.stringify(options.columns) }}
            </td>
          </tr>
          <tr>
            <th>rows</th>
            <td>number</td>
            <td data-test="widget-option-rows">
              {{ JSON.stringify(options.rows) }}
            </td>
          </tr>
          <tr>
            <th>range</th>
            <td>range</td>
            <td data-test="widget-option-range">
              {{ JSON.stringify(options.range) }}
            </td>
          </tr>
          <tr>
            <th>countries</th>
            <td>checkboxes</td>
            <td data-test="widget-option-countries">
              {{ JSON.stringify(options.countries) }}
            </td>
          </tr>
          <tr>
            <th>anchorId</th>
            <td>text</td>
            <td data-test="widget-option-anchorId">
              {{ JSON.stringify(options.anchorId) }}
            </td>
          </tr>
          <tr>
            <th>buttonType</th>
            <td>radios</td>
            <td data-test="widget-option-buttonType">
              {{ JSON.stringify(options.buttonType) }}
            </td>
          </tr>
          <tr>
            <th>columnsGrid</th>
            <td>radios</td>
            <td data-test="widget-option-columnsGrid">
              {{ JSON.stringify(options.columnsGrid) }}
            </td>
          </tr>
          <tr>
            <th>color</th>
            <td>radios</td>
            <td data-test="widget-option-color">
              {{ JSON.stringify(options.color) }}
            </td>
          </tr>
          <tr>
            <th>background</th>
            <td>radios</td>
            <td data-test="widget-option-background">
              {{ JSON.stringify(options.background) }}
            </td>
          </tr>
          <tr>
            <th>dateTimeLocal</th>
            <td>datetime-local</td>
            <td data-test="widget-option-dateTimeLocal">
              {{ JSON.stringify(options.dateTimeLocal) }}
            </td>
          </tr>
          <tr>
            <th>textColor</th>
            <td>color</td>
            <td data-test="widget-option-textColor">
              {{ JSON.stringify(options.textColor) }}
            </td>
          </tr>
          <tr>
            <th>paddingTop</th>
            <td>range</td>
            <td data-test="widget-option-paddingTop">
              {{ JSON.stringify(options.paddingTop) }}
            </td>
          </tr>
          <tr>
            <th>paddingBottom</th>
            <td>range</td>
            <td data-test="widget-option-paddingBottom">
              {{ JSON.stringify(options.paddingBottom) }}
            </td>
          </tr>
          <tr>
            <th>paddingLeft</th>
            <td>range</td>
            <td data-test="widget-option-paddingLeft">
              {{ JSON.stringify(options.paddingLeft) }}
            </td>
          </tr>
          <tr>
            <th>paddingRight</th>
            <td>range</td>
            <td data-test="widget-option-paddingRight">
              {{ JSON.stringify(options.paddingRight) }}
            </td>
          </tr>
          <tr>
            <th>nestedCheckbox</th>
            <td>checkbox</td>
            <td data-test="widget-option-nestedCheckbox">
              {{ JSON.stringify(options.nestedCheckbox) }}
            </td>
          </tr>
          <tr>
            <th>radiosWithLabelDescription</th>
            <td>radios</td>
            <td data-test="widget-option-radiosWithLabelDescription">
              {{ JSON.stringify(options.radiosWithLabelDescription) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

const { options } = defineBlokkli({
  bundle: 'widget',
  globalOptions: ['background', 'bkVisibleLanguages'],
  chunkName: 'rare',
  renderFor: {
    providerType: 'contentPage',
  },
  options: {
    showAllOptions: {
      type: 'checkbox',
      label: {
        en: 'Show all options',
        de: 'Alle Optionen anzeigen',
        fr: 'Afficher toutes les options',
        it: 'Mostra tutte le opzioni',
        gsw_CH: 'Alli Optione azeige',
      },
      description: {
        en: 'When selected, all other options are shown',
        de: 'Wenn ausgewählt werden alle anderen Optionen angezeigt',
        fr: 'Lorsque cette option est activée, toutes les autres options sont affichées',
        it: 'Se selezionato, vengono mostrate tutte le altre opzioni',
        gsw_CH: 'Wenn aktiviert, wärde alli andere Optione azeigt',
      },
      default: true,
    },
    textColor: {
      type: 'color',
      label: {
        en: 'Text color',
        de: 'Textfarbe',
        fr: 'Couleur du texte',
        it: 'Colore del testo',
        gsw_CH: 'Textfarb',
      },
      default: '#ffffff',
    },
    range: {
      type: 'range',
      label: {
        en: 'Range',
        de: 'Bereich',
        fr: 'Plage',
        it: 'Intervallo',
        gsw_CH: 'Bereich',
      },
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    dateTimeLocal: {
      type: 'datetime-local',
      label: {
        en: 'Datetime Local',
        de: 'Datum und Zeit',
        fr: 'Date et heure',
        it: 'Data e ora',
        gsw_CH: 'Datum und Ziit',
      },
    },
    rows: {
      type: 'number',
      label: {
        en: 'Number',
        de: 'Zahl',
        fr: 'Nombre',
        it: 'Numero',
        gsw_CH: 'Zahl',
      },
      default: 0,
      min: 0,
      max: 8,
    },
    paddingTop: {
      type: 'range',
      label: {
        en: 'Top',
        de: 'Oben',
        fr: 'Haut',
        it: 'Alto',
        gsw_CH: 'Obe',
      },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingBottom: {
      type: 'range',
      label: {
        en: 'Bottom',
        de: 'Unten',
        fr: 'Bas',
        it: 'Basso',
        gsw_CH: 'Une',
      },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingLeft: {
      type: 'range',
      label: {
        en: 'Left',
        de: 'Links',
        fr: 'Gauche',
        it: 'Sinistra',
        gsw_CH: 'Links',
      },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingRight: {
      type: 'range',
      label: {
        en: 'Right',
        de: 'Rechts',
        fr: 'Droite',
        it: 'Destra',
        gsw_CH: 'Rächts',
      },
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    columns: {
      type: 'radios',
      label: {
        en: 'Columns',
        de: 'Spalten',
        fr: 'Colonnes',
        it: 'Colonne',
        gsw_CH: 'Spalte',
      },
      default: 'two',
      displayAs: 'icons',
      group: 'Radios',
      options: {
        two: {
          icon: 'icon-blokkli-option-two',
          label: {
            en: 'Two',
            de: 'Zwei',
            fr: 'Deux',
            it: 'Due',
            gsw_CH: 'Zwöi',
          },
        },
        three: {
          icon: 'icon-blokkli-option-three',
          label: {
            en: 'Three',
            de: 'Drei',
            fr: 'Trois',
            it: 'Tre',
            gsw_CH: 'Drü',
          },
        },
        four: {
          icon: 'icon-blokkli-option-four',
          label: {
            en: 'Four',
            de: 'Vier',
            fr: 'Quatre',
            it: 'Quattro',
            gsw_CH: 'Vier',
          },
        },
      },
    },

    countries: {
      type: 'checkboxes',
      label: {
        en: 'Countries',
        de: 'Länder',
        fr: 'Pays',
        it: 'Paesi',
        gsw_CH: 'Länder',
      },
      default: ['ch', 'de', 'at'],
      options: {
        ch: {
          en: 'Switzerland',
          de: 'Schweiz',
          fr: 'Suisse',
          it: 'Svizzera',
          gsw_CH: 'Schwiiz',
        },
        de: {
          en: 'Germany',
          de: 'Deutschland',
          fr: 'Allemagne',
          it: 'Germania',
          gsw_CH: 'Dütschland',
        },
        at: {
          en: 'Austria',
          de: 'Österreich',
          fr: 'Autriche',
          it: 'Austria',
          gsw_CH: 'Ööschtriich',
        },
        it: {
          en: 'Italy',
          de: 'Italien',
          fr: 'Italie',
          it: 'Italia',
          gsw_CH: 'Italie',
        },
        fr: {
          en: 'France',
          de: 'Frankreich',
          fr: 'France',
          it: 'Francia',
          gsw_CH: 'Frankriich',
        },
      },
    },
    anchorId: {
      type: 'text',
      label: {
        en: 'Anchor ID',
        de: 'Anker-ID',
        fr: "ID d'ancre",
        it: 'ID àncora',
        gsw_CH: 'Anker-ID',
      },
      placeholder: {
        en: 'contact-us',
        de: 'kontakt',
      },
      description: {
        de: 'Die ID für den Anker',
      },
      default: '',
      inputType: 'text',
    },
    buttonType: {
      type: 'radios',
      group: 'Radios',
      label: {
        en: 'Button Type',
        de: 'Schaltflächentyp',
        fr: 'Type de bouton',
        it: 'Tipo di pulsante',
        gsw_CH: 'Chnopf-Typ',
      },
      default: 'primary',
      options: {
        primary: {
          label: {
            en: 'Primary',
            de: 'Primär',
            fr: 'Principal',
            it: 'Primario',
            gsw_CH: 'Primär',
          },
        },
        secondary: {
          label: {
            en: 'Secondary',
            de: 'Sekundär',
            fr: 'Secondaire',
            it: 'Secondario',
            gsw_CH: 'Sekundär',
          },
        },
      },
    },
    radiosWithLabelDescription: {
      type: 'radios',
      label: {
        en: 'With double description',
        de: 'Mit doppelter Beschreibung',
        fr: 'Avec double description',
        it: 'Con doppia descrizione',
        gsw_CH: 'Mit dopplete Beschriibig',
      },
      description: {
        en: 'This is the option description.',
        de: 'Dies ist die Beschreibung der Option.',
        fr: "Ceci est la description de l'option.",
        it: "Questa è la descrizione dell'opzione.",
        gsw_CH: 'Das isch d Beschriibig vo dr Option.',
      },
      default: 'one',
      options: {
        one: {
          label: { en: 'One', de: 'Eins', fr: 'Un', it: 'Uno', gsw_CH: 'Eis' },
          description: {
            en: 'The description for the first option option.',
            de: 'Die Beschreibung für die erste Optionsoption.',
            fr: 'La description de la première option.',
            it: 'La descrizione della prima opzione.',
            gsw_CH: 'D Beschriibig für di erschti Option.',
          },
        },
        two: {
          label: {
            en: 'Two',
            de: 'Zwei',
            fr: 'Deux',
            it: 'Due',
            gsw_CH: 'Zwöi',
          },
          description: {
            en: 'The description for the second option option.',
            de: 'Die Beschreibung für die zweite Optionsoption.',
            fr: 'La description de la deuxième option.',
            it: 'La descrizione della seconda opzione.',
            gsw_CH: 'D Beschriibig für di zwöiti Option.',
          },
        },
      },
    },
    columnsGrid: {
      type: 'radios',
      group: 'Radios',
      label: {
        en: 'Columns',
        de: 'Spalten',
        fr: 'Colonnes',
        it: 'Colonne',
        gsw_CH: 'Spalte',
      },
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
      label: {
        en: 'Color',
        de: 'Farbe',
        fr: 'Couleur',
        it: 'Colore',
        gsw_CH: 'Farb',
      },
      default: 'normal',
      displayAs: 'colors',
      options: {
        normal: {
          hex: '#FFFFFF',
          label: {
            en: 'White',
            de: 'Weiss',
            fr: 'Blanc',
            it: 'Bianco',
            gsw_CH: 'Wiiss',
          },
        },
        primary: {
          hex: '#0550e6',
          label: {
            en: 'Blue',
            de: 'Blau',
            fr: 'Bleu',
            it: 'Blu',
            gsw_CH: 'Blau',
          },
        },
      },
    },
    nestedCheckbox: {
      type: 'checkbox',
      label: {
        en: 'Nested Checkbox',
        de: 'Verschachtelte Checkbox',
        fr: 'Case à cocher imbriquée',
        it: 'Casella di controllo annidata',
        gsw_CH: 'Verschachtleti Checkbox',
      },
      default: true,
      group: 'Radios',
    },
  },
  editor: {
    editTitle: (el) => el.dataset.widget,
    icon: 'bk_mdi_widgets',
    addBehaviour: 'no-form',
    determineVisibleOptions: (ctx) => {
      if (ctx.options.showAllOptions) {
        return [
          'showAllOptions',
          'color',
          'columns',
          'anchorId',
          'countries',
          'background',
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
      }
      return ['showAllOptions']
    },
  },
})

export type Props = object
</script>
