<script setup lang="ts">
definePage({
  meta: {
    title: 'Saved',
    platform: 'web',
    // Reached from the prototype's header, not listed on its own in the gallery.
    hidden: true,
  },
})

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconAdd,
  cdxIconDownTriangle,
  cdxIconEllipsis,
  cdxIconLock,
  cdxIconArrowNext,
} from '@wikimedia/codex-icons'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import CollectionSettingsMenu from '../personal-collections/CollectionSettingsMenu.vue'
import SavedCollectionsTabSettingsMenu from '../personal-collections/SavedCollectionsTabSettingsMenu.vue'
import CollectionThumb from '../personal-collections/CollectionThumb.vue'
import CreateCollectionDialog from '../personal-collections/CreateCollectionDialog.vue'
import SavedCard from '../personal-collections/SavedCard.vue'
import SavedChrome from '../personal-collections/SavedChrome.vue'
import { SAVED_PATH, useCollections, type Collection } from '../personal-collections/useCollections'
import { globalSkin } from '@/theme'

const SAVED_PAGE = SAVED_PATH

const route = useRoute()
const router = useRouter()
const { collections, ui, findCollection, itemsIn } = useCollections()

const activeCollection = computed(() => findCollection(String(route.query.collection ?? '')))
const visibleItems = computed(() => itemsIn(activeCollection.value?.id))

/** Phones (Minerva) get their own layout: All items / Collections tabs, collections as a list. */
const isMobile = computed(() => globalSkin.value === 'mobile')
const mobileTab = computed(() =>
  activeCollection.value || route.query.view === 'collections' ? 'collections' : 'all',
)
function countLabel(collectionId: string) {
  const n = itemsIn(collectionId).length
  return `${n} ${n === 1 ? 'item' : 'items'}`
}

const collectionsTabTo = { path: SAVED_PAGE, query: { view: 'collections' } }

/**
 * Which navigation to draw (`ui.nav`, from the Prototype menu):
 *  - `tabs-desktop`: All items tab + Collections dropdown (can move to the side).
 *  - `tabs`: All items / Collections tabs, the Collections tab a list. Phones in
 *    both navigations, and desktop in the Collections page navigation — where
 *    each collection's row also previews its newest items.
 */
const layout = computed(() =>
  isMobile.value || ui.nav === 'collections-page' ? 'tabs' : 'tabs-desktop',
)

/** Newest items first; enough to fill one row on wide screens (the rest are clipped). */
const PREVIEW_COUNT = 24
function previewItems(collectionId: string) {
  return itemsIn(collectionId).slice(0, PREVIEW_COUNT)
}

/**
 * Preview tiles need room for at least two cards; narrower than that, the
 * Collections tab falls back to the compact list phones use. Tile width =
 * 24 padding × 2 + 200 name column + 24 gap × 2 + 32 arrow + two 140 cards
 * with a 12 gap. Measured on the list itself, so it follows resizing.
 */
const PREVIEW_MIN_WIDTH = 24 * 2 + 200 + 24 * 2 + 32 + (2 * 140 + 12)
const collectionListRef = ref<HTMLElement | null>(null)
const collectionListWidth = ref(Infinity)
const listObserver = new ResizeObserver(([entry]) => {
  collectionListWidth.value = entry.contentRect.width
})
watch(collectionListRef, (list, old) => {
  if (old) listObserver.unobserve(old)
  if (!list) return
  collectionListWidth.value = list.clientWidth
  listObserver.observe(list)
})
/** Desktop Compact view: the same tiles, previewing items as small thumbnails, not cards. */
const thumbTiles = computed(() => !isMobile.value && ui.collectionsView === 'compact')
/**
 * Plain collection rows (thumbnail, name, count): always on phones; on desktop
 * when Expanded tiles don't have room for two cards.
 */
const compactRows = computed(
  () => isMobile.value || (!thumbTiles.value && collectionListWidth.value < PREVIEW_MIN_WIDTH),
)

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const dialogOpen = ref(false)

function collectionTo(collection: Collection) {
  return { path: SAVED_PAGE, query: { collection: collection.id } }
}

function onDocPointerDown(event: PointerEvent) {
  if (!dropdownRef.value?.contains(event.target as Node)) dropdownOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') dropdownOpen.value = false
}

watch(dropdownOpen, (isOpen) => {
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
  listObserver.disconnect()
})

