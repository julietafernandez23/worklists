<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconSettings } from '@wikimedia/codex-icons'

import PulsatingOnboardingDot from './PulsatingOnboardingDot.vue'
import { useCollections } from './useCollections'

defineProps<{ showLayout?: boolean }>()

const { ui } = useCollections()

const showEditingInfoIntroDot = computed(
  () => !ui.editingInfoIntroComplete && !ui.showEditingInfo,
)

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function closeMenu() {
  open.value = false
}

function onDocPointerDown(event: PointerEvent) {
  if (!rootRef.value?.contains(event.target as Node)) closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
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

function setCollectionsView(mode: 'expanded' | 'compact') {
  ui.collectionsView = mode
}

function onToggleEditingInfo() {
  ui.showEditingInfo = !ui.showEditingInfo
}
</script>

<template>
  <div ref="rootRef" class="pc-collection-settings">
    <span class="pc-collection-settings__trigger">
      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Collections settings"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="open = !open"
      >
        <CdxIcon :icon="cdxIconSettings" size="medium" />
      </CdxButton>
      <PulsatingOnboardingDot :visible="showEditingInfoIntroDot" />
    </span>

    <div v-if="open" class="pc-collection-settings__panel" role="menu">
      <button
        type="button"
        class="pc-collection-settings__item"
        :class="{ 'pc-collection-settings__item--selected': ui.showEditingInfo }"
        role="menuitemcheckbox"
        :aria-checked="ui.showEditingInfo"
        @click="onToggleEditingInfo"
      >
        <span class="pc-collection-settings__check-slot" aria-hidden="true">
          <CdxIcon
            v-if="ui.showEditingInfo"
            class="pc-collection-settings__check"
            :icon="cdxIconCheck"
            size="small"
          />
        </span>
        Display editing information
      </button>
      <template v-if="showLayout">
        <p class="pc-collection-settings__group-label">Layout</p>
        <button
          type="button"
          class="pc-collection-settings__item pc-collection-settings__item--nested"
          :class="{ 'pc-collection-settings__item--selected': ui.collectionsView === 'expanded' }"
          role="menuitemradio"
          :aria-checked="ui.collectionsView === 'expanded'"
          @click="setCollectionsView('expanded')"
        >
          <span class="pc-collection-settings__check-slot" aria-hidden="true">
            <CdxIcon
              v-if="ui.collectionsView === 'expanded'"
              class="pc-collection-settings__check"
              :icon="cdxIconCheck"
              size="small"
            />
          </span>
          Cards
        </button>
        <button
          type="button"
          class="pc-collection-settings__item pc-collection-settings__item--nested"
          :class="{ 'pc-collection-settings__item--selected': ui.collectionsView === 'compact' }"
          role="menuitemradio"
          :aria-checked="ui.collectionsView === 'compact'"
          @click="setCollectionsView('compact')"
        >
          <span class="pc-collection-settings__check-slot" aria-hidden="true">
            <CdxIcon
              v-if="ui.collectionsView === 'compact'"
              class="pc-collection-settings__check"
              :icon="cdxIconCheck"
              size="small"
            />
          </span>
          Compact
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pc-collection-settings {
  position: relative;
  flex-shrink: 0;
  margin-inline-start: auto;
}

.pc-collection-settings__trigger {
  position: relative;
  display: inline-flex;
  overflow: visible;
}

.pc-collection-settings__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  box-sizing: border-box;
  min-width: 19rem;
  padding: 0;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-base, #fff);
  box-shadow: 0 4px 8px 0 var(--box-shadow-color-alpha-base, rgba(0, 0, 0, 0.06));
}

.pc-collection-settings__group-label {
  margin: 0;
  padding: var(--spacing-75, 12px) var(--spacing-75, 12px) var(--spacing-25, 4px);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
}

.pc-collection-settings__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  margin: 0;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  border: 0;
  background: none;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
  text-align: start;
  white-space: nowrap;
  cursor: pointer;
}

.pc-collection-settings__item:hover {
  background: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.pc-collection-settings__item--selected {
  color: var(--color-progressive, #36c);
  background: var(--background-color-progressive-subtle, #eaf3ff);
}

.pc-collection-settings__item--selected:hover {
  background: var(--background-color-progressive-subtle--hover, #dbe8ff);
}

.pc-collection-settings__item--nested {
  padding-inline-start: var(--spacing-150, 24px);
}

.pc-collection-settings__check-slot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--size-icon-small, 16px);
  height: var(--size-icon-small, 16px);
}

.pc-collection-settings__check {
  flex-shrink: 0;
  color: var(--color-progressive, #36c);
}
</style>
