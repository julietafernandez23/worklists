<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMenuButton,
  CdxMessage,
  CdxProgressBar,
  CdxSelect,
  CdxThumbnail,
} from '@wikimedia/codex'
import type { MenuButtonItemData, MenuItemData } from '@wikimedia/codex'
import {
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconChartLine,
  cdxIconEdit,
  cdxIconImage,
  cdxIconLayout,
  cdxIconLightbulb,
  cdxIconShare,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import {
  addArticlesToWorklist,
  EVENT_WORKLIST_OPTIONS,
  getEventWorklistOption,
  getEventWorklistRoute,
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

const showExportDialog = ref(false)
const exportDialogPending = ref(false)
/** Dialog-only draft — mirrors filter-dialog draft fields in worklist-cards-v2. */
const draftEventId = ref<string | null>(null)

const eventMenuItems: MenuItemData[] = EVENT_WORKLIST_OPTIONS.map((event) => ({
  value: event.id,
  label: event.label,
}))

const exportToast = ref<{
  eventId: string
  eventLabel: string
  eventRoute: string | null
  addedCount: number
  skippedCount: number
} | null>(null)

const collectionMenuItems: MenuButtonItemData[] = [
  { value: 'rename', label: 'Rename collection' },
  { value: 'delete', label: 'Delete collection', action: 'destructive' },
]

const hasArticlesToExport = computed(() => {
  if (articles.value.length > 0) return true
  return getCollectionArticles(collectionName.value).length > 0
})

const exportSubmitDisabled = computed(
  () =>
    exportDialogPending.value
    || draftEventId.value == null
    || !hasArticlesToExport.value,
)

const exportToastLink = computed(() => {
  if (!exportToast.value?.eventRoute) return null
  return {
    path: exportToast.value.eventRoute,
    query: { event: exportToast.value.eventId },
  }
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

function openExportDialog() {
  draftEventId.value = null
  showExportDialog.value = true
}

function onDraftEventSelected(eventId: string | null) {
  draftEventId.value = eventId
}

function closeExportDialog() {
  showExportDialog.value = false
}

function exportArticleTitles(): string[] {
  if (articles.value.length > 0) {
    return articles.value.map((article) => article.title)
  }
  return getCollectionArticles(collectionName.value)
}

async function confirmExport() {
  const titles = exportArticleTitles()
  const eventId = draftEventId.value
  if (!titles.length || !eventId) return

  exportDialogPending.value = true
  await new Promise((resolve) => setTimeout(resolve, 350))
  const event = getEventWorklistOption(eventId)
  const { added, skipped } = addArticlesToWorklist(titles, eventId)
  exportDialogPending.value = false
  showExportDialog.value = false
  exportToast.value = {
    eventId,
    eventLabel: event?.label ?? 'Event worklist',
    eventRoute: getEventWorklistRoute(eventId),
    addedCount: added.length,
    skippedCount: skipped.length,
  }
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
          <CdxButton
            v-if="isOwner"
            class="cvm-saved__export"
            weight="quiet"
            :icon-only="true"
            aria-label="Export to event worklist"
            @click="openExportDialog"
          >
            <CdxIcon :icon="cdxIconShare" />
          </CdxButton>
          <CdxMenuButton
            v-if="isOwner"
            v-model:selected="collectionMenuAction"
            class="cvm-saved__edit"
            weight="quiet"
            :menu-items="collectionMenuItems"
            :menu-config="{ placement: 'bottom-end' }"
            aria-label="Edit collection"
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

    <CdxMessage
      v-if="exportToast"
      type="success"
      :allow-user-dismiss="true"
      class="cvm-saved__export-message"
      @user-dismissed="exportToast = null"
    >
      <template v-if="!exportToast.addedCount">
        {{ exportToast.skippedCount === 1 ? 'That article is already on the' : 'Those articles are already on the' }}
        <RouterLink
          v-if="exportToastLink"
          :to="exportToastLink"
          class="cvm-saved__export-message-link"
        >{{ exportToast.eventLabel }}</RouterLink>
        <span v-else>{{ exportToast.eventLabel }}</span>
        worklist.
      </template>
      <template v-else>
        {{ exportToast.addedCount }}
        {{ exportToast.addedCount === 1 ? 'article has' : 'articles have' }}
        been exported to
        <RouterLink
          v-if="exportToastLink"
          :to="exportToastLink"
          class="cvm-saved__export-message-link"
        >{{ exportToast.eventLabel }}</RouterLink>
        <span v-else>{{ exportToast.eventLabel }}</span>.
        <template v-if="exportToast.skippedCount">
          ({{ exportToast.skippedCount }} skipped)
        </template>
      </template>
    </CdxMessage>

    <CdxDialog
      v-model:open="showExportDialog"
      title="Export to event worklist"
      close-button-label="Close"
      :dismissable="!exportDialogPending"
      @update:open="(open) => { if (!open) closeExportDialog() }"
    >
      <CdxField>
        <template #label>Event</template>
        <CdxSelect
          :selected="draftEventId"
          :menu-items="eventMenuItems"
          default-label="Choose an event"
          @update:selected="onDraftEventSelected"
        />
      </CdxField>

      <template #footer>
        <CdxButton
          :key="draftEventId ?? 'none'"
          class="cvm-saved__export-dialog-submit"
          action="progressive"
          weight="primary"
          :disabled="exportSubmitDisabled"
          @click="confirmExport"
        >
          {{ exportDialogPending ? 'Exporting…' : 'Export' }}
        </CdxButton>
      </template>
    </CdxDialog>
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
.cvm-saved__export,
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

.cvm-saved__export-dialog-submit {
  display: block;
  width: 100%;
}

.cvm-saved__export-dialog-submit:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.cvm-saved__export-message {
  position: fixed;
  inset-inline: var(--spacing-100);
  bottom: var(--spacing-100);
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.cvm-saved__export-message-link {
  color: var(--color-progressive);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.cvm-saved__export-message-link:hover {
  text-decoration: underline;
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
