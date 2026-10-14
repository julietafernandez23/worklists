<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconMenu } from '@wikimedia/codex-icons'
import { useSkin } from '@/composables/useSkin'
import { MME_EXPLORATIONS, type MmeExplorationId } from './explorations'

const props = defineProps<{
  activeExplorationId: MmeExplorationId
}>()

const router = useRouter()
const skin = useSkin()

const open = ref(false)
const anchor = ref<HTMLElement | null>(null)

const useBottomSheet = computed(() => skin.value === 'mobile')

function toggleMenu() {
  open.value = !open.value
}

function goToExploration(path: string) {
  open.value = false
  if (router.currentRoute.value.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="prototype-chrome-menu-popover mme-chrome-menu">
    <span ref="anchor" class="mme-chrome-menu__trigger">
      <CdxButton
        class="chrome-header__menu-btn"
        weight="quiet"
        size="large"
        aria-label="Main menu"
        :aria-expanded="open"
        @click="toggleMenu"
      >
        <CdxIcon :icon="cdxIconMenu" />
      </CdxButton>
    </span>

    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      :use-bottom-sheet="useBottomSheet"
      placement="bottom-start"
      class="mme-chrome-menu__overlay"
    >
      <div
        class="mme-chrome-menu__panel"
        :class="{ 'mme-chrome-menu__panel--sheet': useBottomSheet }"
        @click.stop
      >
        <p class="mme-chrome-menu__header">Explorations</p>
        <ul class="mme-chrome-menu__list" role="list">
          <li v-for="exploration in MME_EXPLORATIONS" :key="exploration.id">
            <button
              type="button"
              class="mme-chrome-menu__item"
              :class="{ 'mme-chrome-menu__item--active': exploration.id === props.activeExplorationId }"
              @click="goToExploration(exploration.path)"
            >
              <span class="mme-chrome-menu__item-label">{{ exploration.label }}</span>
              <CdxIcon
                v-if="exploration.id === props.activeExplorationId"
                class="mme-chrome-menu__item-check"
                :icon="cdxIconCheck"
              />
            </button>
          </li>
        </ul>
      </div>
    </CdxPopover>
  </div>
</template>

<style scoped>
.mme-chrome-menu {
  display: inline-flex;
  flex-shrink: 0;
}

.mme-chrome-menu__trigger {
  display: inline-flex;
}

.mme-chrome-menu__panel {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 14rem;
  padding: 0;
}

/* Bleed to bottom-sheet edges (Codex popover body padding). */
.mme-chrome-menu__panel--sheet {
  width: calc(100% + 2 * var(--spacing-150));
  min-width: 0;
  max-width: none;
  margin: calc(-1 * var(--spacing-50)) calc(-1 * var(--spacing-150)) 0;
}

.mme-chrome-menu__header {
  margin: 0;
  padding: var(--spacing-100) var(--spacing-150) var(--spacing-75);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-chrome-menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.mme-chrome-menu__list > li {
  width: 100%;
}

.mme-chrome-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75);
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  padding: var(--spacing-75) var(--spacing-150);
  border: none;
  background: transparent;
  text-align: start;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.mme-chrome-menu__item:hover {
  background-color: var(--background-color-interactive-subtle, #eaecf0);
}

.mme-chrome-menu__item--active {
  background-color: var(--background-color-progressive-subtle, #eaf3ff);
}

.mme-chrome-menu__item-label {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-chrome-menu__item-check {
  flex-shrink: 0;
  color: var(--color-progressive);
}
</style>
