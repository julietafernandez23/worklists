<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CdxAccordion, CdxButton, CdxIcon, CdxSelect, CdxToggleSwitch, CdxTab, CdxTabs, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconClose, cdxIconInfo } from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Worklist configurator',
    description: 'Card-based worklist view for Wiki Loves Earth.',
  },
})

type Quality = 'low' | 'medium' | 'high'

interface QualityMetric {
  label: string
  progress: number
}

interface ArticleCard {
  title: string
  description: string
  thumbnail: string | null
  url: string
  dateAdded: string
  dateAddedShort: string
  viewsPerMonth: string
  quality: Quality
  qualityMetrics: QualityMetric[]
}

const QUALITY_METRIC_LABELS = [
  'Article Length',
  'References',
  'Internal Links',
  'Categories',
  'Media (Images/Files)',
  'Article Structure',
  'Infobox',
  'Maintenance Messages',
] as const

const QUALITY_PROFILES: Record<Quality, number[]> = {
  high: [100, 100, 76, 80, 100, 76, 100, 0],
  medium: [76, 65, 50, 40, 76, 55, 0, 0],
  low: [45, 30, 20, 13, 50, 25, 0, 0],
}

function fakeQualityMetrics(quality: Quality, index: number): QualityMetric[] {
  return QUALITY_METRIC_LABELS.map((label, metricIndex) => {
    const base = QUALITY_PROFILES[quality][metricIndex]
    const variation = (index + metricIndex) % 3 === 0 ? -8 : (index + metricIndex) % 3 === 1 ? 5 : 0
    const progress = Math.max(0, Math.min(100, base + variation))
    return { label, progress }
  })
}

const QUALITY_CYCLE: Quality[] = ['high', 'medium', 'low', 'high', 'medium', 'low', 'high']

const BASE_DATE = new Date('2026-07-10')
const VIEW_COUNTS = [20, 45, 12, 8, 15, 120, 33]

