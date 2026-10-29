<script setup lang="ts">
/**
 * Vector 2022 user menu: avatar button → dropdown of personal links, headed by
 * the username. Only "Saved" is wired (to the Saved page); the rest are mock
 * links. Sandbox is a red link, as it is for accounts without a sandbox page.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconExpand,
  cdxIconLabFlask,
  cdxIconLogOut,
  cdxIconSandbox,
  cdxIconSettings,
  cdxIconUserAvatar,
  cdxIconUserContributions,
  cdxIconUserTalk,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import { iconSaved } from './icons'
import { SAVED_PATH } from './useCollections'

defineProps<{
  username: string
  /** Show the ▾ next to the avatar, as Vector does in both headers. */
  caret?: boolean
}>()

const MOCK_LINKS = [
  { label: 'Talk', icon: cdxIconUserTalk },
  { label: 'Sandbox', icon: cdxIconSandbox, red: true },
] as const

const MORE_LINKS = [
  { label: 'Preferences', icon: cdxIconSettings },
  { label: 'Beta', icon: cdxIconLabFlask },
  { label: 'Watchlist', icon: cdxIconWatchlist },
  { label: 'Contributions', icon: cdxIconUserContributions },
  { label: 'Log out', icon: cdxIconLogOut },
] as const

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
  <div ref="rootRef" class="pc-user-menu">
    <CdxButton
      class="pc-user-menu__trigger"
      weight="quiet"
      aria-label="User menu"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <CdxIcon :icon="cdxIconUserAvatar" />
      <CdxIcon v-if="caret" :icon="cdxIconExpand" size="x-small" />
    </CdxButton>

    <ul v-if="open" class="pc-user-menu__panel">
      <li>
        <a href="#" class="pc-user-menu__link" @click.prevent>
          <CdxIcon :icon="cdxIconUserAvatar" />{{ username }}
        </a>
      </li>
      <li v-for="link in MOCK_LINKS" :key="link.label">
        <a
          href="#"
          class="pc-user-menu__link"
          :class="{ 'pc-user-menu__link--red': 'red' in link }"
          @click.prevent
        >
          <CdxIcon :icon="link.icon" />{{ link.label }}
        </a>
      </li>
      <li>
        <RouterLink :to="SAVED_PATH" class="pc-user-menu__link" @click="open = false">
          <CdxIcon :icon="iconSaved" />Saved
        </RouterLink>
      </li>
      <li v-for="link in MORE_LINKS" :key="link.label">
        <a href="#" class="pc-user-menu__link" @click.prevent>
          <CdxIcon :icon="link.icon" />{{ link.label }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pc-user-menu {
  position: relative;
}

.pc-user-menu__trigger.cdx-button {
  gap: 2px;
  color: var(--color-base, #202122);
}

.pc-user-menu__panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  min-width: 200px;
  margin: 0;
  padding: var(--spacing-50, 8px) 0;
  list-style: none;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  text-align: start;
}

.pc-user-menu__panel li {
  margin: 0;
}

.pc-user-menu__link {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
  text-decoration: none;
  white-space: nowrap;
}

.pc-user-menu__link:hover {
  text-decoration: underline;
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.pc-user-menu__link :deep(.cdx-icon) {
  color: var(--color-base, #202122);
}

.pc-user-menu__link--red {
  color: var(--color-link-red, #bf3c2c);
}
</style>
