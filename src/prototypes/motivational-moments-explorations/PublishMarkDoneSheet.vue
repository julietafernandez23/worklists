<script setup lang="ts">
import { ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  collectionName: string
}>()

const emit = defineEmits<{
  'mark-done': []
  'keep-working': []
}>()

const ignoreBackdropClick = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) {
    ignoreBackdropClick.value = false
    return
  }
  ignoreBackdropClick.value = true
  window.setTimeout(() => {
    ignoreBackdropClick.value = false
  }, 450)
})

function onBackdropClick() {
  if (ignoreBackdropClick.value) return
  emit('keep-working')
  open.value = false
}

function onMarkDone() {
  emit('mark-done')
  open.value = false
}

function onKeepWorking() {
  emit('keep-working')
  open.value = false
}

function onClose() {
  onKeepWorking()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mme-mark-done-sheet">
      <div
        v-if="open"
        class="mme-mark-done-sheet__backdrop"
        @click.self="onBackdropClick"
      >
        <div
          class="mme-mark-done-sheet"
          role="dialog"
          aria-labelledby="mme-mark-done-sheet-title"
        >
          <div class="mme-mark-done-sheet__header">
            <h2 id="mme-mark-done-sheet-title" class="mme-mark-done-sheet__title">
              Mark as done?
            </h2>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Close"
              @click="onClose"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>

          <p class="mme-mark-done-sheet__body">
            This article is in
            <span class="mme-mark-done-sheet__collection">{{ props.collectionName }}</span>.
            Do you want to mark it as done?
          </p>

          <CdxButton
            class="mme-mark-done-sheet__primary"
            weight="primary"
            action="progressive"
            @click="onMarkDone"
          >
            Mark as done. No more work needed for now
          </CdxButton>
          <CdxButton
            class="mme-mark-done-sheet__secondary"
            weight="quiet"
            @click="onKeepWorking"
          >
            Keep working on it. I want to continue later
          </CdxButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mme-mark-done-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 510;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
}

.mme-mark-done-sheet {
  box-sizing: border-box;
  width: 100%;
  max-width: 32rem;
  padding: var(--spacing-100) var(--spacing-100) var(--spacing-150);
  background-color: var(--background-color-base);
  border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
}

.mme-mark-done-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-75);
  margin-bottom: var(--spacing-75);
}

.mme-mark-done-sheet__title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.mme-mark-done-sheet__body {
  margin: 0 0 var(--spacing-125);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-mark-done-sheet__collection {
  font-weight: var(--font-weight-bold);
}

.mme-mark-done-sheet__primary {
  width: 100%;
  justify-content: center;
  margin-bottom: var(--spacing-50);
  text-align: center;
  white-space: normal;
  height: auto;
  min-height: var(--min-size-interactive-pointer, 44px);
  padding-block: var(--spacing-50);
}

.mme-mark-done-sheet__secondary {
  width: 100%;
  justify-content: center;
  text-align: center;
  white-space: normal;
  height: auto;
  min-height: var(--min-size-interactive-pointer, 44px);
  padding-block: var(--spacing-50);
}

.mme-mark-done-sheet-enter-active,
.mme-mark-done-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.mme-mark-done-sheet-enter-active .mme-mark-done-sheet,
.mme-mark-done-sheet-leave-active .mme-mark-done-sheet {
  transition: transform 0.25s ease;
}

.mme-mark-done-sheet-enter-from,
.mme-mark-done-sheet-leave-to {
  opacity: 0;
}

.mme-mark-done-sheet-enter-from .mme-mark-done-sheet,
.mme-mark-done-sheet-leave-to .mme-mark-done-sheet {
  transform: translateY(100%);
}
</style>
