<script setup lang="ts">
/**
 * Minerva (mobile) user menu: the header's avatar button opens a dropdown of
 * personal links. Only "Saved" is wired (to the Saved page, same icon as the
 * desktop header); the rest are mock links.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconLogOut,
  cdxIconUserAvatar,
  cdxIconUserAvatarOutline,
  cdxIconUserContributions,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import { iconSaved } from './icons'
import SavedTip from './SavedTip.vue'
import { SAVED_PATH } from './useCollections'

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function onDocPointerDown(event: PointerEvent) {
  if (!rootRef.value?.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="pc-mobile-user-menu">
    <CdxButton
      weight="quiet"
      size="large"
      aria-label="User menu"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <CdxIcon :icon="cdxIconUserAvatarOutline" />
    </CdxButton>

    <ul v-if="open" class="pc-mobile-user-menu__panel">
      <li>
        <a href="#" class="pc-mobile-user-menu__link" @click.prevent>
          <CdxIcon :icon="cdxIconUserAvatar" />Username
        </a>
      </li>
      <li>
        <a href="#" class="pc-mobile-user-menu__link" @click.prevent>
          <CdxIcon :icon="cdxIconWatchlist" />Watchlist
        </a>
      </li>
      <li>
        <RouterLink :to="SAVED_PATH" class="pc-mobile-user-menu__link" @click="open = false">
          <CdxIcon :icon="iconSaved" />Saved
        </RouterLink>
      </li>
      <li>
        <a href="#" class="pc-mobile-user-menu__link" @click.prevent>
          <CdxIcon :icon="cdxIconUserContributions" />Contributions
        </a>
      </li>
      <li>
        <a href="#" class="pc-mobile-user-menu__link" @click.prevent>
          <CdxIcon :icon="cdxIconLogOut" />Logout
        </a>
      </li>
    </ul>

    <SavedTip />
  </div>
</template>

<style scoped>
.pc-mobile-user-menu {
  position: relative;
  display: inline-flex;
}

.pc-mobile-user-menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 60;
  box-sizing: border-box;
  min-width: 180px;
  margin: 0;
  padding: var(--spacing-25, 4px) 0;
  list-style: none;
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  text-align: start;
}

.pc-mobile-user-menu__panel li {
  margin: 0;
}

.pc-mobile-user-menu__link {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
  color: var(--color-base, #202122);
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
  text-decoration: none;
  white-space: nowrap;
}

.pc-mobile-user-menu__link:hover,
.pc-mobile-user-menu__link:focus-visible {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.pc-mobile-user-menu__link :deep(.cdx-icon) {
  color: var(--color-base, #202122);
}
</style>
