<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CdxButton, CdxMessage, CdxProgressBar, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'
import MmeExplorationChrome from '../MmeExplorationChrome.vue'
import type { MmeExplorationId } from '../explorations'
import CollectionArticleTitleRow from './CollectionArticleTitleRow.vue'
import CollectionEditingSignals from './CollectionEditingSignals.vue'
import CollectionReminderPromptSheet from './CollectionReminderPromptSheet.vue'
import CollectionSetStatusSheet, {
  type CollectionTaskStatus,
} from './CollectionSetStatusSheet.vue'
import CollectionSettingsMenu, { type CollectionViewMode } from './CollectionSettingsMenu.vue'
import CollectionSinceLastVisit from './CollectionSinceLastVisit.vue'
import CollectionCompletionImpact from './CollectionCompletionImpact.vue'
import {
  clearReminderPromptForDemo,
  hasCompletedReminderPrompt,
  saveReminderPromptResult,
  type CollectionReminderPreferences,
} from './mme-collection-reminder-pref'
import { fetchPublicCollectionArticle } from '@/prototypes/collections-view-modes/article-cards'
import {
  demoQualityScore,
  fakeSuggestions,
  viewsCountForIndex,
} from '@/lib/worklist-card-signals'

export type CollectionImpactDisplay = {
  done: number
  total: number
  monthlyReads: number
}

const props = defineProps<{
  activeExplorationId: MmeExplorationId
  promptRemindersOnStatus?: boolean
  showSinceLastVisit?: boolean
  celebrateAllDone?: boolean
  impactDisplay?: CollectionImpactDisplay
}>()

const COLLECTION_NAME = 'Animals who made history'

const ARTICLE_TITLES = [
  'Blue-gray tanager',
  'Laika',
  'Hachikō',
  'Dolly (sheep)',
]

interface CollectionArticle {
  title: string
  description: string
  url: string
  thumbnail: { url: string; width: number; height: number } | null
  viewsCount: number
  qualityScore: number
  suggestions: string[]
  taskStatus: CollectionTaskStatus
}

const TASK_STATUS_LABEL: Record<CollectionTaskStatus, string> = {
  'not-started': 'Not started',
  'working-on-it': 'Working on it',
  done: 'Done',
}

const articles = ref<CollectionArticle[]>([])
const loading = ref(true)
const editingMode = ref(false)
const collectionView = ref<CollectionViewMode>('grid')
const statusSheetOpen = ref(false)
const statusSheetArticle = ref<CollectionArticle | null>(null)
const reminderSheetOpen = ref(false)
const reminderSavedMessage = ref<string | null>(null)
const reminderPromptCompleted = ref(hasCompletedReminderPrompt())

function openStatusSheet(article: CollectionArticle) {
  statusSheetArticle.value = article
  statusSheetOpen.value = true
}

const REMINDER_SHEET_OPEN_DELAY_MS = 400

function maybeOpenReminderPrompt() {
  if (!props.promptRemindersOnStatus) return
  if (reminderPromptCompleted.value) return
  // Wait for the status sheet to close and avoid the Save click hitting this backdrop.
  window.setTimeout(() => {
    if (reminderPromptCompleted.value) return
    reminderSheetOpen.value = true
  }, REMINDER_SHEET_OPEN_DELAY_MS)
}

function saveTaskStatus(status: CollectionTaskStatus) {
  const article = statusSheetArticle.value
  if (!article) return
  const row = articles.value.find(item => item.title === article.title)
  if (row) row.taskStatus = status
  maybeOpenReminderPrompt()
}

function onReminderComplete(prefs: CollectionReminderPreferences) {
  saveReminderPromptResult(prefs)
  reminderPromptCompleted.value = true
  if (prefs.enabled) {
    const channels =
      prefs.delivery === 'both'
        ? 'notifications and email'
        : prefs.delivery
    reminderSavedMessage.value = `Reminders saved — we’ll reach you via ${channels}.`
  } else {
    reminderSavedMessage.value = null
  }
}

function resetReminderPromptDemo() {
  clearReminderPromptForDemo()
  reminderPromptCompleted.value = false
  reminderSavedMessage.value = null
}

async function loadArticles() {
  loading.value = true
  const loaded = await Promise.all(
    ARTICLE_TITLES.map(async (title, index) => {
      const summary = await fetchPublicCollectionArticle(title)
      const wikiTitle = title.replace(/ /g, '_')
      return {
        title: summary.title,
        description: summary.description,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
        thumbnail: summary.thumbnail,
        viewsCount: viewsCountForIndex(index),
        qualityScore: demoQualityScore(index),
        suggestions: fakeSuggestions(index),
        taskStatus: (props.celebrateAllDone ? 'done' : 'not-started') as CollectionTaskStatus,
      }
    }),
  )
  articles.value = loaded
  loading.value = false
}

const impactStats = computed((): CollectionImpactDisplay => {
  if (props.impactDisplay) return props.impactDisplay
  const total = articles.value.length
  const done = articles.value.filter(article => article.taskStatus === 'done').length
  const monthlyReads = articles.value.reduce(
    (sum, article) => sum + article.viewsCount * 1000,
    0,
  )
  return { done, total, monthlyReads }
})

onMounted(loadArticles)
</script>