watch(
  () => route.query.collection,
  () => {
    dropdownOpen.value = false
  },
)

function onCreateClick() {
  dropdownOpen.value = false
  dialogOpen.value = true
}

async function pinToSide() {
  dropdownOpen.value = false
  ui.pinned = true
  await nextTick()
  document.querySelector<HTMLElement>('.saved-sidebar .saved-chip')?.focus()
}

/**
 * Keyboard: Tab moves between collection tiles (their cards are out of the tab
 * order); ← / → browse the visible cards inside a tile, Home / End jump to
 * the first / last, and ← from the first card returns to the collection.
 */
function onTileKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tile = event.currentTarget as HTMLElement
  const slots = [...tile.querySelectorAll<HTMLElement>('.saved-preview__items > li')]
  // Only the first row shows; cards that wrapped onto clipped rows are skipped.
  const cards = slots
    .filter((li) => li.offsetTop === slots[0]?.offsetTop)
    .map((li) => li.firstElementChild as HTMLElement)
  const name = tile.querySelector<HTMLElement>('.saved-preview__name')
  const current = cards.indexOf(document.activeElement as HTMLElement)
  const last = cards.length - 1
  let next: HTMLElement | null | undefined
  if (event.key === 'Home') next = cards[0]
  else if (event.key === 'End') next = cards[last]
  else if (event.key === 'ArrowRight') next = cards[Math.min(current + 1, last)]
  else if (current > 0) next = cards[current - 1]
  else if (current === 0) next = name
  if (!next) return
  event.preventDefault()
  next.focus()
}

function onCollectionCreated(collection: Collection) {
  void router.push(collectionTo(collection))
}
</script>

