<script setup lang="ts">
/**
 * ChromeWrapper with the saved-items (bookmark list) icon added to the header
 * tools, plus a floating layer anchored top-right under the header for the
 * save popover (`#panel`) and transient confirmations.
 */
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxMessage } from '@wikimedia/codex'
import {
  cdxIconAppearance,
  cdxIconBell,
  cdxIconTray,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import type { HeaderItem } from '@/components/header/headerItems'
import { useConfig } from '@/composables/useConfig'
import { iconSaved } from './icons'
import MobileUserMenu from './MobileUserMenu.vue'
import SavedTip from './SavedTip.vue'
import UserMenu from './UserMenu.vue'
import { SAVED_PATH, useCollections } from './useCollections'
import { STICKY_HEADER_HEIGHT, stickyHeader } from './useStickyHeader'
import { useToast } from './useToast'
import { globalSkin } from '@/theme'

defineProps<{ lastEditedNotice?: boolean }>()

const route = useRoute()
const router = useRouter()

/**
 * This prototype is always shown logged in. ProtoWiki keeps the logged-in /
 * logged-out choice per website, so another prototype on the same site (e.g.
 * on github.io) can leave it logged out — switch it back when we load.
 */
const { user } = useConfig()
if (user.value === 'logged-out') user.value = 'new'
const { resetDemo } = useCollections()
const { state: toast, dismiss } = useToast()

/** Phones (Minerva): confirmations sit bottom-centre instead of top-right. */
const isMobile = computed(() => globalSkin.value === 'mobile')

/** Minerva header's right side: Minerva's defaults, with the avatar opening our user menu. */
const MOBILE_HEADER_RIGHT: HeaderItem[] = [
  { type: 'button', icon: 'search', label: 'Search' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'component', component: markRaw(MobileUserMenu) },
]

/**
 * The popover/toast layer sits just under the header at the top of the page,
 * stays in view once the header scrolls away (for in-article saves), and drops
 * below the article sticky header while that is showing.
 */
const HEADER_OFFSET = 62
const scrollY = ref(0)
function onScroll() {
  scrollY.value = window.scrollY
}
const floatTop = computed(() =>
  Math.max(HEADER_OFFSET - scrollY.value, stickyHeader.visible ? STICKY_HEADER_HEIGHT + 8 : 16),
)
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

/**
 * Hidden `?reset` on any page → start from scratch (nothing saved, no
 * collections, first-save onboarding), then tidy the URL.
 */
watch(
  () => route.query.reset,
  (value) => {
    if (value === undefined) return
    resetDemo(false)
    const query = { ...route.query }
    delete query.reset
    void router.replace({ query })
  },
  { immediate: true },
)
</script>

<template>
  <div class="saved-chrome">
    <ChromeWrapper :last-edited-notice="lastEditedNotice">
      <template #header>
        <ChromeHeader username="Username" :right="MOBILE_HEADER_RIGHT">
          <template #nav>
            <CdxButton weight="quiet" aria-label="Appearance">
              <CdxIcon :icon="cdxIconAppearance" />
            </CdxButton>
            <CdxButton weight="quiet" aria-label="Notifications">
              <CdxIcon :icon="cdxIconBell" />
            </CdxButton>
            <CdxButton weight="quiet" aria-label="Notices">
              <CdxIcon :icon="cdxIconTray" />
            </CdxButton>
            <!-- Desktop's first-save tip points here, at the Saved page link. -->
            <span class="saved-chrome__saved">
              <RouterLink
                class="saved-chrome__icon-link"
                :to="SAVED_PATH"
                aria-label="Saved items"
                title="Saved items"
              >
                <CdxIcon :icon="iconSaved" />
              </RouterLink>
              <SavedTip :caret="20" />
            </span>
            <CdxButton weight="quiet" aria-label="Watchlist">
              <CdxIcon :icon="cdxIconWatchlist" />
            </CdxButton>
            <UserMenu username="Username" caret />
          </template>
        </ChromeHeader>
      </template>

      <slot />
    </ChromeWrapper>

    <div class="saved-chrome__float" :style="{ top: `${floatTop}px` }">
      <slot name="panel" />

      <!-- On phones the message is moved out to the bottom of the screen. -->
      <Teleport to="body" :disabled="!isMobile">
        <Transition name="saved-chrome-fade">
          <CdxMessage
            v-if="toast.current"
            :key="toast.current.id"
            class="saved-chrome__toast"
            :class="{ 'saved-chrome__toast--mobile': isMobile }"
            :type="toast.current.type"
            role="status"
          >
            {{ toast.current.text }}
            <RouterLink
              v-if="toast.current.link"
              class="saved-chrome__toast-link"
              :to="toast.current.link.to"
              @click="dismiss"
            >
              {{ toast.current.link.label }}
            </RouterLink>
          </CdxMessage>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.saved-chrome {
  position: relative;
}

/* Under the header's end cluster; `top` follows scroll (see `floatTop`). */
.saved-chrome__float {
  position: fixed;
  transition: top var(--transition-duration-medium, 250ms) ease;
  right: var(--spacing-100, 16px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-50, 8px);
}

.saved-chrome__saved {
  position: relative;
  display: inline-flex;
}

.saved-chrome__icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border-radius: var(--border-radius-base, 2px);
  color: var(--color-base, #202122);
}

.saved-chrome__icon-link:hover {
  background-color: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.saved-chrome__icon-link.router-link-active {
  color: var(--color-progressive, #36c);
}

.saved-chrome__toast {
  width: max-content;
  max-width: 320px;
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
}

/* Confirmations are text only — no status icon. */
.saved-chrome__toast :deep(.cdx-message__icon),
.saved-chrome__toast :deep(.cdx-message__icon--vue) {
  display: none;
}

.saved-chrome__toast :deep(.cdx-message__content) {
  margin-inline-start: 0;
}

/* Mobile: bottom-centre, a little up from the edge, inset from both sides. */
.saved-chrome__toast--mobile {
  position: fixed;
  bottom: calc(48px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  z-index: 55;
  box-sizing: border-box;
  width: calc(100vw - 40px);
  max-width: 360px;
  transform: translateX(-50%);
}

.saved-chrome__toast-link {
  display: inline;
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
}

.saved-chrome-fade-enter-active,
.saved-chrome-fade-leave-active {
  transition: opacity var(--transition-duration-medium, 250ms);
}

.saved-chrome-fade-enter-from,
.saved-chrome-fade-leave-to {
  opacity: 0;
}
</style>
