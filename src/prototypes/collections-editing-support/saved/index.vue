<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CdxButton,
  CdxCheckbox,
  CdxDialog,
  CdxIcon,
  CdxMenuButton,
  CdxMessage,
  CdxProgressBar,
  CdxRadio,
  CdxThumbnail,
} from '@wikimedia/codex'
import type { MenuButtonItemData } from '@wikimedia/codex'
import {
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconCalendar,
  cdxIconChartLine,
  cdxIconClock,
  cdxIconClose,
  cdxIconEdit,
  cdxIconImage,
  cdxIconLayout,
  cdxIconLightbulb,
  cdxIconListBullet,
  cdxIconShare,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import {
  getCollectionArticles,
  getCollectionVisibility,
  saveCollectionVisibility,
  type CollectionVisibility,
} from '../saved-items'

definePage({
  meta: {
    title: 'Saved collection',
    description: 'View articles saved to a collection.',
  },
})

type CollectionView = 'grid' | 'list'

type Quality = 'low' | 'medium' | 'high'

interface DataOptions {
  views: boolean
  quality: boolean
  suggestions: boolean
  daysSinceEdit: boolean
  dateAdded: boolean
}

interface SavedArticle {
  title: string
  description: string
  url: string
  thumbnail: { url: string; width: number; height: number } | null
  viewsPerMonth: string
  quality: Quality
  suggestions: string[]
  daysSinceLastEdit: string
  dateAdded: string
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
const DAYS_SINCE_EDIT = [2, 14, 45, 7, 30, 1, 90]

const route = useRoute()
const router = useRouter()
const { user } = useConfig()

const collectionName = computed(() => {
  const value = route.query.collection
  return typeof value === 'string' && value.trim() ? value.trim() : 'Saved items'
})

const isOwner = computed(() => user.value !== 'logged-out')

const articles = ref<SavedArticle[]>([])
const loading = ref(true)
const collectionView = ref<CollectionView>('grid')
const collectionMenuAction = ref<string | null>(null)
const showDataDialog = ref(false)

const visibility = ref<CollectionVisibility>('private')
const showVisibilitySheet = ref(false)
const showShareSheet = ref(false)
const draftVisibility = ref<CollectionVisibility>('private')
const visibilitySaving = ref(false)
const visibilityError = ref<string | null>(null)
const linkCopied = ref(false)

const shareLink = computed(() => {
  const resolved = router.resolve({
    path: '/collections-editing-support/public',
    query: { collection: collectionName.value },
  })
  if (typeof window === 'undefined') return resolved.href
  return new URL(resolved.href, window.location.origin).href
})

const shareButtonLabel = 'Share collection'

const copyLinkLabel = computed(() =>
  linkCopied.value ? 'Link copied' : 'Copy link',
)

const layoutToggleIcon = computed(() =>
  collectionView.value === 'grid' ? cdxIconListBullet : cdxIconLayout,
)

const layoutToggleLabel = computed(() =>
  collectionView.value === 'grid' ? 'Switch to list view' : 'Switch to grid view',
)

function toggleCollectionView() {
  collectionView.value = collectionView.value === 'grid' ? 'list' : 'grid'
}

const DEFAULT_DATA_OPTIONS: DataOptions = {
  views: false,
  quality: false,
  suggestions: false,
  daysSinceEdit: false,
  dateAdded: false,
}

const dataOptions = ref<DataOptions>({ ...DEFAULT_DATA_OPTIONS })

const draftDataOptions = ref<DataOptions>({ ...DEFAULT_DATA_OPTIONS })

const collectionMenuItems: MenuButtonItemData[] = [
  { value: 'customize-data', label: 'Customize data' },
  { value: 'rename', label: 'Rename collection' },
  { value: 'visibility', label: 'Edit visibility' },
  { value: 'delete', label: 'Delete collection', action: 'destructive' },
]

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k views last month`
}

function qualityLabel(quality: Quality): string {
  return `${quality.charAt(0).toUpperCase()}${quality.slice(1)} quality`
}

function fakeDateAdded(index: number): string {
  const d = new Date('2026-07-10')
  d.setDate(d.getDate() - index * 3)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return `Added ${month} ${d.getDate()}, ${d.getFullYear()}`
}

function fakeDaysSinceEdit(index: number): string {
  const days = DAYS_SINCE_EDIT[index % DAYS_SINCE_EDIT.length]
  if (days === 1) return 'Edited yesterday'
  if (days < 7) return `Edited ${days} days ago`
  if (days < 30) return `Edited ${Math.floor(days / 7)} weeks ago`
  return `Edited ${Math.floor(days / 30)} months ago`
}

function openDataDialog() {
  draftDataOptions.value = { ...dataOptions.value }
  showDataDialog.value = true
}

function applyDataOptions() {
  dataOptions.value = { ...draftDataOptions.value }
  showDataDialog.value = false
}

function cancelDataOptions() {
  showDataDialog.value = false
}

function onCollectionMenuAction(action: string | null) {
  if (!action) return
  if (action === 'customize-data') {
    openDataDialog()
  } else if (action === 'visibility') {
    openVisibilitySheet()
  }
  collectionMenuAction.value = null
}

function loadVisibility() {
  visibility.value = getCollectionVisibility(collectionName.value)
}

function openVisibilitySheet() {
  draftVisibility.value = visibility.value
  visibilityError.value = null
  showVisibilitySheet.value = true
}

function closeVisibilitySheet() {
  showVisibilitySheet.value = false
  draftVisibility.value = visibility.value
  visibilityError.value = null
}

async function saveVisibility() {
  visibilitySaving.value = true
  visibilityError.value = null
  try {
    await saveCollectionVisibility(collectionName.value, draftVisibility.value)
    visibility.value = draftVisibility.value
    if (visibility.value === 'private') {
      linkCopied.value = false
    }
    closeVisibilitySheet()
  } catch {
    visibilityError.value = 'Could not save visibility. Please try again.'
  } finally {
    visibilitySaving.value = false
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    linkCopied.value = true
  } catch {
    linkCopied.value = false
  }
}

function openShareSheet() {
  linkCopied.value = false
  showShareSheet.value = true
}

function closeShareSheet() {
  showShareSheet.value = false
  linkCopied.value = false
}

function hasVisibleSignals(options: DataOptions): boolean {
  return options.views
    || options.quality
    || options.suggestions
    || options.daysSinceEdit
    || options.dateAdded
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
      daysSinceLastEdit: fakeDaysSinceEdit(index),
      dateAdded: fakeDateAdded(index),
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
      daysSinceLastEdit: fakeDaysSinceEdit(index),
      dateAdded: fakeDateAdded(index),
    }
  }
}

async function loadArticles() {
  loading.value = true
  loadVisibility()
  const titles = getCollectionArticles(collectionName.value)
  articles.value = await Promise.all(titles.map((title, index) => fetchSavedArticle(title, index)))
  loading.value = false
}

onMounted(loadArticles)

watch(collectionName, loadArticles)
</script>

<template>
  <ChromeWrapper skin="mobile">
    <main class="ces-saved">
      <h1 class="ces-saved__title">
        Saved / {{ collectionName }}
      </h1>

      <nav class="ces-saved__nav" aria-label="Saved views">
        <div class="ces-saved__nav-links">
          <a href="#" class="ces-saved__nav-link">All items</a>
          <a href="#" class="ces-saved__nav-link">Collections</a>
        </div>
        <div class="ces-saved__nav-actions">
          <CdxButton
            v-if="isOwner && visibility === 'public'"
            class="ces-saved__share"
            weight="quiet"
            :icon-only="true"
            :aria-label="shareButtonLabel"
            @click="openShareSheet"
          >
            <CdxIcon :icon="cdxIconShare" />
          </CdxButton>
          <CdxButton
            class="ces-saved__layout"
            weight="quiet"
            :icon-only="true"
            :aria-label="layoutToggleLabel"
            @click="toggleCollectionView"
          >
            <CdxIcon :icon="layoutToggleIcon" />
          </CdxButton>
          <CdxMenuButton
            v-if="isOwner"
            v-model:selected="collectionMenuAction"
            class="ces-saved__edit"
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

      <p class="ces-saved__sort">Sorted by most recent</p>

      <CdxProgressBar v-if="loading" inline aria-label="Loading saved articles" />

      <p v-else-if="!articles.length" class="ces-saved__empty">
        No articles in this collection yet.
      </p>

      <ul
        v-else-if="collectionView === 'list'"
        class="ces-saved__rows"
        role="list"
      >
        <li v-for="article in articles" :key="article.title" class="ces-saved__row">
          <CdxThumbnail
            class="ces-saved__row-thumb"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="ces-saved__row-body">
            <a
              class="ces-saved__row-title"
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ article.title }}</a>
            <p v-if="article.description" class="ces-saved__row-description">
              {{ article.description }}
            </p>
          </div>
        </li>
      </ul>

      <ul v-else class="ces-saved__list" role="list">
        <li v-for="article in articles" :key="article.title" class="ces-saved__item">
          <CdxThumbnail
            class="ces-saved__thumbnail"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="ces-saved__item-body">
            <a
              class="ces-saved__item-title"
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ article.title }}</a>
            <p v-if="article.description" class="ces-saved__item-description">
              {{ article.description }}
            </p>

            <div
              v-if="hasVisibleSignals(dataOptions)"
              class="ces-saved__signals"
            >
              <div v-if="dataOptions.views" class="ces-saved__signal">
                <CdxIcon
                  :icon="cdxIconChartLine"
                  size="small"
                  class="ces-saved__signal-icon ces-saved__signal-icon--views"
                />
                <span class="ces-saved__signal-text">{{ article.viewsPerMonth }}</span>
              </div>

              <div v-if="dataOptions.suggestions" class="ces-saved__signal">
                <CdxIcon
                  :icon="cdxIconLightbulb"
                  size="small"
                  class="ces-saved__signal-icon ces-saved__signal-icon--suggestion"
                />
                <span class="ces-saved__signal-text ces-saved__signal-text--suggestions">
                  <template v-for="(suggestion, index) in article.suggestions" :key="suggestion">
                    <span v-if="index > 0" class="ces-saved__suggestion-sep">, </span>
                    <span class="ces-saved__suggestion-text">{{ suggestion }}</span>
                  </template>
                </span>
              </div>

              <div
                v-if="dataOptions.quality"
                class="ces-saved__signal ces-saved__signal--quality"
                :class="`ces-saved__signal--${article.quality}`"
              >
                <CdxIcon
                  v-if="article.quality === 'high'"
                  :icon="cdxIconArrowUp"
                  size="small"
                  class="ces-saved__signal-icon"
                />
                <CdxIcon
                  v-else-if="article.quality === 'low'"
                  :icon="cdxIconArrowDown"
                  size="small"
                  class="ces-saved__signal-icon"
                />
                <span v-else class="ces-saved__signal-icon ces-saved__signal-icon--medium" aria-hidden="true">—</span>
                <span class="ces-saved__signal-text ces-saved__signal-text--quality">
                  {{ qualityLabel(article.quality) }}
                </span>
              </div>

              <div v-if="dataOptions.daysSinceEdit" class="ces-saved__signal">
                <CdxIcon
                  :icon="cdxIconClock"
                  size="small"
                  class="ces-saved__signal-icon ces-saved__signal-icon--views"
                />
                <span class="ces-saved__signal-text">{{ article.daysSinceLastEdit }}</span>
              </div>

              <div v-if="dataOptions.dateAdded" class="ces-saved__signal">
                <CdxIcon
                  :icon="cdxIconCalendar"
                  size="small"
                  class="ces-saved__signal-icon ces-saved__signal-icon--views"
                />
                <span class="ces-saved__signal-text">{{ article.dateAdded }}</span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <CdxDialog
      v-model:open="showDataDialog"
      title="Customize data"
      close-button-label="Close"
      class="ces-saved__data-dialog"
      :dismissable="true"
    >
      <div class="ces-saved__data-options">
        <CdxCheckbox v-model="draftDataOptions.views" inline class="ces-saved__data-option">
          Views per month
        </CdxCheckbox>
        <CdxCheckbox v-model="draftDataOptions.quality" inline class="ces-saved__data-option">
          Article quality
        </CdxCheckbox>
        <CdxCheckbox v-model="draftDataOptions.suggestions" inline class="ces-saved__data-option">
          Suggested edits
        </CdxCheckbox>
        <CdxCheckbox v-model="draftDataOptions.daysSinceEdit" inline class="ces-saved__data-option">
          Days since last edit
        </CdxCheckbox>
        <CdxCheckbox v-model="draftDataOptions.dateAdded" inline class="ces-saved__data-option">
          Date added
        </CdxCheckbox>
      </div>

      <template #footer>
        <div class="ces-saved__data-dialog-footer">
          <CdxButton
            class="ces-saved__data-dialog-done"
            action="progressive"
            weight="primary"
            @click="applyDataOptions"
          >
            Done
          </CdxButton>
          <CdxButton
            class="ces-saved__data-dialog-cancel"
            weight="normal"
            @click="cancelDataOptions"
          >
            Cancel
          </CdxButton>
        </div>
      </template>
    </CdxDialog>

    <Transition name="ces-sheet">
      <div
        v-if="showVisibilitySheet"
        class="ces-saved__sheet-backdrop"
        @click.self="closeVisibilitySheet"
      >
        <div
          class="ces-saved__sheet"
          role="dialog"
          aria-labelledby="ces-visibility-title"
        >
          <div class="ces-saved__sheet-header">
            <h2 id="ces-visibility-title" class="ces-saved__sheet-title">
              Edit visibility
            </h2>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Close"
              @click="closeVisibilitySheet"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>

          <fieldset class="ces-saved__visibility-options">
            <legend class="ces-saved__visibility-legend">Collection visibility</legend>

            <div class="ces-saved__visibility-option">
              <CdxRadio v-model="draftVisibility" input-value="private">
                Private
              </CdxRadio>
              <p class="ces-saved__visibility-desc">
                Only you can see this collection.
              </p>
            </div>

            <div class="ces-saved__visibility-option">
              <CdxRadio v-model="draftVisibility" input-value="public">
                Public
              </CdxRadio>
              <p class="ces-saved__visibility-desc">
                Anyone can find your collection through search. You can share your
                collection with others.
              </p>
            </div>
          </fieldset>

          <CdxMessage
            v-if="visibilityError"
            type="error"
            class="ces-saved__sheet-error"
          >
            {{ visibilityError }}
          </CdxMessage>

          <CdxButton
            class="ces-saved__sheet-save"
            weight="primary"
            action="progressive"
            :disabled="visibilitySaving"
            @click="saveVisibility"
          >
            Save
          </CdxButton>
        </div>
      </div>
    </Transition>

    <Transition name="ces-sheet">
      <div
        v-if="showShareSheet"
        class="ces-saved__sheet-backdrop"
        @click.self="closeShareSheet"
      >
        <div
          class="ces-saved__sheet"
          role="dialog"
          aria-labelledby="ces-share-title"
        >
          <div class="ces-saved__sheet-header">
            <h2 id="ces-share-title" class="ces-saved__sheet-title">
              Share collection
            </h2>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Close"
              @click="closeShareSheet"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>

          <a class="ces-saved__share-link" :href="shareLink">{{ shareLink }}</a>

          <CdxButton
            class="ces-saved__sheet-save"
            weight="primary"
            action="progressive"
            @click="copyShareLink"
          >
            {{ copyLinkLabel }}
          </CdxButton>
        </div>
      </div>
    </Transition>
  </ChromeWrapper>
</template>

<style scoped>
.ces-saved {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-200);
}

.ces-saved__title {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.ces-saved__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100);
  margin-bottom: var(--spacing-100);
}

.ces-saved__nav-links {
  display: flex;
  gap: var(--spacing-100);
}

.ces-saved__nav-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--spacing-25);
}

.ces-saved__layout,
.ces-saved__edit,
.ces-saved__share {
  flex-shrink: 0;
}

.ces-saved__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.ces-saved__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  padding: var(--spacing-75) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.ces-saved__row:last-child {
  border-bottom: none;
}

.ces-saved__row-thumb {
  flex-shrink: 0;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.ces-saved__row-thumb:deep(.cdx-thumbnail) {
  display: flex;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.ces-saved__row-thumb:deep(.cdx-thumbnail__image),
.ces-saved__row-thumb:deep(.cdx-thumbnail__placeholder) {
  width: 4.5rem;
  height: 4.5rem;
  min-width: 0;
  min-height: 0;
  border: none;
  border-radius: var(--border-radius-base);
}

.ces-saved__row-thumb:deep(.cdx-thumbnail__placeholder__icon) {
  width: 1.5rem;
  height: 1.5rem;
}

.ces-saved__row-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
}

.ces-saved__row-title {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  text-decoration: none;
}

.ces-saved__row-title:hover {
  text-decoration: underline;
}

.ces-saved__row-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.ces-saved__sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background-color: rgba(0, 0, 0, 0.45);
}

.ces-saved__sheet {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  width: 100%;
  max-height: 85vh;
  padding: var(--spacing-100);
  border-radius: var(--border-radius-base) var(--border-radius-base) 0 0;
  background-color: var(--background-color-base);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
}

.ces-saved__sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100);
}

.ces-saved__sheet-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.ces-saved__visibility-options {
  margin: 0;
  padding: 0;
  border: none;
}

.ces-saved__visibility-legend {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ces-saved__visibility-option + .ces-saved__visibility-option {
  margin-top: var(--spacing-100);
}

.ces-saved__visibility-desc {
  margin: var(--spacing-25) 0 0 calc(var(--spacing-100) + var(--spacing-50));
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.ces-saved__sheet-error {
  margin: 0;
}

.ces-saved__sheet-save:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.ces-saved__share-link {
  display: block;
  margin: 0;
  padding: var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-progressive);
  text-decoration: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ces-sheet-enter-active,
.ces-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.ces-sheet-enter-active .ces-saved__sheet,
.ces-sheet-leave-active .ces-saved__sheet {
  transition: transform 0.2s ease;
}

.ces-sheet-enter-from,
.ces-sheet-leave-to {
  opacity: 0;
}

.ces-sheet-enter-from .ces-saved__sheet,
.ces-sheet-leave-to .ces-saved__sheet {
  transform: translateY(100%);
}

.ces-saved__nav-link {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-progressive);
  text-decoration: none;
}

.ces-saved__nav-link:hover {
  text-decoration: underline;
}

.ces-saved__sort {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.ces-saved__empty {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.ces-saved__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  list-style: none;
  margin: 0;
  padding: 0;
}

.ces-saved__item {
  display: flex;
  align-items: stretch;
  min-height: 6.5rem;
  padding: 0;
  border: var(--border-width-base) solid var(--border-color-subtle);
}

.ces-saved__thumbnail {
  flex: 0 0 40%;
  width: 40%;
  max-width: 9.5rem;
  margin: 0;
  align-self: stretch;
}

.ces-saved__thumbnail:deep(.cdx-thumbnail) {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 6.5rem;
  margin: 0;
}

.ces-saved__thumbnail:deep(.cdx-thumbnail__image),
.ces-saved__thumbnail:deep(.cdx-thumbnail__placeholder) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 6.5rem;
  border: none;
  border-radius: 0;
}

.ces-saved__thumbnail:deep(.cdx-thumbnail__placeholder__icon) {
  width: 2rem;
  height: 2rem;
}

.ces-saved__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--spacing-35);
  min-width: 0;
  padding: var(--spacing-100);
}

.ces-saved__item-title {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
  text-decoration: none;
}

.ces-saved__item-title:hover {
  text-decoration: underline;
}

.ces-saved__item-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.ces-saved__signals {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin-top: var(--spacing-35);
}

.ces-saved__signal {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  min-width: 0;
}

.ces-saved__signal-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.ces-saved__signal-icon--views {
  color: var(--color-subtle);
}

.ces-saved__signal-icon--suggestion {
  color: var(--color-progressive);
}

.ces-saved__signal-icon--medium {
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

.ces-saved__signal-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.ces-saved__signal-text--suggestions {
  color: var(--color-base);
}

.ces-saved__suggestion-text {
  color: var(--color-progressive);
}

.ces-saved__suggestion-sep {
  color: var(--color-base);
}

.ces-saved__signal--high .ces-saved__signal-icon,
.ces-saved__signal--high .ces-saved__signal-text--quality {
  color: var(--color-success);
}

.ces-saved__signal--medium .ces-saved__signal-text--quality {
  color: var(--color-warning);
}

.ces-saved__signal--low .ces-saved__signal-icon,
.ces-saved__signal--low .ces-saved__signal-text--quality {
  color: var(--color-destructive);
}

.ces-saved__data-dialog:deep(.cdx-dialog__body) {
  padding-top: var(--spacing-50);
}

.ces-saved__data-dialog:deep(.cdx-dialog__footer) {
  padding-top: var(--spacing-100);
  border-top: none;
}

.ces-saved__data-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.ces-saved__data-option {
  display: block;
}

.ces-saved__data-option:deep(.cdx-checkbox) {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  min-height: 0;
}

.ces-saved__data-option:deep(.cdx-label) {
  margin: 0;
}

.ces-saved__data-option:deep(.cdx-label__label) {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.ces-saved__data-dialog-footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  width: 100%;
}

.ces-saved__data-dialog-done,
.ces-saved__data-dialog-cancel {
  width: 100%;
}

.ces-saved__data-dialog-done:deep(.cdx-button),
.ces-saved__data-dialog-cancel:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}
</style>
