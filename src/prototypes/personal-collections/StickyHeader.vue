<script setup lang="ts">
/**
 * Vector 2022-style sticky header: slides in once the article's title block has
 * scrolled out of view (Wikipedia behaviour — any scroll direction) and hides
 * again when it comes back. Search, title, page tools, languages and user menu;
 * only the bookmark is wired (it's the same save control as the article toolbar).
 */
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEdit,
  cdxIconExpand,
  cdxIconHistory,
  cdxIconLanguage,
  cdxIconSearch,
  cdxIconSpeechBubbles,
  cdxIconStar,
} from '@wikimedia/codex-icons'

import UserMenu from './UserMenu.vue'
import { STICKY_HEADER_HEIGHT, stickyHeader } from './useStickyHeader'

const props = defineProps<{
  title: string
  saved: boolean
  popoverOpen: boolean
  languagesCount?: number
}>()

const emit = defineEmits<{ bookmarkClick: [] }>()

/**
 * Visible once the bottom of the article's header block (title + tabs) is above
 * the top of the window. Checked on scroll rather than with an observer so it
 * keeps working when the article (and its header element) is swapped out.
 */
function update() {
  const header = document.querySelector('.pc-article .article-header')
  stickyHeader.visible = !!header && header.getBoundingClientRect().bottom < 0
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  // Anchor jumps (`scrollIntoView`, `#fragment`) stop short of the sticky header.
  document.documentElement.style.scrollPaddingTop = `${STICKY_HEADER_HEIGHT + 16}px`
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
  document.documentElement.style.scrollPaddingTop = ''
  stickyHeader.visible = false
})

// A new article starts at the top, so re-check once it has rendered.
watch(
  () => props.title,
  () => requestAnimationFrame(update),
)
</script>

<template>
  <Transition name="pc-sticky">
    <header
      v-show="stickyHeader.visible"
      class="pc-sticky-header"
      :style="{ height: `${STICKY_HEADER_HEIGHT}px` }"
    >
      <div class="pc-sticky-header__start">
        <CdxButton weight="quiet" aria-label="Search">
          <CdxIcon :icon="cdxIconSearch" />
        </CdxButton>
        <span class="pc-sticky-header__divider" aria-hidden="true" />
        <span class="pc-sticky-header__title">{{ title }}</span>
      </div>

      <div class="pc-sticky-header__end">
        <CdxButton weight="quiet" aria-label="Talk">
          <CdxIcon :icon="cdxIconSpeechBubbles" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="View history">
          <CdxIcon :icon="cdxIconHistory" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Watch">
          <CdxIcon :icon="cdxIconStar" />
        </CdxButton>
        <CdxButton
          weight="quiet"
          data-save-trigger
          :aria-label="saved ? 'Saved — manage' : 'Save this article'"
          :aria-pressed="saved"
          :aria-expanded="popoverOpen"
          @click="emit('bookmarkClick')"
        >
          <CdxIcon :icon="saved ? cdxIconBookmark : cdxIconBookmarkOutline" />
        </CdxButton>
        <CdxButton weight="quiet" aria-label="Edit">
          <CdxIcon :icon="cdxIconEdit" />
        </CdxButton>
        <CdxButton class="pc-sticky-header__languages" weight="quiet">
          <CdxIcon :icon="cdxIconLanguage" />
          {{ languagesCount ?? 18 }} languages
          <CdxIcon :icon="cdxIconExpand" size="x-small" />
        </CdxButton>
        <UserMenu class="pc-sticky-header__user" username="Username" caret />
      </div>
    </header>
  </Transition>
</template>

<style scoped>
.pc-sticky-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  /* Above article content; below the save popover/toast layer (z-index 50) and dialogs. */
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  box-sizing: border-box;
  padding-inline: var(--spacing-100, 16px);
  background-color: var(--background-color-base, #fff);
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.1);
}

.pc-sticky-header__start,
.pc-sticky-header__end {
  display: flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  min-width: 0;
}

.pc-sticky-header__end {
  flex-shrink: 0;
}

.pc-sticky-header :deep(.cdx-button) {
  color: var(--color-base, #202122);
}

.pc-sticky-header__divider {
  width: 1px;
  height: 28px;
  margin-inline: var(--spacing-50, 8px) var(--spacing-75, 12px);
  background-color: var(--border-color-subtle, #c8ccd1);
}

.pc-sticky-header__title {
  overflow: hidden;
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: var(--font-size-x-large, 1.5rem);
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--color-base, #202122);
}

.pc-sticky-header__languages.cdx-button {
  gap: var(--spacing-25, 4px);
  margin-inline-start: var(--spacing-50, 8px);
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.pc-sticky-header__user {
  margin-inline-start: var(--spacing-50, 8px);
}

.pc-sticky-enter-active,
.pc-sticky-leave-active {
  transition:
    transform var(--transition-duration-medium, 250ms) ease,
    opacity var(--transition-duration-medium, 250ms) ease;
}

.pc-sticky-enter-from,
.pc-sticky-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
