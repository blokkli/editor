<template>
  <PluginSidebar
    id="analyze"
    :title="$t('analyzeSidebarTitle', 'Analyze')"
    :tour-text="$t('analyzeTourText', 'Analyze the content of your page')"
    icon="bk_mdi_speed"
    weight="10"
    :is-loading="isRunning"
    render-always
  >
    <template #icon>
      <AnalyzeIcon :is-running />
    </template>
    <template #default="{ isShown }">
      <div v-if="ui.isProxyMode.value" class="bk-sidebar-padding bk">
        <InfoBox
          :text="
            $t(
              'analyzeNotAvailableInStructureView',
              'Analyze is not available in structure view.',
            )
          "
          icon="bk_mdi_account_tree"
        />
      </div>
      <AnalyzerMain
        v-else-if="!ui.isTransforming.value"
        :key="animation.renderKey.value"
        v-model="isRunning"
        v-model:issue-count="issueCount"
        v-model:has-violation="hasViolation"
        :langcode="context.language"
        :analyze
        :is-shown
      />
    </template>
    <template v-if="issueCount" #badge>
      <div
        class="bk-sidebar-badge"
        :class="hasViolation ? 'bk-is-red' : 'bk-is-yellow'"
      >
        {{ issueCount }}
      </div>
    </template>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { InfoBox } from '#blokkli/editor/components'
import AnalyzerMain from './Main.vue'
import AnalyzeIcon from './Icon.vue'

