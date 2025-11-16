<template>
  <svg
    ref="svgElement"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <mask id="needleMask">
        <rect width="24" height="24" fill="white" />
        <path
          d="M12 1C12 1 15 11 15 13C15 14.6569 13.6569 16 12 16C10.3432 16 9 14.6568 9 13C9 11.0005 11.9984 1.00521 12 1Z"
          fill="black"
          stroke="black"
          stroke-width="3"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            keyTimes="0; 0.5; 1"
            values="-100 12 13; 100 12 13; -100 12 13"
            dur="2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          />
        </path>
      </mask>
    </defs>

    <path
      d="M18.293 19.4316C19.9626 17.7978 21 15.5206 21 13C21 8.02944 16.9706 4 12 4C7.02944 4 3 8.02944 3 13C3 15.522 4.03862 17.8005 5.70996 19.4346"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      mask="url(#needleMask)"
    />
    <path
      d="M12 1C12 1 15 11 15 13C15 14.6569 13.6569 16 12 16C10.3432 16 9 14.6568 9 13C9 11.0005 11.9984 1.00521 12 1Z"
      fill="currentColor"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        keyTimes="0; 0.5; 1"
        values="-100 12 13; 100 12 13; -100 12 13"
        dur="2s"
        repeatCount="indefinite"
        calcMode="spline"
        keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
      />
    </path>
  </svg>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from '#imports'

const props = defineProps<{
  isRunning: boolean
}>()

const svgElement = useTemplateRef('svgElement')

watch(
  () => props.isRunning,
  (isRunning) => {
    if (!svgElement.value) {
      return
    }

    if (isRunning) {
      svgElement.value.unpauseAnimations()
    } else {
      svgElement.value.pauseAnimations()
    }
  },
)
</script>
