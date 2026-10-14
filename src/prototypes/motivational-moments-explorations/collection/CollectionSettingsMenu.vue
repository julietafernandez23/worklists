<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxIcon, CdxMenuButton, CdxToggleSwitch } from '@wikimedia/codex'
import type { MenuGroupData, MenuItemData } from '@wikimedia/codex'
import { cdxIconLayout, cdxIconListBullet, cdxIconSettings } from '@wikimedia/codex-icons'

export type CollectionViewMode = 'grid' | 'list'

const MENU_FOOTER_VALUE = 'cdx-menu-footer-item'

const collectionView = defineModel<CollectionViewMode>('collectionView', { default: 'grid' })
const editingMode = defineModel<boolean>('editingMode', { default: false })

const menuSelection = ref<string | null>(collectionView.value)

watch(collectionView, (view) => {
  menuSelection.value = view
})

const menuItems = computed((): MenuGroupData[] => [
  {
    label: 'View',
    items: [
      { value: 'list', label: 'List', icon: cdxIconListBullet },
      { value: 'grid', label: 'Grid', icon: cdxIconLayout },
    ],
  },
])

const footerItem = computed((): MenuItemData => ({
  value: MENU_FOOTER_VALUE,
  label: 'Editing mode',
}))

function onMenuSelected(value: string | null) {
  if (value === 'list' || value === 'grid') {
    collectionView.value = value
    menuSelection.value = value
    return
  }
  if (value === MENU_FOOTER_VALUE) {
    editingMode.value = !editingMode.value
  }
  menuSelection.value = collectionView.value
}

function toggleEditingMode() {
  editingMode.value = !editingMode.value
}
</script>

<template>
  <CdxMenuButton
    v-model:selected="menuSelection"
    class="mme-collection-settings"
    weight="quiet"
    size="large"
    :icon-only="true"
    :menu-items="menuItems"
    :footer="footerItem"
    :menu-config="{ placement: 'bottom-end' }"
    aria-label="Configure"
    @update:selected="onMenuSelected"
  >
    <CdxIcon :icon="cdxIconSettings" size="medium" />
    <template #menu-item="{ menuItem }">
      <div
        v-if="menuItem.value === MENU_FOOTER_VALUE"
        class="mme-collection-settings__toggle"
        role="presentation"
        @click.stop="toggleEditingMode"
      >
        <span class="mme-collection-settings__toggle-label">Editing mode</span>
        <CdxToggleSwitch
          :model-value="editingMode"
          align-switch
          aria-hidden="true"
          tabindex="-1"
        />
      </div>
    </template>
  </CdxMenuButton>
</template>

<style scoped>
.mme-collection-settings {
  flex-shrink: 0;
}

.mme-collection-settings:deep(.cdx-button) {
  box-sizing: border-box;
  width: var(--size-icon-large, 40px);
  min-width: var(--size-icon-large, 40px);
  max-width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  min-height: var(--size-icon-large, 40px);
  padding: 0;
  color: var(--color-base);
}

.mme-collection-settings__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100);
  width: 100%;
  min-width: 11rem;
  cursor: pointer;
}

.mme-collection-settings__toggle :deep(.cdx-toggle-switch) {
  pointer-events: none;
}

.mme-collection-settings__toggle-label {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

</style>