defineBlokkliFeature({
  id: 'analyze',
  label: 'Analyze',
  icon: 'bk_mdi_speed',
  requiredAdapterMethods: ['getAnalyzers'],
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

const { $t, context, animation, ui, analyze } = useBlokkli()

const isRunning = ref(false)
const issueCount = ref(0)
const hasViolation = ref(false)
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>

<style lang="postcss">
.bk.bk-analyze {
  @apply select-text;
  .bk-analyze-button {
    @apply p-20 grid gap-10;
    button {
      @apply w-full;
    }

    .bk-message-info {
      @apply text-sm font-medium;
    }
  }
  .bk-analyze-last-run {
    @apply uppercase text-xs font-semibold text-mono-600 bg-mono-100 p-10 rounded border border-mono-300 tabular-nums;
  }

  .bk-analyze-form {
    @apply p-20 border-t border-t-mono-300;
  }

  .bk-analyze-statuses {
    @apply grid gap-5;
  }

  .bk-analyze-status-item {
    @apply flex justify-between items-center text-sm;

    .bk-analyze-status-title {
      @apply font-medium text-mono-950;
    }

    .bk-analyze-status-label {
      @apply text-xs font-semibold uppercase text-lime-dark bg-lime-light px-5 py-3 rounded;

      &.bk-is-stale {
        @apply text-orange-dark bg-orange-light;
      }
    }
  }

  .bk-analyze-progress {
    label {
      @apply block font-semibold mb-10;
    }
    .bk-analyze-progress-bar {
      @apply overflow-hidden rounded;
    }
    progress {
      @apply appearance-none w-full block;

      &::-webkit-progress-bar {
        @apply bg-mono-100;
      }
      &::-webkit-progress-value {
        @apply bg-accent-600;
      }
    }
  }

  .bk-analyze-wrapper {
    @apply relative;
    &.bk-is-loading {
      @apply opacity-30;
    }
  }

  .bk-analyze-summary {
    @apply p-20 pt-0;
  }
  .bk-analyze-summary-chart {
    @apply flex items-center gap-20;

    > ul {
      @apply flex-1 flex flex-col gap-[7px];
      > li {
        @apply flex items-center gap-[0.5em] leading-none;
        > div:first-child {
          @apply size-[0.75em] shrink-0 rounded-full;
        }

        > div:last-child {
          @apply font-semibold flex justify-between flex-1;
        }
      }
    }

    svg {
      text {
        @apply font-bold text-lime-normal;
      }
    }
  }

  .bk-analyze-results-item-tags {
    @apply flex flex-wrap gap-5 mb-10;
    .bk-pill {
      @apply text-xs ml-0 whitespace-nowrap;
    }
  }

  .bk-analyze-status {
    &.bk-is-pass {
      @apply bg-lime-normal text-white;
    }

    &.bk-is-incomplete {
      @apply bg-yellow-normal text-yellow-dark;
    }

    &.bk-is-violation {
      @apply bg-red-normal text-white;
    }
  }

  .bk-analyze-results {
    @apply border-b border-b-mono-300 first:border-t first:border-t-mono-300;
    > summary {
      @apply font-bold flex w-full cursor-pointer justify-between items-center hover:bg-mono-100;
      @apply py-18 px-20;

      > div {
        @apply flex gap-3;
      }

      svg {
        @apply size-15;
      }
    }

    &:open {
      > summary {
        @apply !bg-transparent;
        svg {
          @apply rotate-180;
        }
      }
    }

    > ul {
      @apply px-20;

      &.bk-is-always-open {
        @apply pt-20;
      }
    }
  }
  .bk-analyze-results-item-help {
    @apply ml-auto;
    > a {
      @apply flex text-sm gap-3 font-semibold leading-none items-center  underline-offset-4;
      @apply text-mono-400 hover:text-accent-600;
      @apply hover:underline;

      span {
        @apply opacity-0;
      }

      svg {
        @apply size-18 fill-current;
      }
    }
  }

  .bk-analyze-results-item {
    @apply py-20 border-b border-b-mono-300 first:pt-0 last:border-b-0;
    > h3 {
      @apply font-semibold text-base;
    }

    > p {
      @apply text-sm text-mono-600 mt-5;
    }

    &:hover {
      .bk-analyze-results-item-help {
        span {
          @apply opacity-100;
        }
      }
    }
  }

  .bk-analyze-results-item-nodes {
    @apply bg-mono-100 rounded mt-10 overflow-hidden;

    &:open {
      > summary {
        @apply !bg-transparent text-mono-950;
        svg {
          @apply rotate-180;
        }
      }
    }

    > summary {
      @apply text-sm font-semibold p-10 cursor-pointer appearance-none list-none flex justify-between items-center;
      @apply text-mono-600;
      @apply hover:bg-mono-200 hover:text-mono-950;

      &::marker,
      &::-webkit-details-marker {
        @apply hidden;
      }

      svg {
        @apply size-15 fill-current;
      }
    }

    > div > ul {
      > li {
        > p {
          @apply text-xs text-mono-700 px-10 mb-3;
          &.bk-is-single {
            @apply pt-10;
          }
        }
        > ul {
          > li {
            @apply text-xs;
          }
        }
      }
    }
  }

  .bk-analyze-results-item-nodes-list {
    > ul + ul {
      @apply border-t border-t-mono-300 pt-10;
    }
  }

  .bk-analyze-results-item-nodes-target {
    @apply relative;
    span {
      @apply overflow-ellipsis overflow-hidden whitespace-nowrap w-full inline-block font-mono;
    }

    button {
      @apply w-full min-w-0 text-mono-600 flex items-center gap-5 hover:underline underline-offset-[3px] py-[7px] px-10;
      @apply hover:text-accent-700;
      @apply scroll-mt-50;

      &:hover svg {
        @apply fill-accent-700;
      }
      &:hover .bk-icon {
        @apply bg-mono-200;
      }
      svg {
        @apply size-[13px] fill-mono-500;
      }

      .bk-icon {
        @apply size-20 flex items-center justify-center rounded-full shrink-0;
      }
    }

    &.bk-is-focused {
      button {
        @apply bg-accent-600 text-accent-50;
        .bk-icon {
          @apply bg-white;
          svg {
            @apply fill-accent-700;
          }
        }
      }
    }
  }
}

.bk.bk-analyze-overlay {
  @apply absolute top-0 left-0 size-full;

  > div {
    @apply absolute bg-red-normal;
  }
}

.bk.bk-analyze-tooltip {
  @apply fixed top-0 left-0 z-analyze-tooltip cursor-pointer;
  @apply flex items-center gap-5 px-8 h-25 -mt-25;
  @apply bg-mono-950 text-white text-xs font-semibold whitespace-nowrap;
  @apply shadow-lg;
  @apply hover:bg-mono-950/90;

  .bk-icon {
    @apply absolute top-full left-0 size-25 flex items-center justify-center;
  }

  svg {
    @apply size-15 fill-current;
  }

  &.bk-is-violation {
    @apply bg-red-light text-red-normal;
    .bk-icon {
      @apply bg-red-normal hover:bg-red-dark text-white;
    }
  }

  &.bk-is-incomplete {
    @apply bg-yellow-light text-yellow-dark;

    .bk-icon {
      @apply bg-yellow-normal hover:bg-yellow-dark text-yellow-dark hover:text-yellow-light;
    }
  }

  .bk-analyze-tooltip-score {
    @apply opacity-70;
  }
}

.bk-is-analyzing {
  .bk,
  .bk-sidebar {
    @apply !hidden;
  }
}
</style>
