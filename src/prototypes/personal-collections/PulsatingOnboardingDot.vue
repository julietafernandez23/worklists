<script setup lang="ts">
/** Progressive core + pulsing halo — parent controls when it shows. */
defineProps<{ visible: boolean }>()
</script>

<template>
  <span v-if="visible" class="pc-onboarding-dot" aria-hidden="true">
    <span class="pc-onboarding-dot__pulse" />
    <span class="pc-onboarding-dot__core" />
  </span>
</template>

<style scoped>
.pc-onboarding-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 1.625rem;
  height: 1.625rem;
  /* Anchor at trigger corner; sit on the gear edge, not over it */
  transform: translate(42%, -42%);
  pointer-events: none;
}

.pc-onboarding-dot__core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.6875rem;
  height: 0.6875rem;
  border-radius: 50%;
  background-color: var(--color-progressive, #36c);
  transform: translate(-50%, -50%);
}

.pc-onboarding-dot__pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: var(--color-progressive, #36c);
  opacity: 0.35;
  animation: pc-onboarding-dot-pulse 1.6s ease-out infinite;
}

@keyframes pc-onboarding-dot-pulse {
  0% {
    transform: scale(0.45);
    opacity: 0.55;
  }

  70%,
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pc-onboarding-dot__pulse {
    animation: none;
    opacity: 0.35;
    transform: scale(0.85);
  }
}
</style>
