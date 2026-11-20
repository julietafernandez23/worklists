<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxIcon, CdxMenuButton, type MenuGroupData, type MenuItemValue } from '@wikimedia/codex'
import { cdxIconSettings } from '@wikimedia/codex-icons'

import { useCollections } from './useCollections'

const props = defineProps<{ showLayout?: boolean }>()

const { ui } = useCollections()

const menuSelected = ref<MenuItemValue | MenuItemValue[] | null>(null)

const menuItems = computed(() => {
  const items: MenuGroupData[] = []
  if (props.showLayout) {
    items.push({
      label: 'Layout',
      items: [
        { value: 'expanded', label: 'Cards' },
        { value: 'compact', label: 'Compact' },
      ],
    })
  }
  return items
})

function syncMenuSelected() {
  if (!props.showLayout) {
    menuSelected.value = null
    return
  }
  menuSelected.value = ui.collectionsView
}

watch([() => ui.collectionsView, () => props.showLayout], syncMenuSelected, {
  immediate: true,
})

function selectedValues(value: MenuItemValue | MenuItemValue[] | null): MenuItemValue[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function onMenuSelected(value: MenuItemValue | MenuItemValue[] | null) {
  const values = selectedValues(value)
  if (values.includes('expanded')) ui.collectionsView = 'expanded'
  if (values.includes('compact')) ui.collectionsView = 'compact'
  syncMenuSelected()
}
</script>

<template>
  <span v-if="menuItems.length" class="pc-collection-settings">
    <CdxMenuButton
      v-model:selected="menuSelected"
      class="pc-collection-settings__button"
      weight="quiet"
      :menu-items="menuItems"
      :menu-config="{ placement: 'bottom-end', renderInPlace: true }"
      aria-label="Collections settings"
      @update:selected="onMenuSelected"
    >
      <CdxIcon :icon="cdxIconSettings" size="medium" />
    </CdxMenuButton>
  </span>
</template>

<style scoped>
.pc-collection-settings {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  margin-inline-start: auto;
  overflow: visible;
}

.pc-collection-settings__button {
  flex-shrink: 0;
}

.pc-collection-settings :deep(.cdx-menu-item__content) {
  column-gap: var(--spacing-50, 8px);
}

.pc-collection-settings :deep(.cdx-menu-item__selected-icon) {
  order: -1;
  margin: 0;
}
</style>