<template>
  <MmeExplorationChrome :active-exploration-id="activeExplorationId">
    <main class="mme-collection">
      <h1 class="mme-collection__title">
        Saved / {{ COLLECTION_NAME }}
      </h1>

      <CdxMessage
        v-if="reminderSavedMessage"
        type="success"
        class="mme-collection__reminder-confirmation"
      >
        {{ reminderSavedMessage }}
      </CdxMessage>

      <div class="mme-collection__nav">
        <CollectionSettingsMenu
          v-model:collection-view="collectionView"
          v-model:editing-mode="editingMode"
        />
      </div>

      <p v-if="!celebrateAllDone" class="mme-collection__sort">Sorted by most recent</p>
      <p v-else-if="!loading" class="mme-collection__sort mme-collection__sort--complete">
        All articles marked done
      </p>

      <CollectionCompletionImpact
        v-if="celebrateAllDone && !loading"
        :collection-name="COLLECTION_NAME"
        :done-count="impactStats.done"
        :total-count="impactStats.total"
        :monthly-reads="impactStats.monthlyReads"
      />

      <CollectionSinceLastVisit
        v-if="showSinceLastVisit && !loading"
        :articles="articles"
      />

      <CdxProgressBar v-if="loading" inline aria-label="Loading collection" />

      <ul
        v-else-if="collectionView === 'list'"
        class="mme-collection__list"
        role="list"
      >
        <li v-for="article in articles" :key="article.title" class="mme-collection__row">
          <CdxThumbnail
            class="mme-collection__row-thumb"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="mme-collection__row-body">
            <CollectionArticleTitleRow
              list-layout
              :title="article.title"
              :url="article.url"
              @set-status="openStatusSheet(article)"
            />
            <p
              v-if="article.taskStatus !== 'not-started'"
              class="mme-collection__task-status"
            >
              {{ TASK_STATUS_LABEL[article.taskStatus] }}
            </p>
            <p v-if="article.description" class="mme-collection__item-description">
              {{ article.description }}
            </p>
            <CollectionEditingSignals v-if="editingMode" :article="article" />
          </div>
        </li>
      </ul>

      <ul v-else class="mme-collection__grid" role="list">
        <li v-for="article in articles" :key="article.title" class="mme-collection__card">
          <CdxThumbnail
            class="mme-collection__thumb"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="mme-collection__body">
            <CollectionArticleTitleRow
              :title="article.title"
              :url="article.url"
              @set-status="openStatusSheet(article)"
            />
            <p
              v-if="article.taskStatus !== 'not-started'"
              class="mme-collection__task-status"
            >
              {{ TASK_STATUS_LABEL[article.taskStatus] }}
            </p>
            <p v-if="article.description" class="mme-collection__item-description">
              {{ article.description }}
            </p>
            <CollectionEditingSignals v-if="editingMode" :article="article" />
          </div>
        </li>
      </ul>

      <CdxButton
        v-if="promptRemindersOnStatus && reminderPromptCompleted"
        class="mme-collection__reset-prompt"
        weight="quiet"
        size="small"
        @click="resetReminderPromptDemo"
      >
        Reset reminder prompt (demo)
      </CdxButton>
    </main>

    <CollectionSetStatusSheet
      v-if="statusSheetArticle"
      v-model:open="statusSheetOpen"
      :article-title="statusSheetArticle.title"
      :status="statusSheetArticle.taskStatus"
      @save="saveTaskStatus"
    />

    <CollectionReminderPromptSheet
      v-if="promptRemindersOnStatus"
      v-model:open="reminderSheetOpen"
      @complete="onReminderComplete"
    />
  </MmeExplorationChrome>
</template>

<style scoped>
.mme-collection {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-200);
}

.mme-collection__title {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.mme-collection__reminder-confirmation {
  margin-bottom: var(--spacing-100);
}

.mme-collection__nav {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-50);
}

.mme-collection__sort {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.mme-collection__sort--complete {
  color: var(--color-success, #14866d);
  font-weight: var(--font-weight-bold);
}

.mme-collection__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: var(--border-width-base) solid var(--border-color-subtle);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.mme-collection__row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75);
  padding: var(--spacing-75) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.mme-collection__row:last-child {
  border-bottom: none;
}

.mme-collection__row-thumb {
  flex-shrink: 0;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.mme-collection__row-thumb:deep(.cdx-thumbnail) {
  width: 4.5rem;
  height: 4.5rem;
  margin: 0;
}

.mme-collection__row-thumb:deep(.cdx-thumbnail__image),
.mme-collection__row-thumb:deep(.cdx-thumbnail__placeholder) {
  width: 4.5rem;
  height: 4.5rem;
  border: none;
  border-radius: 0;
  object-fit: cover;
}

.mme-collection__row-body {
  flex: 1 1 auto;
  min-width: 0;
}

.mme-collection__task-status {
  margin: var(--spacing-25) 0 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-progressive);
}

.mme-collection__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-75);
  list-style: none;
  margin: 0;
  padding: 0;
}

.mme-collection__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: var(--border-width-base) solid var(--border-color-subtle);
  background-color: var(--background-color-base);
}

.mme-collection__thumb {
  width: 100%;
  margin: 0;
  aspect-ratio: 4 / 3;
}

.mme-collection__thumb:deep(.cdx-thumbnail) {
  display: flex;
  width: 100%;
  height: 100%;
  margin: 0;
}

.mme-collection__thumb:deep(.cdx-thumbnail__image),
.mme-collection__thumb:deep(.cdx-thumbnail__placeholder) {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: none;
  border-radius: 0;
  object-fit: cover;
}

.mme-collection__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-35);
  padding: var(--spacing-75);
  min-width: 0;
}

.mme-collection__item-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.mme-collection__reset-prompt {
  margin-top: var(--spacing-150);
}

</style>
