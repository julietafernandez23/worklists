<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxDialog, CdxField, CdxIcon, CdxTextInput } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconSettings } from '@wikimedia/codex-icons'

import PulsatingOnboardingDot from './PulsatingOnboardingDot.vue'
import { SAVED_PATH, useCollections, type Collection } from './useCollections'

const props = defineProps<{ collection: Collection }>()

const router = useRouter()
const { ui, nameTaken, renameCollection, deleteCollection } = useCollections()

const showEditingInfoIntroDot = computed(
  () => !ui.editingInfoIntroComplete && !ui.showEditingInfo,
)

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')
const renameInputRef = ref<InstanceType<typeof CdxTextInput> | null>(null)

const renameTrimmed = computed(() => renameValue.value.trim())
const renameDuplicate = computed(
  () => renameTrimmed.value.length > 0 && nameTaken(renameTrimmed.value, props.collection.id),
)
const renameCanSave = computed(() => renameTrimmed.value.length > 0 && !renameDuplicate.value)

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

watch(
  () => props.collection.id,
  () => closeMenu(),
)

function onRenameClick() {
  closeMenu()
  renameValue.value = props.collection.name
  renameOpen.value = true
}

watch(renameOpen, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  renameInputRef.value?.focus()
})

function confirmRename() {
  if (!renameCanSave.value) return
  if (renameCollection(props.collection.id, renameTrimmed.value)) {
    renameOpen.value = false
  }
}

function onToggleEditingInfo() {
  ui.showEditingInfo = !ui.showEditingInfo
}

function onDeleteClick() {
  const id = props.collection.id
  closeMenu()
  deleteCollection(id)
  void router.push({ path: SAVED_PATH, query: { view: 'collections' } })
}
</script>

<template>
  <div ref="rootRef" class="pc-collection-settings">
    <span class="pc-collection-settings__trigger">
      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Collection settings"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="open = !open"
      >
        <CdxIcon :icon="cdxIconSettings" size="medium" />
      </CdxButton>
      <PulsatingOnboardingDot :visible="showEditingInfoIntroDot" />
    </span>

    <div v-if="open" class="pc-collection-settings__panel" role="menu">
      <button type="button" class="pc-collection-settings__item" role="menuitem" @click="onRenameClick">
        Rename collection
      </button>
      <button
        type="button"
        class="pc-collection-settings__item"
        :class="{ 'pc-collection-settings__item--selected': ui.showEditingInfo }"
        role="menuitemcheckbox"
        :aria-checked="ui.showEditingInfo"
        @click="onToggleEditingInfo"
      >
        <CdxIcon
          v-if="ui.showEditingInfo"
          class="pc-collection-settings__check"
          :icon="cdxIconCheck"
          size="small"
        />
        Display editing information
      </button>
      <button
        type="button"
        class="pc-collection-settings__item pc-collection-settings__item--destructive"
        role="menuitem"
        @click="onDeleteClick"
      >
        Delete collection
      </button>
    </div>
  </div>

  <CdxDialog
    v-model:open="renameOpen"
    class="pc-collection-settings__rename-dialog"
    title="Rename collection"
    :primary-action="{ label: 'Save', actionType: 'progressive', disabled: !renameCanSave }"
    :default-action="{ label: 'Cancel' }"
    @primary="confirmRename"
    @default="renameOpen = false"
  >
    <form autocomplete="off" @submit.prevent="confirmRename">
      <CdxField
        :status="renameDuplicate ? 'error' : 'default'"
        :messages="{ error: 'You already have a collection with this name.' }"
        hide-label
      >
        <template #label>Name of the collection</template>
        <CdxTextInput
          ref="renameInputRef"
          v-model="renameValue"
          placeholder="Enter name"
          name="pc-rename-collection"
          autocomplete="off"
        />
      </CdxField>
    </form>
  </CdxDialog>
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

.pc-collection-settings__check {
  flex-shrink: 0;
  color: var(--color-progressive, #36c);
}

.pc-collection-settings__item--destructive {
  color: var(--color-destructive, #d73333);
}

.pc-collection-settings__item--destructive:hover {
  background: var(--background-color-error-subtle, #fee7e6);
}
</style>