<template>
  <SavedChrome :last-edited-notice="false">
    <SpecialPageWrapper class="saved-page" help>
      <template #title>
        <template v-if="activeCollection"> Saved / {{ activeCollection.name }} </template>
        <template v-else>Saved</template>
        <CdxIcon
          v-if="!isMobile"
          class="saved-page__lock"
          :icon="cdxIconLock"
          size="small"
          title="Only you can see your saved items"
          aria-label="Private"
        />
      </template>

      <!-- ---------- Tabs, Collections as a list: phones, and desktop's Collections page ---------- -->
      <template v-if="layout === 'tabs'">
        <nav
          class="saved-m-tabs"
          :class="{ 'saved-m-tabs--in-collection': activeCollection }"
          aria-label="Saved"
        >
          <RouterLink
            class="saved-m-tabs__tab"
            :class="{ 'saved-m-tabs__tab--active': mobileTab === 'all' }"
            :to="SAVED_PAGE"
          >
            All items
          </RouterLink>
          <RouterLink
            class="saved-m-tabs__tab"
            :class="{
              'saved-m-tabs__tab--active': mobileTab === 'collections' && !activeCollection,
            }"
            :to="collectionsTabTo"
          >
            Collections
          </RouterLink>
          <SavedCollectionsTabSettingsMenu
            v-if="mobileTab === 'collections' && !activeCollection"
            :show-layout="!isMobile"
          />
          <CollectionSettingsMenu
            v-if="activeCollection"
            :collection="activeCollection"
          />
        </nav>

        <!--
          Collections tab: a list with item counts. On desktop, where there's
          room, each row is a tile previewing the collection's newest items.
        -->
        <ul
          v-if="mobileTab === 'collections' && !activeCollection"
          ref="collectionListRef"
          class="saved-m-list"
          :class="{ 'saved-m-list--preview': !compactRows }"
        >
          <li>
            <button
              v-if="compactRows"
              type="button"
              class="saved-m-list__create"
              @click="dialogOpen = true"
            >
              Create collection
            </button>
            <!-- Desktop: a subtle button above the collection tiles. -->
            <CdxButton v-else class="saved-preview-create" @click="dialogOpen = true">
              Create collection
            </CdxButton>
            <!-- Read out with each collection name (see aria-describedby on it). -->
            <p v-if="!compactRows" id="saved-preview-keys" class="saved-visually-hidden">
              Use the left and right arrow keys to browse its items.
            </p>
          </li>
          <li v-for="collection in collections" :key="collection.id">
            <RouterLink v-if="compactRows" class="saved-m-list__row" :to="collectionTo(collection)">
              <CollectionThumb :collection-id="collection.id" />
              <span class="saved-m-list__text">
                <span class="saved-m-list__name">{{ collection.name }}</span>
                <span class="saved-m-list__count">{{ countLabel(collection.id) }}</span>
              </span>
            </RouterLink>

            <div
              v-else
              class="saved-preview"
              :class="{ 'saved-preview--thumbs': thumbTiles }"
              @keydown="onTileKeydown"
            >
              <div class="saved-preview__head">
                <span class="saved-m-list__text">
                  <RouterLink
                    class="saved-m-list__name saved-preview__name"
                    :to="collectionTo(collection)"
                    aria-describedby="saved-preview-keys"
                  >
                    {{ collection.name }}
                  </RouterLink>
                  <span class="saved-m-list__count">{{ countLabel(collection.id) }}</span>
                </span>
              </div>
              <!-- One row of cards (or thumbnails); any that don't fit are clipped. -->
              <ul v-if="itemsIn(collection.id).length" class="saved-preview__items">
                <li v-for="item in previewItems(collection.id)" :key="item.key">
                  <!-- Out of the tab order: reached with the arrow keys instead. -->
                  <SavedCard
                    :item="item"
                    :compact="!thumbTiles"
                    :thumb="thumbTiles"
                    tabindex="-1"
                  />
                </li>
              </ul>
              <p v-else class="saved-preview__empty">No items yet</p>
              <!-- End-of-row cue; the whole tile opens the collection (see the name link). -->
              <span class="saved-preview__open" aria-hidden="true">
                <CdxIcon :icon="cdxIconArrowNext" />
              </span>
            </div>
          </li>
        </ul>

        <!-- All items, or one collection's items: card grid, or rows in compact view. -->
        <template v-else>
          <template v-if="visibleItems.length">
            <p class="saved-page__sort saved-page__sort--mobile">Sorted by most recent</p>
            <ul v-if="!isMobile" class="saved-grid">
              <li v-for="item in visibleItems" :key="item.key">
                <SavedCard :item="item" />
              </li>
            </ul>
            <ul v-else class="saved-m-rows">
              <li v-for="item in visibleItems" :key="item.key">
                <SavedCard :item="item" list />
              </li>
            </ul>
          </template>
          <div v-else class="saved-page__empty">
            <p class="saved-page__empty-title">
              {{ activeCollection ? 'This collection is empty' : 'No saved items yet' }}
            </p>
            <p>Use the bookmark on any article to save it here.</p>
          </div>
        </template>
      </template>

      <!-- ---------- Desktop: All items tab + Collections dropdown ---------- -->
      <template v-else>
        <div class="saved-page__more-row">
          <CdxButton weight="quiet" aria-label="More options">
            <CdxIcon class="saved-page__kebab" :icon="cdxIconEllipsis" />
          </CdxButton>
        </div>

        <div class="saved-page__layout" :class="{ 'saved-page__layout--pinned': ui.pinned }">
          <!--
          Pinned: one "Collections" group, like Wikipedia's pinned Contents/Tools
          menus. "All items" is the first row — a smart collection of everything —
          then the create action, then the reader's collections (last modified first, so a
          new one appears right under the button that made it).
        -->
          <nav v-if="ui.pinned" class="saved-sidebar" aria-label="Collections">
            <div class="saved-sidebar__heading">
              <span>Collections</span>
              <button type="button" class="saved-chip" @click="ui.pinned = false">hide</button>
            </div>

            <ul class="saved-sidebar__list">
              <li>
                <RouterLink
                  class="saved-sidebar__link"
                  :class="{ 'saved-sidebar__link--active': !activeCollection }"
                  :to="SAVED_PAGE"
                >
                  <span>All items</span>
                </RouterLink>
              </li>
              <li>
                <button type="button" class="saved-sidebar__create" @click="dialogOpen = true">
                  <CdxIcon :icon="cdxIconAdd" size="x-small" /> Create collection
                </button>
              </li>
              <li v-for="collection in collections" :key="collection.id">
                <RouterLink
                  class="saved-sidebar__link"
                  :class="{ 'saved-sidebar__link--active': activeCollection?.id === collection.id }"
                  :to="collectionTo(collection)"
                >
                  <span>{{ collection.name }}</span>
                </RouterLink>
              </li>
            </ul>
          </nav>

          <div class="saved-page__main">
            <div class="saved-page__toolbar">
              <!-- Unpinned: All items + Collections dropdown -->
              <div v-if="!ui.pinned" class="saved-tabs">
                <RouterLink
                  class="saved-tabs__tab"
                  :class="{ 'saved-tabs__tab--active': !activeCollection }"
                  :to="SAVED_PAGE"
                >
                  All items
                </RouterLink>

                <div ref="dropdownRef" class="saved-dropdown">
                  <button
                    type="button"
                    class="saved-tabs__tab saved-dropdown__trigger"
                    :aria-expanded="dropdownOpen"
                    aria-haspopup="true"
                    @click="dropdownOpen = !dropdownOpen"
                  >
                    Collections
                    <CdxIcon :icon="cdxIconDownTriangle" size="x-small" />
                  </button>

                  <div v-if="dropdownOpen" class="saved-dropdown__panel">
                    <div class="saved-dropdown__head">
                      <button type="button" class="saved-dropdown__create" @click="onCreateClick">
                        <CdxIcon :icon="cdxIconAdd" size="x-small" /> Create collection
                      </button>
                      <button type="button" class="saved-chip" @click="pinToSide">
                        move to side
                      </button>
                    </div>
                    <ul class="saved-dropdown__list">
                      <li v-for="collection in collections" :key="collection.id">
                        <RouterLink
                          class="saved-dropdown__item"
                          :class="{
                            'saved-dropdown__item--active': activeCollection?.id === collection.id,
                          }"
                          :to="collectionTo(collection)"
                        >
                          {{ collection.name }}
                        </RouterLink>
                      </li>
                      <li v-if="!collections.length" class="saved-dropdown__empty">
                        No collections yet
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <p v-else-if="visibleItems.length" class="saved-page__sort">Sorted by most recent</p>
              <span v-else />

              <CollectionSettingsMenu
                v-if="activeCollection"
                :collection="activeCollection"
              />
            </div>

            <template v-if="visibleItems.length">
              <p v-if="!ui.pinned" class="saved-page__sort">Sorted by most recent</p>
              <ul class="saved-grid">
                <li v-for="item in visibleItems" :key="item.key">
                  <SavedCard :item="item" />
                </li>
              </ul>
            </template>

            <div v-else class="saved-page__empty">
              <template v-if="activeCollection">
                <p class="saved-page__empty-title">This collection is empty</p>
                <p>Use the bookmark on any article to add it to {{ activeCollection.name }}.</p>
              </template>
              <template v-else>
                <p class="saved-page__empty-title">No saved items yet</p>
                <p>Use the bookmark on any article to save it here.</p>
              </template>
            </div>
          </div>
        </div>
      </template>
    </SpecialPageWrapper>
  </SavedChrome>

  <CreateCollectionDialog v-model:open="dialogOpen" @created="onCollectionCreated" />
