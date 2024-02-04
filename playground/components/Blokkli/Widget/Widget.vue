<template>
  <div class="container">
    <h2 class="text-xl font-bold mb-25">
      This block demonstrates all possible option types.
    </h2>
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Type</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>columns</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.columns) }}</td>
          </tr>
          <tr>
            <th>mobile</th>
            <td>checkbox</td>
            <td>{{ JSON.stringify(options.mobile) }}</td>
          </tr>
          <tr>
            <th>countries</th>
            <td>checkboxes</td>
            <td>{{ JSON.stringify(options.countries) }}</td>
          </tr>
          <tr>
            <th>anchorId</th>
            <td>text</td>
            <td>{{ JSON.stringify(options.anchorId) }}</td>
          </tr>
          <tr>
            <th>buttonType</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.buttonType) }}</td>
          </tr>
          <tr>
            <th>columnsGrid</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.columnsGrid) }}</td>
          </tr>
          <tr>
            <th>color</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.color) }}</td>
          </tr>
          <tr>
            <th>background</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.background) }}</td>
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
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'icons',
      options: {
        two: 'icon-blokkli-option-two',
        three: 'icon-blokkli-option-three',
        four: 'icon-blokkli-option-four',
      },
    },
    mobile: {
      type: 'checkbox',
      label: 'Mobile',
      default: true,
    },
    countries: {
      type: 'checkboxes',
      label: 'Countries',
      default: ['ch', 'de', 'at'],
      options: {
        ch: 'Switzerland',
        de: 'Germany',
        at: 'Austria',
        it: 'Italy',
        fr: 'France',
      },
    },
    anchorId: {
      type: 'text',
      label: 'Anchor ID',
      default: '',
      inputType: 'text',
    },
    buttonType: {
      type: 'radios',
      label: 'Button Type',
      default: 'primary',
      options: {
        primary: 'Primary',
        secondary: 'Secondary',
      },
    },
    columnsGrid: {
      type: 'radios',
      label: 'Columns',
      default: 'equal',
      displayAs: 'grid',
      options: {
        equal: [1, 1], // 50% / 50%
        oneTwo: [1, 2], // 33% / 66%
        twoOne: [2, 1], // 66% / 33%
        quarterOne: [3, 1], // 75% / 25%
      },
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'white',
      displayAs: 'colors',
      options: {
        normal: '#FFFFFF', // White
        primary: '#0550e6', // Blue
      },
    },
  },
  editor: {
    editTitle: (el) => el.dataset.widget,
    addBehaviour: 'no-form',
  },
})
</script>
