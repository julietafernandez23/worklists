<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CdxButton,
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
  cdxIconChartLine,
  cdxIconClose,
  cdxIconEdit,
  cdxIconImage,
  cdxIconLayout,
  cdxIconLightbulb,
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

const visibility = ref<CollectionVisibility>('private')
const showVisibilitySheet = ref(false)
const showShareSheet = ref(false)
const draftVisibility = ref<CollectionVisibility>('private')
const visibilitySaving = ref(false)
const visibilityError = ref<string | null>(null)
const linkCopied = ref(false)

const shareLink = computed(() => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set('collection', collectionName.value)
  return url.toString()
})

const shareButtonLabel = 'Share collection'

const copyLinkLabel = computed(() =>
  linkCopied.value ? 'Link copied' : 'Copy link',
)

const collectionMenuItems = computed<MenuButtonItemData[]>(() => {
  const items: MenuButtonItemData[] = [
    { value: 'rename', label: 'Rename collection' },
    { value: 'visibility', label: 'Edit visibility' },
    { value: 'delete', label: 'Delete collection', action: 'destructive' },
  ]
  return items
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
  if (action === 'visibility') {
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
          <CdxButton
            v-if="isOwner && visibility === 'public'"
            class="cvm-saved__share"
            weight="quiet"
            :icon-only="true"
            :aria-label="shareButtonLabel"
            @click="openShareSheet"
          >
            <CdxIcon :icon="cdxIconShare" />
          </CdxButton>
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

    <Transition name="cvm-sheet">
      <div
        v-if="showVisibilitySheet"
        class="cvm-saved__sheet-backdrop"
        @click.self="closeVisibilitySheet"
      >
        <div
          class="cvm-saved__sheet"
          role="dialog"
          aria-labelledby="cvm-visibility-title"
        >
          <div class="cvm-saved__sheet-header">
            <h2 id="cvm-visibility-title" class="cvm-saved__sheet-title">
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

          <fieldset class="cvm-saved__visibility-options">
            <legend class="cvm-saved__visibility-legend">Collection visibility</legend>

            <div class="cvm-saved__visibility-option">
              <CdxRadio v-model="draftVisibility" input-value="private">
                Private
              </CdxRadio>
              <p class="cvm-saved__visibility-desc">
                Only you can see this collection.
              </p>
            </div>

            <div class="cvm-saved__visibility-option">
              <CdxRadio v-model="draftVisibility" input-value="public">
                Public
              </CdxRadio>
              <p class="cvm-saved__visibility-desc">
                Anyone can find your collection through search. You can share your
                collection with others.
              </p>
            </div>
          </fieldset>

          <CdxMessage
            v-if="visibilityError"
            type="error"
            class="cvm-saved__sheet-error"
          >
            {{ visibilityError }}
          </CdxMessage>

          <CdxButton
            class="cvm-saved__sheet-save"
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

    <Transition name="cvm-sheet">
      <div
        v-if="showShareSheet"
        class="cvm-saved__sheet-backdrop"
        @click.self="closeShareSheet"
      >
        <div
          class="cvm-saved__sheet"
          role="dialog"
          aria-labelledby="cvm-share-title"
        >
          <div class="cvm-saved__sheet-header">
            <h2 id="cvm-share-title" class="cvm-saved__sheet-title">
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

          <p class="cvm-saved__share-link">{{ shareLink }}</p>

          <CdxButton
            class="cvm-saved__sheet-save"
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
.cvm-saved__edit,
.cvm-saved__share {
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

.cvm-saved__sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background-color: rgba(0, 0, 0, 0.45);
}

.cvm-saved__sheet {
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

.cvm-saved__sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100);
}

.cvm-saved__sheet-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.cvm-saved__visibility-options {
  margin: 0;
  padding: 0;
  border: none;
}

.cvm-saved__visibility-legend {
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

.cvm-saved__visibility-option + .cvm-saved__visibility-option {
  margin-top: var(--spacing-100);
}

.cvm-saved__visibility-desc {
  margin: var(--spacing-25) 0 0 calc(var(--spacing-100) + var(--spacing-50));
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.cvm-saved__sheet-error {
  margin: 0;
}

.cvm-saved__sheet-save:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.cvm-saved__share-link {
  margin: 0;
  padding: var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.cvm-sheet-enter-active,
.cvm-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.cvm-sheet-enter-active .cvm-saved__sheet,
.cvm-sheet-leave-active .cvm-saved__sheet {
  transition: transform 0.2s ease;
}

.cvm-sheet-enter-from,
.cvm-sheet-leave-to {
  opacity: 0;
}

.cvm-sheet-enter-from .cvm-saved__sheet,
.cvm-sheet-leave-to .cvm-saved__sheet {
  transform: translateY(100%);
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
