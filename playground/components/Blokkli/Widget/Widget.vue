<template>
  <div>This block demonstrates all possible option types.</div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

const { options, parentType } = defineBlokkli({
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
      default: '1',
    },
    countries: {
      type: 'checkboxes',
      label: 'Countries',
      default: 'ch,de,at',
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
