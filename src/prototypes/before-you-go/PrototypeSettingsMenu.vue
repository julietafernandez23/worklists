<script setup lang="ts">
/**
 * Header hamburger — opens Before you go prototype settings in a Codex dialog.
 */
import { computed, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

import { globalSkin } from '@/theme'

import PrototypeSettingsPanel from './PrototypeSettingsPanel.vue'

const dialogOpen = ref(false)
const isMobile = computed(() => globalSkin.value === 'mobile')
</script>

<template>
  <div class="prototype-chrome-menu-popover">
    <CdxButton
      class="chrome-header__menu-btn"
      :size="isMobile ? 'large' : undefined"
      weight="quiet"
      aria-label="Prototype settings"
      :aria-expanded="dialogOpen"
      aria-haspopup="dialog"
      @click="dialogOpen = true"
    >
      <CdxIcon :icon="cdxIconMenu" />
    </CdxButton>
  </div>

  <PrototypeSettingsPanel v-model:open="dialogOpen" />
</template>

<style scoped>
.prototype-chrome-menu-popover {
  display: contents;
}
</style>