</template>

<style scoped>
.saved-page {
  padding-bottom: var(--spacing-300, 48px);
}

.saved-page__lock {
  margin-inline-start: var(--spacing-50, 8px);
  color: var(--color-subtle, #54595d);
  vertical-align: middle;
}

/* Codex only ships a horizontal ellipsis — rotate it into a vertical "⋮". */
.saved-page__kebab {
  transform: rotate(90deg);
}

.saved-page__more-row {
  display: flex;
  justify-content: flex-end;
  margin-top: calc(-1 * var(--spacing-75, 12px));
  padding-bottom: 2px;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.saved-page__layout {
  display: block;
}

.saved-page__layout--pinned {
  display: grid;
  grid-template-columns: 212px minmax(0, 1fr);
  gap: var(--spacing-250, 40px);
}

.saved-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-top: var(--spacing-50, 8px);
}

.saved-page__sort {
  margin: 0 0 var(--spacing-25, 4px);
  font-size: var(--font-size-x-small, 12px);
  line-height: var(--line-height-x-small, 1.5);
}

.saved-page__empty {
  max-width: 480px;
  margin-top: var(--spacing-150, 24px);
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 14px);
}

.saved-page__empty p {
  margin: 0 0 var(--spacing-25, 4px);
}

.saved-page__empty-title {
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.saved-page__layout--pinned .saved-page__toolbar {
  align-items: flex-end;
  margin-bottom: var(--spacing-25, 4px);
}

.saved-page__sort--mobile {
  margin: var(--spacing-100, 16px) 0 var(--spacing-50, 8px);
}

.saved-page__layout--pinned .saved-page__toolbar .saved-page__sort {
  margin: 0;
}

/* ---- Grid ---- */
.saved-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 194px));
  gap: var(--spacing-75, 14px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.saved-grid > li {
  display: flex;
  margin: 0;
}

.saved-grid > li > * {
  flex: 1;
}

/* ---- Tabs + dropdown ---- */
.saved-tabs {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
}

.saved-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: var(--spacing-25, 4px);
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--font-size-small, 14px);
  /* Tabs are always bold; colour alone marks the current one. */
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
  text-decoration: none;
  cursor: pointer;
}

