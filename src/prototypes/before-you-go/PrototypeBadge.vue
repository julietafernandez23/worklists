<script setup lang="ts">
/**
 * Small "Prototype" tag pinned bottom-left. Opens a panel explaining that saves
 * live in this browser, with one-click resets to either starting point.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxRadio } from '@wikimedia/codex'
import { cdxIconClose, cdxIconLabFlask } from '@wikimedia/codex-icons'

import { ARTICLE_PATH, useCollections, type SavedNav } from './useCollections'

const router = useRouter()
const { resetDemo, ui } = useCollections()

const NAV_OPTIONS: { value: SavedNav; label: string }[] = [
  { value: 'collections-page', label: 'Dedicated collection page' },
  { value: 'tabs', label: 'Side menu' },
]

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function reset(withCollections: boolean) {
  resetDemo(withCollections)
  open.value = false
  window.scrollTo(0, 0)
  void router.push(ARTICLE_PATH)
}

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
  <div ref="rootRef" class="pc-proto">
    <div v-if="open" class="pc-proto__panel" role="dialog" aria-label="About this prototype">
      <div class="pc-proto__head">
        <strong>This is a prototype</strong>
        <CdxButton weight="quiet" size="small" aria-label="Close" @click="open = false">
          <CdxIcon :icon="cdxIconClose" size="small" />
        </CdxButton>
      </div>
      <p class="pc-proto__text">
        Everything you save is stored only in this browser. Reset to start the demo over.
      </p>

      <div class="pc-proto__option">
        <CdxButton size="small" @click="reset(true)">Reset with sample collections</CdxButton>
      </div>
      <div class="pc-proto__option">
        <CdxButton size="small" @click="reset(false)">Reset with nothing saved</CdxButton>
      </div>

      <fieldset class="pc-proto__nav">
        <legend class="pc-proto__legend">Saved page navigation</legend>
        <CdxRadio
          v-for="option in NAV_OPTIONS"
          :key="option.value"
          v-model="ui.nav"
          name="pc-proto-nav"
          :input-value="option.value"
        >
          {{ option.label }}
        </CdxRadio>
      </fieldset>
    </div>

    <button
      type="button"
      class="pc-proto__badge"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="open = !open"
    >
      <CdxIcon :icon="cdxIconLabFlask" size="small" />
      Prototype
    </button>
  </div>
</template>

<style scoped>
.pc-proto {
  position: fixed;
  bottom: var(--spacing-100, 16px);
  left: var(--spacing-100, 16px);
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}

.pc-proto__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding: var(--spacing-25, 4px) var(--spacing-75, 12px);
  /* Codex "warning" palette: pale yellow reads as draft / not the real thing. */
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

.pc-proto__panel {
  box-sizing: border-box;
  width: 340px;
  max-width: calc(100vw - 32px);
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px) var(--spacing-100, 16px);
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  color: var(--color-base, #202122);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.pc-proto__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-inline-end: -8px;
}

.pc-proto__text {
  margin: var(--spacing-25, 4px) 0 var(--spacing-75, 12px);
  color: var(--color-subtle, #54595d);
}

.pc-proto__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25, 4px);
  margin-bottom: var(--spacing-50, 8px);
}

.pc-proto__nav {
  margin: var(--spacing-100, 16px) 0 0;
  padding: var(--spacing-75, 12px) 0 0;
  border: 0;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}

.pc-proto__legend {
  float: left;
  width: 100%;
  margin-bottom: var(--spacing-50, 8px);
  padding: 0;
  font-weight: var(--font-weight-bold, 700);
}

.pc-proto__nav :deep(.cdx-radio) {
  clear: both;
}
</style>
