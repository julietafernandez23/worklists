<script setup lang="ts">
import { ref } from 'vue'
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'

const MENU_SET_STATUS = 'set-status'

const props = defineProps<{
  title: string
  url: string
  listLayout?: boolean
}>()

const emit = defineEmits<{
  'set-status': []
}>()

const menuItems: MenuItemData[] = [
  { value: MENU_SET_STATUS, label: 'Set status' },
]

const menuSelection = ref<string | null>(null)

function onMenuSelected(value: string | null) {
  if (value === MENU_SET_STATUS) {
    emit('set-status')
  }
  menuSelection.value = null
}
</script>

<template>
  <div class="mme-collection-title-row">
    <a
      class="mme-collection-title-row__link"
      :class="{ 'mme-collection-title-row__link--list': props.listLayout }"
      :href="props.url"
      target="_blank"
      rel="noopener noreferrer"
    >{{ props.title }}</a>
    <CdxMenuButton
      v-model:selected="menuSelection"
      class="mme-collection-title-row__menu"
      weight="quiet"
      size="large"
      :icon-only="true"
      :menu-items="menuItems"
      :menu-config="{ placement: 'bottom-end' }"
      aria-label="Article actions"
      @update:selected="onMenuSelected"
    >
      <CdxIcon :icon="cdxIconEllipsis" size="medium" />
    </CdxMenuButton>
  </div>
</template>

<style scoped>
.mme-collection-title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.mme-collection-title-row__link {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  text-decoration: none;
}

.mme-collection-title-row__link--list {
  font-size: var(--font-size-medium);
}

.mme-collection-title-row__link:hover {
  text-decoration: underline;
}

.mme-collection-title-row__menu {
  flex-shrink: 0;
  margin: calc(-1 * var(--spacing-25)) calc(-1 * var(--spacing-25)) 0 0;
}

.mme-collection-title-row__menu:deep(.cdx-button) {
  color: var(--color-base);
}
</style>
