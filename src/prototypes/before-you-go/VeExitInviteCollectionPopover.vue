<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { cdxIconBookmark, cdxIconClose } from '@wikimedia/codex-icons'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  /** Mobile (Minerva): Codex bottom sheet instead of a floating popover. */
  sheet?: boolean
}>()

const emit = defineEmits<{ saveToCollection: [] }>()

const anchor = ref<HTMLElement | null>(null)
const bottomSheet = computed(() => (props.sheet ? 'responsive' : 'never') as 'responsive' | 'never')

function onSaveToCollection() {
  emit('saveToCollection')
  open.value = false
}

function onNotNow() {
  open.value = false
}
</script>

<template>
  <div class="ve-exit-invite-collection-popover-host">
    <span ref="anchor" class="ve-exit-invite-collection-popover-host__anchor" aria-hidden="true" />
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      class="ve-exit-invite-collection-popover"
      :use-bottom-sheet="bottomSheet"
      hide-backdrop
      placement="bottom-end"
      hide-arrow
      close-button-label="Close"
    >
      <template #header>
        <p class="cdx-popover__header__title ve-exit-invite-collection-popover__title">
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

      <p class="ve-exit-invite-collection-popover__body">
        Save it to a Collection so you can easily find it and come back whenever you're ready.
      </p>

      <template #footer>
        <div class="cdx-popover__footer__actions cdx-popover__footer__actions--vertical">
          <CdxButton
            class="cdx-popover__footer__primary-action"
            weight="primary"
            action="progressive"
            @click="onSaveToCollection"
          >
            <CdxIcon :icon="cdxIconBookmark" />
            Save to a Collection
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
.ve-exit-invite-collection-popover-host {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.ve-exit-invite-collection-popover-host__anchor {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  pointer-events: none;
}

.ve-exit-invite-collection-popover__title {
  flex: 1;
  margin: 0;
}

.ve-exit-invite-collection-popover__body {
  margin: 0;
}
</style>

<style>
.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__header,
.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__body,
.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-right: var(--spacing-100, 16px);
  padding-left: var(--spacing-100, 16px);
}

.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__footer {
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
}

.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__header {
  padding-bottom: 0;
}

.ve-exit-invite-collection-popover.cdx-popover--bottom-sheet .cdx-popover__body {
  padding-top: var(--spacing-50, 8px);
}

.ve-exit-invite-collection-popover.cdx-popover:not(.cdx-popover--bottom-sheet) .cdx-popover__header {
  margin-bottom: var(--spacing-50, 8px);
}
</style>