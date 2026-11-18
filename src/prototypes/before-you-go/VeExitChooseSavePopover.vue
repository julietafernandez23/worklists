<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { cdxIconBookmark, cdxIconClose } from '@wikimedia/codex-icons'

import { SAVED_PATH } from './useCollections'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  collectionId: string
  collectionName: string
  /** Mobile (Minerva): Codex bottom sheet instead of a floating popover. */
  sheet?: boolean
}>()

const emit = defineEmits<{ save: [] }>()

const anchor = ref<HTMLElement | null>(null)
const collectionTo = computed(() => `${SAVED_PATH}?collection=${props.collectionId}`)

const bottomSheet = computed(() => (props.sheet ? 'responsive' : 'never') as 'responsive' | 'never')

function onSave() {
  emit('save')
  open.value = false
}

function onNotNow() {
  open.value = false
}
</script>

<template>
  <div class="ve-exit-choose-save-popover-host">
    <span ref="anchor" class="ve-exit-choose-save-popover-host__anchor" aria-hidden="true" />
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      class="ve-exit-choose-save-popover"
      :use-bottom-sheet="bottomSheet"
      placement="bottom-end"
      hide-arrow
      close-button-label="Close"
    >
      <template #header>
        <p class="cdx-popover__header__title ve-exit-choose-save-popover__title">
          Want to edit this article later?
        </p>
        <div class="cdx-popover__header__button-wrapper">
          <CdxButton
            class="cdx-popover__header__close-button"
            weight="quiet"
            type="button"
            aria-label="Close"
            @click="onNotNow"
          >
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </div>
      </template>

      <p class="ve-exit-choose-save-popover__body">
        Save it to your
        <RouterLink class="ve-exit-choose-save-popover__link" :to="collectionTo">{{
          collectionName
        }}</RouterLink>
        collection so you can easily find it and return to contribute.
      </p>

      <template #footer>
        <div class="cdx-popover__footer__actions cdx-popover__footer__actions--vertical">
          <CdxButton
            class="cdx-popover__footer__primary-action"
            weight="primary"
            action="progressive"
            @click="onSave"
          >
            <CdxIcon :icon="cdxIconBookmark" />
            Save article
          </CdxButton>
          <CdxButton class="cdx-popover__footer__default-action" @click="onNotNow">
            Not now
          </CdxButton>
        </div>
      </template>
    </CdxPopover>
  </div>
</template>

<style scoped>
.ve-exit-choose-save-popover-host {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.ve-exit-choose-save-popover-host__anchor {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  pointer-events: none;
}

.ve-exit-choose-save-popover__title {
  flex: 1;
  margin: 0;
}

.ve-exit-choose-save-popover__link {
  color: var(--color-progressive, #36c);
  font-weight: var(--font-weight-normal, 400);
  text-decoration: none;
}

.ve-exit-choose-save-popover__link:hover {
  text-decoration: underline;
}

.ve-exit-choose-save-popover__body {
  margin: 0;
}
</style>

<style>
.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__header,
.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__body,
.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-right: var(--spacing-100, 16px);
  padding-left: var(--spacing-100, 16px);
}

.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
}

.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__header {
  padding-bottom: 0;
}

.ve-exit-choose-save-popover.cdx-popover--bottom-sheet .cdx-popover__body {
  padding-top: var(--spacing-50, 8px);
}

.ve-exit-choose-save-popover.cdx-popover:not(.cdx-popover--bottom-sheet) .cdx-popover__header {
  margin-bottom: var(--spacing-50, 8px);
}
</style>