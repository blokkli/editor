<template>
  <div class="container">
    <h2
      class="text-xl font-bold mb-25"
      :style="{
        color: options.textColor,
      }"
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
            <td>{{ JSON.stringify(options.showAllOptions) }}</td>
          </tr>
          <tr>
            <th>columns</th>
            <td>radios</td>
            <td>{{ JSON.stringify(options.columns) }}</td>
          </tr>
          <tr>
            <th>range</th>
            <td>range</td>
            <td>{{ JSON.stringify(options.range) }}</td>
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
  chunkName: 'rare',
  options: {
    showAllOptions: {
      type: 'checkbox',
      label: 'Show all options',
      default: true,
    },
    textColor: {
      type: 'color',
      label: 'Text color',
      default: '#ffffff',
    },
    range: {
      type: 'range',
      label: 'Number',
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    paddingTop: {
      type: 'range',
      label: 'Top',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingBottom: {
      type: 'range',
      label: 'Bottom',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingLeft: {
      type: 'range',
      label: 'Left',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    paddingRight: {
      type: 'range',
      label: 'Right',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: 'Padding',
    },
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'icons',
      options: {
        two: { icon: 'icon-blokkli-option-two', label: 'Two' },
        three: { icon: 'icon-blokkli-option-three', label: 'Three' },
        four: { icon: 'icon-blokkli-option-four', label: 'Four' },
      },
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
        equal: { columns: [1, 1], label: '50% / 50%' },
        oneTwo: { columns: [1, 2], label: '33% / 66%' },
        twoOne: { columns: [2, 1], label: '66% / 33%' },
        quarterOne: { columns: [3, 1], label: '75% / 25%' },
      },
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'normal',
      displayAs: 'colors',
      options: {
        normal: { hex: '#FFFFFF', label: 'White' },
        primary: { hex: '#0550e6', label: 'Blue' },
      },
    },
  },
  editor: {
    editTitle: (el) => el.dataset.widget,
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
        ]
      }
      return ['showAllOptions']
    },
  },
})
</script>
