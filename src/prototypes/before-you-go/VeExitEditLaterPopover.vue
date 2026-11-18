<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { SAVED_PATH } from './useCollections'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  articleTitle: string
  collectionId: string
  collectionName: string
  /** Mobile (Minerva): Codex bottom sheet instead of a floating popover. */
  sheet?: boolean
}>()

const emit = defineEmits<{ undo: [] }>()

const anchor = ref<HTMLElement | null>(null)
const collectionTo = computed(() => `${SAVED_PATH}?collection=${props.collectionId}`)

const bottomSheet = computed(() => (props.sheet ? 'responsive' : 'never') as 'responsive' | 'never')

function onGotIt() {
  open.value = false
}

function onUndo() {
  emit('undo')
  open.value = false
}

function onClose() {
  open.value = false
}
</script>

<template>
  <div class="ve-exit-edit-later-popover-host">
    <span ref="anchor" class="ve-exit-edit-later-popover-host__anchor" aria-hidden="true" />
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      class="ve-exit-edit-later-popover"
      :use-bottom-sheet="bottomSheet"
      hide-backdrop
      placement="bottom-end"
      hide-arrow
      stacked-actions
      close-button-label="Close"
    >
      <template #header>
        <p class="cdx-popover__header__title ve-exit-edit-later-popover__title">
          {{ articleTitle }} added to
          <RouterLink class="ve-exit-edit-later-popover__link" :to="collectionTo">{{
            collectionName
          }}</RouterLink>
        </p>
        <div class="cdx-popover__header__button-wrapper">
          <CdxButton
            class="cdx-popover__header__close-button"
            weight="quiet"
            type="button"
            aria-label="Close"
            @click="onClose"
          >
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </div>
      </template>

      <p class="ve-exit-edit-later-popover__body">
        You can easily find this article and return to edit it whenever you're ready.
      </p>

      <template #footer>
        <div class="cdx-popover__footer__actions cdx-popover__footer__actions--vertical">
          <CdxButton
            class="cdx-popover__footer__primary-action"
            weight="primary"
            action="progressive"
            @click="onGotIt"
          >
            Got it
          </CdxButton>
          <CdxButton
            class="cdx-popover__footer__default-action"
            weight="quiet"
            @click="onUndo"
          >
            Remove from Collection
          </CdxButton>
        </div>
      </template>
    </CdxPopover>
  </div>
</template>

<style scoped>
.ve-exit-edit-later-popover-host {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.ve-exit-edit-later-popover-host__anchor {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  pointer-events: none;
}

.ve-exit-edit-later-popover__title {
  flex: 1;
  margin: 0;
}

.ve-exit-edit-later-popover__link {
  color: var(--color-progressive, #36c);
  font-weight: var(--font-weight-bold, 700);
  text-decoration: none;
}

.ve-exit-edit-later-popover__link:hover {
  text-decoration: underline;
}

.ve-exit-edit-later-popover__body {
  margin: 0;
}
</style>

<!-- Teleported CdxPopover panel — match mock 16px horizontal inset -->
<style>
.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__header,
.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__body,
.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-right: var(--spacing-100, 16px);
  padding-left: var(--spacing-100, 16px);
}

.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
}

.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__header {
  padding-bottom: 0;
}

.ve-exit-edit-later-popover.cdx-popover--bottom-sheet .cdx-popover__body {
  padding-top: var(--spacing-50, 8px);
}

.ve-exit-edit-later-popover.cdx-popover:not(.cdx-popover--bottom-sheet) .cdx-popover__header {
  margin-bottom: var(--spacing-50, 8px);
}
</style>