<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMenuButton,
  CdxTextInput,
  type MenuButtonItemData,
  type MenuItemValue,
} from '@wikimedia/codex'
import { cdxIconSettings } from '@wikimedia/codex-icons'

import { EDITING_INFO_MENU_HINT, EDITING_INFO_MENU_LABEL } from './globalEditingInfoSetting'
import { SAVED_PATH, useCollections, type Collection } from './useCollections'

const props = defineProps<{ collection: Collection }>()

const router = useRouter()
const { ui, nameTaken, renameCollection, deleteCollection } = useCollections()

const menuSelected = ref<MenuItemValue | MenuItemValue[] | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')
const renameInputRef = ref<InstanceType<typeof CdxTextInput> | null>(null)

const menuItems = computed((): MenuButtonItemData[] => [
  { value: 'rename', label: 'Rename collection' },
  {
    value: 'editing-info',
    label: EDITING_INFO_MENU_LABEL,
    description: EDITING_INFO_MENU_HINT,
  },
  { value: 'delete', label: 'Delete collection', action: 'destructive' },
])

const renameTrimmed = computed(() => renameValue.value.trim())
const renameDuplicate = computed(
  () => renameTrimmed.value.length > 0 && nameTaken(renameTrimmed.value, props.collection.id),
)
const renameCanSave = computed(() => renameTrimmed.value.length > 0 && !renameDuplicate.value)

function syncMenuSelected() {
  menuSelected.value = ui.showEditingInfo ? ['editing-info'] : null
}

watch(() => ui.showEditingInfo, syncMenuSelected, { immediate: true })

watch(
  () => props.collection.id,
  () => syncMenuSelected(),
)

function onRenameClick() {
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

function onDeleteClick() {
  const id = props.collection.id
  deleteCollection(id)
  void router.push({ path: SAVED_PATH, query: { view: 'collections' } })
}

function selectedValues(value: MenuItemValue | MenuItemValue[] | null): MenuItemValue[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function onMenuSelected(value: MenuItemValue | MenuItemValue[] | null) {
  const values = selectedValues(value)
  if (values.includes('rename')) onRenameClick()
  if (values.includes('delete')) onDeleteClick()
  ui.showEditingInfo = values.includes('editing-info')
  syncMenuSelected()
}
</script>

<template>
  <CdxMenuButton
    v-model:selected="menuSelected"
    class="pc-collection-settings"
    weight="quiet"
    :menu-items="menuItems"
    :menu-config="{ placement: 'bottom-end', renderInPlace: true }"
    aria-label="Collection settings"
    @update:selected="onMenuSelected"
  >
    <CdxIcon :icon="cdxIconSettings" size="medium" />
  </CdxMenuButton>

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
  flex-shrink: 0;
  margin-inline-start: auto;
}

/* Codex multiselect checks default to the trailing edge; collections settings match design (leading). */
.pc-collection-settings :deep(.cdx-menu-item__content) {
  column-gap: var(--spacing-50, 8px);
}

.pc-collection-settings :deep(.cdx-menu-item__selected-icon) {
  order: -1;
  margin: 0;
}
</style>
