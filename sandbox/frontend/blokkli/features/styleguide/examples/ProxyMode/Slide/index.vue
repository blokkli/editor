<template>
  <div class="bk-styleguide-slide" :class="'bk-is-' + bundle">
    <template v-if="bundle === 'title'">
      <span class="bk-styleguide-slide-kicker">{{ text }}</span>
      <h2>{{ title }}</h2>
    </template>
    <div v-else-if="bundle === 'teaser'" class="bk-styleguide-slide-card">
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
      <span class="bk-styleguide-slide-link">Read more</span>
    </div>
    <figure v-else>
      <div
        class="bk-styleguide-slide-picture"
        :class="`bk-is-tone-${(tone ?? 0) % 4}`"
      />
      <figcaption>{{ title }}</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
import type { DemoSlide } from '../types'

defineProps<DemoSlide>()
</script>

<style lang="postcss">
/*
 * A mock of what the site renders for the shown block, with the sandbox's own
 * design tokens.
 */
.bk-styleguide-slide {
  min-height: 260px;
  font-family: var(--font-sans, 'Source Sans 3', sans-serif);
  color: var(--color-ink, #1e1c1b);

  h2,
  h3 {
    margin: 0;
    font-family: var(--font-serif, 'Source Serif 4', Georgia, serif);
    font-weight: 600;
  }

  &.bk-is-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px;
    text-align: center;
    background: var(--color-ink, #1e1c1b);
    color: var(--color-on-dark, #e8e4e0);

    h2 {
      font-size: 40px;
      line-height: 1.1;
    }
  }

  &.bk-is-teaser {
    display: flex;
    align-items: center;
    padding: 30px;
    background: var(--color-surface, #f5f2ee);
  }

  &.bk-is-image {
    min-height: 0;

    figure {
      margin: 0;
    }

    figcaption {
      padding-top: 8px;
      font-size: 14px;
      color: var(--color-muted, #5c5652);
    }
  }
}

.bk-styleguide-slide-kicker {
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-on-dark-muted, #cfc9c4);
}

.bk-styleguide-slide-card {
  display: grid;
  gap: 8px;
  max-width: 340px;
  padding: 24px;
  background: var(--color-white, #ffffff);
  border: 1px solid var(--color-line, #d9d4cf);

  h3 {
    font-size: 22px;
    line-height: 1.25;
  }

  p {
    margin: 0;
    line-height: 1.5;
    color: var(--color-muted, #5c5652);
  }
}

.bk-styleguide-slide-link {
  font-weight: 600;
  color: var(--color-primary, #a3212b);
}

.bk-styleguide-slide-picture {
  height: 260px;

  &.bk-is-tone-0 {
    background: linear-gradient(160deg, #a7c4d8, #4f7f9f 55%, #2c4f68);
  }

  &.bk-is-tone-1 {
    background: linear-gradient(160deg, #cfd9b8, #8aa36d 55%, #4d6b45);
  }

  &.bk-is-tone-2 {
    background: linear-gradient(160deg, #ecc9a0, #b9767f 55%, #4f4a6e);
  }

  &.bk-is-tone-3 {
    background: linear-gradient(160deg, #c7e0e4, #6fa9b6 55%, #33707f);
  }
}
</style>
