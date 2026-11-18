<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { CdxRadio } from '@wikimedia/codex'

import { VE_EXIT_EDIT_LATER_OPTIONS } from './beforeYouGoExplorations'
import { useCollections } from './useCollections'

const open = defineModel<boolean>('open', { required: true })

const { explorations } = useCollections()
const panelRef = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    queueMicrotask(() => panelRef.value?.focus({ preventScroll: true }))
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pc-proto-settings-fade">
      <div
        v-if="open"
        class="pc-proto-settings__backdrop"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="pc-proto-settings-sheet">
      <div
        v-if="open"
        ref="panelRef"
        class="pc-proto-settings"
        role="dialog"
        aria-label="Prototype settings"
        tabindex="-1"
      >
        <p class="pc-proto-settings__title">Prototype settings</p>
        <div class="pc-proto-settings__group">
          <CdxRadio
            v-for="option in VE_EXIT_EDIT_LATER_OPTIONS"
            :key="option.value"
            v-model="explorations.veExitEditLater"
            class="pc-proto-settings__option"
            name="pc-byg-explorations"
            :input-value="option.value"
          >
            {{ option.label }}
          </CdxRadio>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-proto-settings__backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
  background-color: rgba(84, 89, 93, 0.42);
}

.pc-proto-settings {
  position: fixed;
  z-index: 100;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  padding: var(--spacing-150, 24px) var(--spacing-150, 24px)
    calc(var(--spacing-150, 24px) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
  font-family: var(--font-family-base);
}

.pc-proto-settings__title {
  margin: 0 0 var(--spacing-125, 20px);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.pc-proto-settings__group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: 0;
}

.pc-proto-settings__option {
  margin: 0;
}

.pc-proto-settings__option :deep(.cdx-radio:not(.cdx-radio--inline)) {
  margin-bottom: 0;
}

.pc-proto-settings__option :deep(.cdx-label__label__text) {
  font-size: var(--font-size-small, 14px);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-small, 1.571);
}

.pc-proto-settings-fade-enter-active,
.pc-proto-settings-fade-leave-active {
  transition: opacity var(--transition-duration-medium, 250ms) ease;
}

.pc-proto-settings-fade-enter-from,
.pc-proto-settings-fade-leave-to {
  opacity: 0;
}

.pc-proto-settings-sheet-enter-active,
.pc-proto-settings-sheet-leave-active {
  transition: transform var(--transition-duration-medium, 250ms) ease;
}

.pc-proto-settings-sheet-enter-from,
.pc-proto-settings-sheet-leave-to {
  transform: translateY(100%);
}
</style>