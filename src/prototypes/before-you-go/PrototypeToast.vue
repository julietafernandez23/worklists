<script setup lang="ts">
/**
 * Transient save confirmations — mounted on the article page so toasts work
 * while the VE overlay is open (SavedChrome chrome is underneath).
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon, CdxMessage } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { globalSkin } from '@/theme'
import { useToast } from './useToast'

const { state: toast, dismiss, runAction } = useToast()
const isMobile = computed(() => globalSkin.value === 'mobile')

const current = computed(() => toast.current)
const isSnackbar = computed(() => current.value?.variant === 'snackbar')
</script>

<template>
  <Teleport to="body">
    <Transition name="prototype-toast-fade">
      <!-- VE exit: dark snackbar with title, body, Save, dismiss. -->
      <div
        v-if="current && isSnackbar"
        :key="current.id"
        class="prototype-snackbar"
        :class="{ 'prototype-snackbar--mobile': isMobile }"
        role="status"
        aria-live="polite"
      >
        <div class="prototype-snackbar__copy">
          <p v-if="current.title" class="prototype-snackbar__title">{{ current.title }}</p>
          <p class="prototype-snackbar__body">{{ current.text }}</p>
        </div>
        <button
          v-if="current.actionLabel"
          type="button"
          class="prototype-snackbar__action"
          @click="runAction"
        >
          {{ current.actionLabel }}
        </button>
        <CdxButton
          v-if="current.dismissable !== false"
          class="prototype-snackbar__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="dismiss"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>

      <!-- Bookmark / collection confirmations (Codex). -->
      <CdxMessage
        v-else-if="current"
        :key="current.id"
        class="prototype-toast"
        :class="{ 'prototype-toast--mobile': isMobile }"
        :type="current.type"
        role="status"
      >
        <span class="prototype-toast__inner">
          <span class="prototype-toast__text">
            {{ current.text }}
            <RouterLink
              v-if="current.link"
              class="prototype-toast__link"
              :to="current.link.to"
              @click="dismiss"
            >
              {{ current.link.label }}
            </RouterLink>
          </span>
          <CdxButton
            v-if="current.actionLabel"
            class="prototype-toast__action"
            weight="quiet"
            @click="runAction"
          >
            {{ current.actionLabel }}
          </CdxButton>
        </span>
      </CdxMessage>
    </Transition>
  </Teleport>
</template>

<style scoped>
.prototype-snackbar {
  position: fixed;
  z-index: 60;
  right: var(--spacing-100, 16px);
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  left: var(--spacing-100, 16px);
  margin-inline: auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  max-width: 720px;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border-radius: var(--border-radius-base, 2px);
  background-color: #1a1a1a;
  color: #fff;
  font-family: var(--font-family-system-sans);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.25));
}

.prototype-snackbar--mobile {
  bottom: calc(48px + env(safe-area-inset-bottom, 0px));
  max-width: calc(100vw - 32px);
}

.prototype-snackbar__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.prototype-snackbar__title {
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.prototype-snackbar__body {
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-small, 1.375);
}

.prototype-snackbar__title + .prototype-snackbar__body {
  margin-top: var(--spacing-25, 4px);
}

.prototype-snackbar__action {
  flex-shrink: 0;
  margin: 0;
  padding: var(--spacing-50, 8px);
  border: none;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  text-decoration: underline;
  cursor: pointer;
  white-space: nowrap;
}

.prototype-snackbar__action:hover {
  opacity: 0.9;
}

.prototype-snackbar__close {
  flex-shrink: 0;
  margin: -6px -8px -6px 0;
  color: #fff !important;
}

.prototype-snackbar__close:deep(.cdx-icon) {
  color: #fff;
}

.prototype-toast {
  position: fixed;
  top: calc(62px + env(safe-area-inset-top, 0px));
  right: var(--spacing-100, 16px);
  z-index: 60;
  width: max-content;
  max-width: 320px;
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
}

.prototype-toast :deep(.cdx-message__icon),
.prototype-toast :deep(.cdx-message__icon--vue) {
  display: none;
}

.prototype-toast :deep(.cdx-message__content) {
  margin-inline-start: 0;
}

.prototype-toast--mobile {
  top: auto;
  right: auto;
  bottom: calc(48px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  width: calc(100vw - 40px);
  max-width: 360px;
  transform: translateX(-50%);
}

.prototype-toast__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
  width: 100%;
}

.prototype-toast__text {
  flex: 1 1 auto;
  min-width: 0;
}

.prototype-toast__link {
  display: inline;
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
}

.prototype-toast__action {
  flex-shrink: 0;
  margin: -4px -8px -4px 0;
  font-weight: var(--font-weight-bold, 700);
}

.prototype-toast-fade-enter-active,
.prototype-toast-fade-leave-active {
  transition: opacity var(--transition-duration-medium, 250ms) ease;
}

.prototype-toast-fade-enter-from,
.prototype-toast-fade-leave-to {
  opacity: 0;
}
</style>