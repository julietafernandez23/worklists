<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  CdxButton,
  CdxDialog,
  CdxIcon,
  CdxMenuButton,
  CdxProgressBar,
  CdxThumbnail,
} from '@wikimedia/codex'
import type { MenuButtonItemData } from '@wikimedia/codex'
import {
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconChartLine,
  cdxIconCheck,
  cdxIconClose,
  cdxIconEdit,
  cdxIconImage,
  cdxIconLayout,
  cdxIconLightbulb,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import {
  addArticlesToWorklist,
  EVENT_WORKLIST_LABEL,
  EVENT_WORKLIST_ROUTE,
} from '@/lib/event-worklist-storage'
import { getCollectionArticles } from '../saved-items'

definePage({
  meta: {
    title: 'Saved collection (view modes)',
    description: 'Saved collection with grid, list, and contributor layouts.',
  },
})

type CollectionView = 'grid' | 'list' | 'contributor'

type Quality = 'low' | 'medium' | 'high'

interface SavedArticle {
  title: string
  description: string
  url: string
  thumbnail: { url: string; width: number; height: number } | null
  viewsPerMonth: string
  quality: Quality
  suggestions: string[]
}

const QUALITY_CYCLE: Quality[] = ['medium', 'high', 'low', 'high', 'medium', 'low', 'high']
const VIEW_COUNTS = [20, 45, 12, 8, 15, 120, 33]
const SUGGESTION_SETS = [
  ['Add a citation', 'Add a link'],
  ['Remove duplicated link'],
  ['Revise tone'],
  ['Add a citation', 'Add a link'],
  ['Add a citation'],
  ['Add a link'],
  ['Add a citation', 'Add a link'],
]

const VIEW_MENU_ITEMS: MenuButtonItemData[] = [
  { value: 'grid', label: 'Grid view' },
  { value: 'list', label: 'List view' },
  { value: 'contributor', label: 'Contributor view' },
]

const route = useRoute()
const { user } = useConfig()

const collectionName = computed(() => {
  const value = route.query.collection
  return typeof value === 'string' && value.trim() ? value.trim() : 'Saved items'
})

const isOwner = computed(() => user.value !== 'logged-out')

const articles = ref<SavedArticle[]>([])
const loading = ref(true)
const collectionView = ref<CollectionView>('grid')
const layoutMenuAction = ref<string | null>(null)
const collectionMenuAction = ref<string | null>(null)

const showWorklistDialog = ref(false)
const worklistDialogPending = ref(false)
const worklistToast = ref<{ addedCount: number; skippedCount: number } | null>(null)

const collectionMenuItems: MenuButtonItemData[] = [
  { value: 'add-to-worklist', label: 'Add to event worklist' },
  { value: 'rename', label: 'Rename collection' },
  { value: 'delete', label: 'Delete collection', action: 'destructive' },
]

const collectionArticleTitles = computed(() =>
  getCollectionArticles(collectionName.value),
)

const worklistDialogMessage = computed(() => {
  const count = collectionArticleTitles.value.length
  const noun = count === 1 ? 'article' : 'articles'
  return `Add ${count} ${noun} from this collection to the ${EVENT_WORKLIST_LABEL} event worklist? Articles already on the worklist will be skipped.`
})

const worklistDialogPrimaryAction = computed(() => ({
  label: 'Add to worklist',
  actionType: 'progressive' as const,
  disabled: !collectionArticleTitles.value.length || worklistDialogPending.value,
}))

const worklistToastMessage = computed(() => {
  if (!worklistToast.value) return ''
  const { addedCount, skippedCount } = worklistToast.value
  if (!addedCount) {
    return skippedCount === 1
      ? 'That article is already on the event worklist.'
      : 'Those articles are already on the event worklist.'
  }
  const addedNoun = addedCount === 1 ? 'article has' : 'articles have'
  if (!skippedCount) {
    return `${addedCount} ${addedNoun} been added to the event worklist.`
  }
  return `${addedCount} ${addedNoun} been added to the event worklist (${skippedCount} skipped).`
})

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k views last month`
}

function qualityLabel(quality: Quality): string {
  return `${quality.charAt(0).toUpperCase()}${quality.slice(1)} quality`
}

function onLayoutMenuAction(action: string | null) {
  if (!action) return
  if (action === 'grid' || action === 'list' || action === 'contributor') {
    collectionView.value = action
  }
  layoutMenuAction.value = null
}

function onCollectionMenuAction(action: string | null) {
  if (action === 'add-to-worklist') {
    showWorklistDialog.value = true
  }
  collectionMenuAction.value = null
}

function closeWorklistDialog() {
  showWorklistDialog.value = false
}

async function confirmAddToWorklist() {
  if (!collectionArticleTitles.value.length) {
    showWorklistDialog.value = false
    return
  }

  worklistDialogPending.value = true
  await new Promise((resolve) => setTimeout(resolve, 350))
  const { added, skipped } = addArticlesToWorklist(collectionArticleTitles.value)
  worklistDialogPending.value = false
  showWorklistDialog.value = false
  worklistToast.value = { addedCount: added.length, skippedCount: skipped.length }
}

async function fetchSavedArticle(title: string, index: number): Promise<SavedArticle> {
  const wikiTitle = title.replace(/ /g, '_')
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
    )
    const data = await res.json()
    const thumb = data.thumbnail
    return {
      title: data.title ?? title,
      description: data.description?.trim() || '',
      url: data.content_urls?.desktop?.page
        ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      thumbnail: thumb
        ? { url: thumb.source, width: thumb.width, height: thumb.height }
        : null,
      viewsPerMonth: fakeViews(index),
      quality: QUALITY_CYCLE[index % QUALITY_CYCLE.length],
      suggestions: SUGGESTION_SETS[index % SUGGESTION_SETS.length],
    }
  } catch {
    return {
      title,
      description: '',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      thumbnail: null,
      viewsPerMonth: fakeViews(index),
      quality: QUALITY_CYCLE[index % QUALITY_CYCLE.length],
      suggestions: SUGGESTION_SETS[index % SUGGESTION_SETS.length],
    }
  }
}

async function loadArticles() {
  loading.value = true
  const titles = getCollectionArticles(collectionName.value)
  articles.value = await Promise.all(titles.map((title, index) => fetchSavedArticle(title, index)))
  loading.value = false
}

onMounted(loadArticles)

watch(collectionName, loadArticles)
</script>

<template>
  <ChromeWrapper skin="mobile">
    <main class="cvm-saved">
      <h1 class="cvm-saved__title">
        Saved / {{ collectionName }}
      </h1>

      <nav class="cvm-saved__nav" aria-label="Saved views">
        <div class="cvm-saved__nav-links">
          <a href="#" class="cvm-saved__nav-link">All items</a>
          <a href="#" class="cvm-saved__nav-link">Collections</a>
        </div>
        <div class="cvm-saved__nav-actions">
          <CdxMenuButton
            v-model:selected="layoutMenuAction"
            class="cvm-saved__layout"
            weight="quiet"
            :menu-items="VIEW_MENU_ITEMS"
            :menu-config="{ placement: 'bottom-end' }"
            :aria-label="'Change layout view'"
            @update:selected="onLayoutMenuAction"
          >
            <CdxIcon :icon="cdxIconLayout" />
          </CdxMenuButton>
          <CdxMenuButton
            v-if="isOwner"
            v-model:selected="collectionMenuAction"
            class="cvm-saved__edit"
            weight="quiet"
            :menu-items="collectionMenuItems"
            :menu-config="{ placement: 'bottom-end' }"
            aria-label="Edit collection"
            @update:selected="onCollectionMenuAction"
          >
            <CdxIcon :icon="cdxIconEdit" />
          </CdxMenuButton>
        </div>
      </nav>

      <p class="cvm-saved__sort">Sorted by most recent</p>

      <CdxProgressBar v-if="loading" inline aria-label="Loading saved articles" />

      <p v-else-if="!articles.length" class="cvm-saved__empty">
        No articles in this collection yet.
      </p>

      <ul
        v-else-if="collectionView === 'list'"
        class="cvm-saved__rows"
        role="list"
      >
        <li v-for="article in articles" :key="article.title" class="cvm-saved__row">
          <CdxThumbnail
            class="cvm-saved__row-thumb"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="cvm-saved__row-body">
            <a
              class="cvm-saved__row-title"
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ article.title }}</a>
            <p v-if="article.description" class="cvm-saved__row-description">
              {{ article.description }}
            </p>
          </div>
        </li>
      </ul>

      <ul
        v-else
        class="cvm-saved__cards"
        role="list"
      >
        <li v-for="article in articles" :key="article.title" class="cvm-saved__card">
          <CdxThumbnail
            class="cvm-saved__thumbnail"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="cvm-saved__item-body">
            <a
              class="cvm-saved__item-title"
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ article.title }}</a>
            <p v-if="article.description" class="cvm-saved__item-description">
              {{ article.description }}
            </p>

            <div
              v-if="collectionView === 'contributor'"
              class="cvm-saved__signals"
            >
              <div class="cvm-saved__signal">
                <CdxIcon
                  :icon="cdxIconChartLine"
                  size="small"
                  class="cvm-saved__signal-icon cvm-saved__signal-icon--views"
                />
                <span class="cvm-saved__signal-text">{{ article.viewsPerMonth }}</span>
              </div>

              <div class="cvm-saved__signal">
                <CdxIcon
                  :icon="cdxIconLightbulb"
                  size="small"
                  class="cvm-saved__signal-icon cvm-saved__signal-icon--suggestion"
                />
                <span class="cvm-saved__signal-text cvm-saved__signal-text--suggestions">
                  <template v-for="(suggestion, index) in article.suggestions" :key="suggestion">
                    <span v-if="index > 0" class="cvm-saved__suggestion-sep">, </span>
                    <span class="cvm-saved__suggestion-text">{{ suggestion }}</span>
                  </template>
                </span>
              </div>

              <div
                class="cvm-saved__signal cvm-saved__signal--quality"
                :class="`cvm-saved__signal--${article.quality}`"
              >
                <CdxIcon
                  v-if="article.quality === 'high'"
                  :icon="cdxIconArrowUp"
                  size="small"
                  class="cvm-saved__signal-icon"
                />
                <CdxIcon
                  v-else-if="article.quality === 'low'"
                  :icon="cdxIconArrowDown"
                  size="small"
                  class="cvm-saved__signal-icon"
                />
                <span v-else class="cvm-saved__signal-icon cvm-saved__signal-icon--medium" aria-hidden="true">—</span>
                <span class="cvm-saved__signal-text cvm-saved__signal-text--quality">
                  {{ qualityLabel(article.quality) }}
                </span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <div
      v-if="worklistToast"
      class="cvm-saved__worklist-toast"
      role="status"
      aria-live="polite"
    >
      <span class="cvm-saved__worklist-toast-icon" aria-hidden="true">
        <CdxIcon :icon="cdxIconCheck" />
      </span>
      <p class="cvm-saved__worklist-toast-message">
        {{ worklistToastMessage }}
        <RouterLink
          v-if="worklistToast.addedCount > 0"
          :to="EVENT_WORKLIST_ROUTE"
          class="cvm-saved__worklist-toast-link"
        >
          View worklist
        </RouterLink>
      </p>
      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Dismiss"
        class="cvm-saved__worklist-toast-close"
        @click="worklistToast = null"
      >
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>
    </div>
  </ChromeWrapper>

  <CdxDialog
    v-model:open="showWorklistDialog"
    title="Add to event worklist"
    close-button-label="Close"
    :dismissable="!worklistDialogPending"
    :primary-action="worklistDialogPrimaryAction"
    @primary="confirmAddToWorklist"
    @update:open="(open) => { if (!open) closeWorklistDialog() }"
  >
    <p class="cvm-saved__worklist-dialog-text">
      {{ worklistDialogMessage }}
    </p>
  </CdxDialog>
</template>

<style scoped>
.cvm-saved {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-200);
}

.cvm-saved__title {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.cvm-saved__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100);
  margin-bottom: var(--spacing-100);
}

.cvm-saved__nav-links {
  display: flex;
  gap: var(--spacing-100);
}

.cvm-saved__nav-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--spacing-25);
}

.cvm-saved__layout,
.cvm-saved__edit {
  flex-shrink: 0;
}

.cvm-saved__nav-link {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-progressive);
  text-decoration: none;
}

.cvm-saved__nav-link:hover {
  text-decoration: underline;
}

.cvm-saved__sort {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.cvm-saved__worklist-dialog-text {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.cvm-saved__worklist-toast {
  position: fixed;
  inset-inline: var(--spacing-100);
  bottom: var(--spacing-100);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75);
  padding: var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.cvm-saved__worklist-toast-icon {
  flex-shrink: 0;
  color: var(--color-success);
}

.cvm-saved__worklist-toast-message {
  flex: 1 1 auto;
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.cvm-saved__worklist-toast-link {
  display: inline-block;
  margin-top: var(--spacing-25);
  color: var(--color-progressive);
  text-decoration: none;
}

.cvm-saved__worklist-toast-link:hover {
  text-decoration: underline;
}

.cvm-saved__worklist-toast-close {
  flex-shrink: 0;
  margin: calc(-1 * var(--spacing-25)) calc(-1 * var(--spacing-25)) 0 0;
}

.cvm-saved__empty {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.cvm-saved__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: var(--border-width-base) solid var(--border-color-subtle);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.cvm-saved__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  padding: var(--spacing-75) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.cvm-saved__row:last-child {
  border-bottom: none;
}

.cvm-saved__row-thumb {
  flex-shrink: 0;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.cvm-saved__row-thumb:deep(.cdx-thumbnail) {
  display: flex;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.cvm-saved__row-thumb:deep(.cdx-thumbnail__image),
.cvm-saved__row-thumb:deep(.cdx-thumbnail__placeholder) {
  width: 4.5rem;
  height: 4.5rem;
  min-width: 0;
  min-height: 0;
  border: none;
  border-radius: 0;
  object-fit: cover;
}

.cvm-saved__row-thumb:deep(.cdx-thumbnail__placeholder__icon) {
  width: 1.5rem;
  height: 1.5rem;
}

.cvm-saved__row-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
}

.cvm-saved__row-title {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  text-decoration: none;
}

.cvm-saved__row-title:hover {
  text-decoration: underline;
}

.cvm-saved__row-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.cvm-saved__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  list-style: none;
  margin: 0;
  padding: 0;
}

.cvm-saved__card {
  display: flex;
  align-items: stretch;
  min-height: 6.5rem;
  padding: 0;
  border: var(--border-width-base) solid var(--border-color-subtle);
}

.cvm-saved__thumbnail {
  flex: 0 0 40%;
  width: 40%;
  max-width: 9.5rem;
  margin: 0;
  align-self: stretch;
}

.cvm-saved__thumbnail:deep(.cdx-thumbnail) {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 6.5rem;
  margin: 0;
}

.cvm-saved__thumbnail:deep(.cdx-thumbnail__image),
.cvm-saved__thumbnail:deep(.cdx-thumbnail__placeholder) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 6.5rem;
  border: none;
  border-radius: 0;
}

.cvm-saved__thumbnail:deep(.cdx-thumbnail__placeholder__icon) {
  width: 2rem;
  height: 2rem;
}

.cvm-saved__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--spacing-35);
  min-width: 0;
  padding: var(--spacing-100);
}

.cvm-saved__item-title {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
  text-decoration: none;
}

.cvm-saved__item-title:hover {
  text-decoration: underline;
}

.cvm-saved__item-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.cvm-saved__signals {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin-top: var(--spacing-35);
}

.cvm-saved__signal {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  min-width: 0;
}

.cvm-saved__signal-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.cvm-saved__signal-icon--views {
  color: var(--color-subtle);
}

.cvm-saved__signal-icon--suggestion {
  color: var(--color-progressive);
}

.cvm-saved__signal-icon--medium {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  color: var(--color-warning);
}

.cvm-saved__signal-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.cvm-saved__signal-text--suggestions {
  color: var(--color-base);
}

.cvm-saved__suggestion-text {
  color: var(--color-progressive);
}

.cvm-saved__suggestion-sep {
  color: var(--color-base);
}

.cvm-saved__signal--high .cvm-saved__signal-icon,
.cvm-saved__signal--high .cvm-saved__signal-text--quality {
  color: var(--color-success);
}

.cvm-saved__signal--medium .cvm-saved__signal-text--quality {
  color: var(--color-warning);
}

.cvm-saved__signal--low .cvm-saved__signal-icon,
.cvm-saved__signal--low .cvm-saved__signal-text--quality {
  color: var(--color-destructive);
}
</style>
