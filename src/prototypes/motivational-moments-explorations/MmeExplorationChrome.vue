<script setup lang="ts">
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MmeChromeMenu from './MmeChromeMenu.vue'
import type { MmeExplorationId } from './explorations'

defineProps<{
  activeExplorationId: MmeExplorationId
}>()
</script>

<template>
  <ChromeWrapper skin="mobile">
    <template #menu>
      <MmeChromeMenu :active-exploration-id="activeExplorationId" />
    </template>
    <slot />
  </ChromeWrapper>
</template>
