<script setup lang="ts">
/**
 * First-save onboarding: a pale-blue callout pointing at where "Saved" lives —
 * the Saved icon in the desktop header, the user menu on mobile — shown once
 * after the very first save when starting from scratch. Rendered inside that
 * header item (position: relative) so it hangs off it.
 */
import { onBeforeUnmount, watch } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import { useCollections } from './useCollections'

withDefaults(
  defineProps<{
    /** Caret centre, in px from the tip's right edge — over the icon it points at. */
    caret?: number
  }>(),
  { caret: 18 },
)

const { onboarding } = useCollections()

function dismiss() {
  onboarding.value = 'done'
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') dismiss()
}

watch(
  () => onboarding.value === 'showing',
  (showing) => {
    if (showing) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="saved-tip-fade">
    <div
      v-if="onboarding === 'showing'"
      class="saved-tip"
      :style="{ '--saved-tip-caret': `${caret}px` }"
      role="dialog"
      aria-labelledby="saved-tip-title"
      aria-describedby="saved-tip-text"
    >
      <p id="saved-tip-title" class="saved-tip__title">Saved</p>
      <p id="saved-tip-text" class="saved-tip__text">Access all your saved items from this menu.</p>
      <CdxButton class="saved-tip__ok" action="progressive" weight="primary" @click="dismiss">
        OK
      </CdxButton>
    </div>
  </Transition>
</template>

<style scoped>
/*
 * Hangs below the avatar, right edges roughly aligned, with a caret pointing
 * up at the avatar's centre (`--saved-tip-caret` = caret centre from the right).
 */
.saved-tip {
  position: absolute;
  top: calc(100% + 12px);
  right: -4px;
  z-index: 70;
  box-sizing: border-box;
  width: 232px;
  max-width: calc(100vw - 32px);
  padding: var(--spacing-100, 16px);
  border: 1px solid var(--border-color-progressive, #6485d1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-progressive-subtle, #f1f4fd);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  color: var(--color-base, #202122);
  font-family: var(--font-family-base);
  text-align: start;
  white-space: normal;
}

/* Caret: a bordered square rotated 45°, only its top-left edges showing. */
.saved-tip::before {
  content: '';
  position: absolute;
  top: -7px;
  right: calc(var(--saved-tip-caret) - 6px);
  width: 12px;
  height: 12px;
  border-top: 1px solid var(--border-color-progressive, #6485d1);
  border-left: 1px solid var(--border-color-progressive, #6485d1);
  background-color: var(--background-color-progressive-subtle, #f1f4fd);
  transform: rotate(45deg);
}

.saved-tip__title {
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.saved-tip__text {
  margin: var(--spacing-50, 8px) 0 var(--spacing-100, 16px);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.saved-tip__ok.cdx-button {
  width: 100%;
  max-width: none;
}

.saved-tip-fade-enter-active,
.saved-tip-fade-leave-active {
  transition: opacity var(--transition-duration-medium, 250ms);
}

.saved-tip-fade-enter-from,
.saved-tip-fade-leave-to {
  opacity: 0;
}
</style>