.saved-tabs__tab:hover {
  text-decoration: underline;
}

.saved-tabs__tab--active {
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.saved-tabs__tab--active:hover {
  text-decoration: none;
}

.saved-dropdown {
  position: relative;
}

.saved-dropdown__trigger :deep(.cdx-icon) {
  color: var(--color-progressive, #36c);
}

.saved-dropdown__panel {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 40;
  box-sizing: border-box;
  min-width: 288px;
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  font-size: var(--font-size-small, 14px);
}

.saved-dropdown__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-50, 8px) var(--spacing-50, 8px) var(--spacing-50, 8px)
    var(--spacing-75, 12px);
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.saved-dropdown__create {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--color-progressive, #36c);
  cursor: pointer;
}

.saved-dropdown__create :deep(.cdx-icon) {
  color: var(--color-progressive, #36c);
}

.saved-dropdown__create:hover {
  text-decoration: underline;
}

.saved-dropdown__list {
  margin: 0;
  padding: var(--spacing-25, 4px) 0;
  list-style: none;
}

.saved-dropdown__list li {
  margin: 0;
}

.saved-dropdown__item {
  display: block;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  color: var(--color-base, #202122);
  text-decoration: none;
}

.saved-dropdown__item:hover {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.saved-dropdown__item--active {
  font-weight: var(--font-weight-bold, 700);
}

.saved-dropdown__empty {
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  color: var(--color-subtle, #54595d);
}

/* Small neutral chip — matches the "hide" chip on Wikipedia's pinnable menus. */
.saved-chip {
  padding: 1px var(--spacing-50, 8px);
  border: 0;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive, #eaecf0);
  font: inherit;
  font-size: var(--font-size-small, 14px);
  color: var(--color-base, #202122);
  cursor: pointer;
}

.saved-chip:hover {
  background-color: var(--background-color-interactive--hover, #dadde3);
}

/* ---- Pinned sidebar ---- */
.saved-sidebar {
  padding-top: var(--spacing-100, 16px);
  font-size: var(--font-size-small, 14px);
}

.saved-sidebar__heading {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding-bottom: var(--spacing-50, 8px);
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-x-small, 12px);
}

.saved-sidebar__heading .saved-chip {
  font-size: var(--font-size-x-small, 12px);
}

.saved-sidebar__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A line under every row so each reads as its own button. */
.saved-sidebar__list li {
  margin: 0;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.saved-sidebar__link,
.saved-sidebar__create {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: var(--spacing-50, 8px) var(--spacing-50, 8px) var(--spacing-50, 8px) 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.saved-sidebar__link {
  justify-content: space-between;
  color: var(--color-base, #202122);
}

.saved-sidebar__link:hover {
  color: var(--color-progressive, #36c);
}

.saved-sidebar__link--active {
  font-weight: var(--font-weight-bold, 700);
}

.saved-sidebar__create {
  gap: var(--spacing-25, 4px);
  color: var(--color-progressive, #36c);
  cursor: pointer;
}

.saved-sidebar__create :deep(.cdx-icon) {
  color: var(--color-progressive, #36c);
}

.saved-sidebar__create:hover {
  text-decoration: underline;
}

/* ---- Mobile (Minerva) ---- */
.saved-m-tabs {
  display: flex;
  align-items: center;
  gap: var(--spacing-150, 24px);
  padding-bottom: var(--spacing-50, 8px);
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  font-size: var(--font-size-small, 14px);
}

.saved-m-tabs--in-collection {
  width: 100%;
  border-bottom: 0;
}

.saved-m-tabs__tab {
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.saved-m-tabs__tab--active {
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.saved-m-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.saved-m-list > li {
  margin: 0;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

/* Desktop previews: each collection on its own light-grey tile, no dividers. */
.saved-m-list--preview > li {
  border-bottom: 0;
}

.saved-m-list--preview > li + li {
  margin-top: var(--spacing-100, 16px);
}

/* Codex's medium button, with 14px text to match the bold tabs above it. */
.saved-preview-create.cdx-button {
  margin: var(--spacing-100, 16px) 0 var(--spacing-25, 4px);
  font-size: var(--font-size-small, 14px);
}

.saved-m-list__create {
  display: block;
  width: 100%;
  padding: var(--spacing-100, 16px) 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--font-size-small, 14px);
  color: var(--color-progressive, #36c);
  text-align: start;
  cursor: pointer;
}

.saved-m-list__row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-100, 16px) 0;
  color: var(--color-base, #202122);
  text-decoration: none;
}

.saved-m-list__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.saved-m-list__count {
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.saved-m-list__name {
  font-size: var(--font-size-large, 18px);
  line-height: var(--line-height-small, 1.375);
}

/* ---- Desktop Collections page: rows previewing each collection ---- */
/* Three columns: the name and count, the cards, then an arrow into the collection. */
.saved-preview {
  position: relative;
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) auto;
  gap: var(--spacing-150, 24px);
  align-items: start;
  padding: var(--spacing-150, 24px);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.saved-preview__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  min-width: 0;
}

.saved-preview__name {
  /* Long names stop after 7 lines with an ellipsis. */
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 7;
  color: var(--color-base, #202122);
  text-decoration: none;
}

/*
 * The whole tile is clickable: the name link stretches over it. The cards sit
 * above that layer so they still open their own articles.
 */
.saved-preview__name::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--border-radius-base, 2px);
}

.saved-preview__name:focus-visible {
  outline: none;
}

.saved-preview__name:focus-visible::after {
  outline: 2px solid var(--outline-color-progressive--focus, #36c);
}

/*
 * The card slots sit above it, so the cards — and the gaps between them —
 * don't open the collection. Space after the last card still does.
 */
.saved-preview__items {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.saved-preview__items > li {
  pointer-events: auto;
}

/* Hovering the tile (not a card) highlights it and its name. */
.saved-preview:hover:not(:has(.saved-preview__items > li:hover)) {
  background-color: var(--background-color-interactive, #eaecf0);
}

.saved-preview:hover:not(:has(.saved-preview__items > li:hover)) .saved-preview__name {
  color: var(--color-progressive, #36c);
  text-decoration: underline;
}

.saved-preview__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-base, 2px);
  color: var(--color-subtle, #54595d);
}

/*
 * A single row: extra cards go into zero-height rows and are clipped. The
 * small padding keeps the cards' focus outline inside the clip. Each slot
 * carries the 12px gap after its card as padding (instead of a grid gap), so
 * the space between cards belongs to a card, not the tile.
 */
.saved-preview__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
  grid-template-rows: auto;
  grid-auto-rows: 0;
  column-gap: 0;
  row-gap: 0;
  overflow: hidden;
  /* The end margin takes back the last slot's trailing gap, so it doesn't cost a column. */
  margin: -3px calc(-3px - var(--spacing-75, 12px)) -3px -3px;
  padding: 3px;
  list-style: none;
}

.saved-preview__items > li {
  display: flex;
  margin: 0;
  padding-inline-end: var(--spacing-75, 12px);
}

.saved-preview__items > li > * {
  flex: 1;
}

.saved-preview__empty {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 14px);
}

/*
 * Compact view tiles: a wider name column (260px), 64px thumbnails with an
 * 8px gap (the slot's end padding), less padding, and names kept to two lines.
 */
.saved-preview--thumbs {
  grid-template-columns: 260px minmax(0, 1fr) auto;
  padding: var(--spacing-100, 16px);
}

.saved-preview--thumbs .saved-preview__items {
  grid-template-columns: repeat(auto-fill, 72px);
  margin-inline-end: calc(-3px - var(--spacing-50, 8px));
}

.saved-preview--thumbs .saved-preview__items > li {
  padding-inline-end: var(--spacing-50, 8px);
}

.saved-preview--thumbs .saved-preview__name {
  -webkit-line-clamp: 2;
}

/* Read by screen readers, not shown. */
.saved-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.saved-m-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.saved-m-rows li {
  margin: 0;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}
</style>