function fakeDate(index: number): { full: string; short: string } {
  const d = new Date(BASE_DATE)
  d.setDate(d.getDate() - index)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  return {
    full: `Added ${month} ${day}, ${year}`,
    short: `${month} ${day}, ${year}`,
  }
}

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k visits last month`
}

const ARTICLES = [
  'Coral bleaching',
  'Endangered species',
  'Climate variability and change',
  'Ozone layer',
  'Politics of climate change',
  'Amazon rainforest',
  'Biodiversity',
]

const cards = ref<ArticleCard[]>([])
const loading = ref(true)

// Configurator options
const showThumbnail = ref(true)
const showDescription = ref(true)
type WikiPosition = 'hidden' | 'below-title' | 'below-description'
const wikiPosition = ref<WikiPosition>('below-description')
type DatePosition = 'hidden' | 'top-right' | 'below-title' | 'below-description'
const datePosition = ref<DatePosition>('hidden')
type ViewsPosition = 'hidden' | 'below-title' | 'below-description'
const viewsPosition = ref<ViewsPosition>('hidden')
type QualityDisplay = 'hidden' | 'plain' | 'with-breakdown'
const qualityDisplay = ref<QualityDisplay>('hidden')
const activeTab = ref('worklist')
const showConfigurePanel = ref(false)
const articleContextOpen = ref(true)
const qualitySheetArticle = ref<ArticleCard | null>(null)

const POSITION_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'below-title', label: 'Below title' },
  { value: 'below-description', label: 'Below description' },
]

const DATE_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'top-right', label: 'Top right' },
  { value: 'below-title', label: 'Below title' },
  { value: 'below-description', label: 'Below description' },
]

const QUALITY_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'plain', label: 'Plain' },
  { value: 'with-breakdown', label: 'With breakdown' },
]

function openQualitySheet(card: ArticleCard) {
  qualitySheetArticle.value = card
}

function closeQualitySheet() {
  qualitySheetArticle.value = null
}

function toggleConfigurePanel() {
  showConfigurePanel.value = !showConfigurePanel.value
  if (showConfigurePanel.value) {
    articleContextOpen.value = true
  }
}

type MetaPosition = 'below-title' | 'below-description'

function cardMetaItems(card: ArticleCard, position: MetaPosition): string[] {
  const items: string[] = []
  if (wikiPosition.value === position) items.push('English Wikipedia')
  if (datePosition.value === position) items.push(card.dateAdded)
  if (viewsPosition.value === position) items.push(card.viewsPerMonth)
  return items
}

onMounted(async () => {
  const results = await Promise.all(
    ARTICLES.map(async (title, index) => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        )
        const data = await res.json()
        return {
          title: data.title ?? title,
          description: data.extract ?? '',
          thumbnail: data.thumbnail?.source ?? null,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
          dateAdded: fakeDate(index).full,
          dateAddedShort: fakeDate(index).short,
          viewsPerMonth: fakeViews(index),
          quality: QUALITY_CYCLE[index],
          qualityMetrics: fakeQualityMetrics(QUALITY_CYCLE[index], index),
        } satisfies ArticleCard
      } catch {
        return {
          title,
          description: '',
          thumbnail: null,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
          dateAdded: fakeDate(index).full,
          dateAddedShort: fakeDate(index).short,
          viewsPerMonth: fakeViews(index),
          quality: QUALITY_CYCLE[index],
          qualityMetrics: fakeQualityMetrics(QUALITY_CYCLE[index], index),
        }
      }
    }),
  )
  cards.value = results
  loading.value = false
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper title="Wiki Loves Earth 2026">
      <CdxTabs v-model:active="activeTab" class="wl__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
    <div class="wl__page">
      <div class="wl__configure-bar">
        <CdxButton
          weight="normal"
          :action="showConfigurePanel ? 'default' : 'progressive'"
          @click="toggleConfigurePanel"
        >
          {{ showConfigurePanel ? 'Close' : 'Configure' }}
        </CdxButton>
      </div>

      <div v-show="showConfigurePanel" class="wl__configure-panel">
        <CdxAccordion v-model="articleContextOpen" separation="divider">
          <template #title>Article context</template>
          <template #description>Select and adjust how article signals are presented on each card.</template>
          <div class="wl__configure-fields">
            <div class="wl__configure-row">
              <span class="wl__configure-label">Thumbnail</span>
              <CdxToggleSwitch v-model="showThumbnail" />
            </div>
            <div class="wl__configure-row">
              <span class="wl__configure-label">Description</span>
              <CdxToggleSwitch v-model="showDescription" />
            </div>
            <div class="wl__configure-row">
              <span class="wl__configure-label">Article quality</span>
              <CdxSelect
                v-model:selected="qualityDisplay"
                :menu-items="QUALITY_OPTIONS"
                default-label="Hidden"
                class="wl__configure-select"
              />
            </div>
            <div class="wl__configure-row">
              <span class="wl__configure-label">Wiki</span>
              <CdxSelect
                v-model:selected="wikiPosition"
                :menu-items="POSITION_OPTIONS"
                default-label="Hidden"
                class="wl__configure-select"
              />
            </div>
            <div class="wl__configure-row">
              <span class="wl__configure-label">Date added</span>
              <CdxSelect
                v-model:selected="datePosition"
                :menu-items="DATE_OPTIONS"
                default-label="Hidden"
                class="wl__configure-select"
              />
            </div>
            <div class="wl__configure-row">
              <span class="wl__configure-label">Views per month</span>
              <CdxSelect
                v-model:selected="viewsPosition"
                :menu-items="POSITION_OPTIONS"
                default-label="Hidden"
                class="wl__configure-select"
              />
            </div>
          </div>
        </CdxAccordion>
      </div>

      <div v-if="loading" class="wl__loading">Loading articles…</div>

      <ul v-else class="wl__list" role="list">
        <li v-for="card in cards" :key="card.title" class="wl__card">
          <div class="wl__card-body">
            <div class="wl__card-title-row">
              <a
                class="wl__card-title"
                :href="card.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ card.title }}</a>
              <span v-if="datePosition === 'top-right'" class="wl__card-date-right">{{ card.dateAddedShort }}</span>
            </div>
            <span
              v-if="cardMetaItems(card, 'below-title').length"
              class="wl__card-meta"
            >
              <template v-for="(item, index) in cardMetaItems(card, 'below-title')" :key="index">
                <span v-if="index > 0" class="wl__card-meta-sep"> · </span>
                <span>{{ item }}</span>
              </template>
            </span>
            <p v-if="showDescription" class="wl__card-description">{{ card.description }}</p>
            <div
              v-if="cardMetaItems(card, 'below-description').length || qualityDisplay !== 'hidden'"
              class="wl__card-bottom-meta"
            >
              <span
                v-if="cardMetaItems(card, 'below-description').length"
                class="wl__card-meta"
              >
                <template v-for="(item, index) in cardMetaItems(card, 'below-description')" :key="index">
                  <span v-if="index > 0" class="wl__card-meta-sep"> · </span>
                  <span>{{ item }}</span>
                </template>
              </span>
              <div v-if="qualityDisplay !== 'hidden'" class="wl__card-quality-wrap">
                <span
                  class="wl__card-quality-text"
                  :class="`wl__card-quality-text--${card.quality}`"
                >{{ card.quality.charAt(0).toUpperCase() + card.quality.slice(1) }} quality</span>
                <CdxButton
                  v-if="qualityDisplay === 'with-breakdown'"
                  weight="quiet"
                  :icon-only="true"
                  size="small"
                  :aria-label="`View quality breakdown for ${card.title}`"
                  class="wl__card-quality-info"
                  @click="openQualitySheet(card)"
                >
                  <CdxIcon :icon="cdxIconInfo" size="small" />
                </CdxButton>
              </div>
            </div>
          </div>
          <div v-if="showThumbnail && card.thumbnail" class="wl__card-thumb-wrap">
            <img
              class="wl__card-thumb"
              :src="card.thumbnail"
              :alt="card.title"
            />
          </div>
        </li>
      </ul>
    </div>
        </CdxTab>
        <CdxTab name="contributions" label="Contributions" :disabled="true" />
      </CdxTabs>
    </SpecialPageWrapper>
  </ChromeWrapper>

  <!-- Quality breakdown backdrop -->
  <Transition name="wl-backdrop">
    <div
      v-if="qualitySheetArticle"
      class="wl__backdrop wl__backdrop--quality"
      @click.self="closeQualitySheet"
    />
  </Transition>

  <!-- Quality breakdown bottom sheet -->
  <Transition name="wl-sheet">
    <div
      v-if="qualitySheetArticle"
      class="wl__sheet wl__sheet--quality"
      role="dialog"
      :aria-label="`Quality breakdown for ${qualitySheetArticle.title}`"
    >
      <div class="wl__sheet-header">
        <span class="wl__sheet-title">{{ qualitySheetArticle.title }}</span>
        <CdxButton weight="quiet" :icon-only="true" aria-label="Close" @click="closeQualitySheet">
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>

      <div class="wl__quality-grid">
        <div
          v-for="metric in qualitySheetArticle.qualityMetrics"
          :key="metric.label"
          class="wl__quality-metric"
        >
          <span class="wl__quality-metric-label">{{ metric.label }}</span>
          <div class="wl__quality-metric-bar">
            <CdxProgressBar
              :value="metric.progress"
              :aria-label="`${metric.label}: ${metric.progress}%`"
            />
            <span class="wl__quality-metric-value">{{ metric.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.wl__tabs {
  margin-bottom: var(--spacing-150);
}

.wl__page {
  padding-top: var(--spacing-200);
}

.wl__configure-bar {
  margin-bottom: var(--spacing-100);
}

.wl__configure-panel {
  margin-bottom: var(--spacing-150);
  padding: var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
}

.wl__configure-panel :deep(.cdx-accordion) {
  overflow: visible;
}

.wl__configure-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding-top: var(--spacing-50);
  max-width: 100%;
}

.wl__configure-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 9.5rem);
  align-items: center;
  gap: var(--spacing-75);
}

.wl__configure-label {
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  color: var(--color-base);
  line-height: var(--line-height-medium);
}

.wl__configure-select {
  min-width: 0;
  width: 100%;
}

.wl__configure-select :deep(.cdx-select-vue) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.wl__configure-select :deep(.cdx-select-vue__handle) {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.wl__loading {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  padding: var(--spacing-100) 0;
}

.wl__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.wl__card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-100);
  padding: var(--spacing-75) var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  margin-bottom: var(--spacing-75);
}

.wl__card-body {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wl__card-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--spacing-75);
}

.wl__card-date-right {
  flex-shrink: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
  line-height: var(--line-height-medium);
}

.wl__card-bottom-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
}

.wl__card-quality-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
}

.wl__card-quality-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
}

.wl__card-quality-text--low {
  color: var(--color-destructive);
}

.wl__card-quality-text--medium {
  color: var(--color-warning);
}

.wl__card-quality-text--high {
  color: var(--color-success);
}

.wl__card-quality-info {
  flex-shrink: 0;
}

.wl__card-title-row .wl__card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wl__card-title {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive, #3366cc);
  text-decoration: none;
  line-height: var(--line-height-medium);
}

.wl__card-title:hover {
  text-decoration: underline;
}

.wl__card-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
  line-height: var(--line-height-small);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wl__card-meta {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
  line-height: var(--line-height-small);
}

.wl__card-meta-sep {
  color: var(--color-subtle);
}

.wl__card-thumb-wrap {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-base);
  overflow: hidden;
  background-color: var(--background-color-neutral);
}

.wl__card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Backdrop */
.wl__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 20;
}

.wl__backdrop--quality {
  z-index: 40;
}

/* Bottom sheet */
.wl__sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background-color: var(--background-color-base);
  border-radius: 8px 8px 0 0;
  padding: var(--spacing-100);
  padding-bottom: calc(var(--spacing-100) + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.12);
}

.wl__sheet--quality {
  z-index: 50;
  max-height: 80vh;
  overflow-y: auto;
}

.wl__quality-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-75);
}

.wl__quality-metric {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.wl__quality-metric-label {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  color: var(--color-base);
  line-height: var(--line-height-small);
}

.wl__quality-metric-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.wl__quality-metric-bar :deep(.cdx-progress-bar) {
  flex: 1;
  min-width: 0;
}

.wl__quality-metric-value {
  flex-shrink: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  color: var(--color-subtle);
  line-height: var(--line-height-small);
}

.wl__sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-100);
}

.wl__sheet-title {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
}

/* Sheet transitions */
.wl-sheet-enter-active,
.wl-sheet-leave-active {
  transition: transform 0.25s ease;
}

.wl-sheet-enter-from,
.wl-sheet-leave-to {
  transform: translateY(100%);
}

/* Backdrop transitions */
.wl-backdrop-enter-active,
.wl-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.wl-backdrop-enter-from,
.wl-backdrop-leave-to {
  opacity: 0;
}
</style>
