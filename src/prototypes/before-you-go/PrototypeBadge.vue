<script setup lang="ts">
/**
 * Optional floating “Prototype” chip (bottom-left). Same settings dialog as the header menu.
 */
import { ref } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLabFlask } from '@wikimedia/codex-icons'

import PrototypeSettingsPanel from './PrototypeSettingsPanel.vue'

const dialogOpen = ref(false)
</script>

<template>
  <div class="pc-proto">
    <button
      type="button"
      class="pc-proto__badge"
      :aria-expanded="dialogOpen"
      aria-haspopup="dialog"
      @click="dialogOpen = true"
    >
      <CdxIcon :icon="cdxIconLabFlask" size="small" />
      Prototype
    </button>

    <PrototypeSettingsPanel v-model:open="dialogOpen" />
  </div>
</template>

<style scoped>
.pc-proto {
  position: fixed;
  bottom: var(--spacing-100, 16px);
  left: var(--spacing-100, 16px);
  z-index: 45;
}

.pc-proto__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding: var(--spacing-25, 4px) var(--spacing-75, 12px);
  border: 1px solid var(--border-color-warning, #ab7f2a);
  border-radius: 999px;
  background-color: var(--background-color-warning-subtle, #fef6e7);
  box-shadow: var(--box-shadow-small, 0 1px 2px rgba(0, 0, 0, 0.1));
  color: var(--color-base, #202122);
  font: inherit;
  font-size: var(--font-size-x-small, 12px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-x-small, 1.5);
  cursor: pointer;
}

.pc-proto__badge:hover {
  background-color: var(--background-color-warning-subtle--hover, #fdf2d5);
}

.pc-proto__badge :deep(.cdx-icon) {
  color: currentColor;
}
</style>