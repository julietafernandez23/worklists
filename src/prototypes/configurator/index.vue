<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CdxButton, CdxIcon, CdxToggleSwitch, CdxRadio, CdxInfoChip, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconConfigure, cdxIconClose } from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Worklist configurator',
    description: 'Card-based worklist view for Wiki Loves Earth.',
  },
})

type Quality = 'low' | 'medium' | 'high'

interface ArticleCard {
  title: string
  description: string
  thumbnail: string | null
  url: string
  dateAdded: string
  dateAddedShort: string
  quality: Quality
}

const QUALITY_CYCLE: Quality[] = ['high', 'medium', 'low', 'high', 'medium', 'low', 'high']

const QUALITY_STATUS: Record<Quality, 'error' | 'warning' | 'success'> = {
  low: 'error',
  medium: 'warning',
  high: 'success',
}

const BASE_DATE = new Date('2026-07-10')
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
const showQuality = ref(false)
const activeTab = ref('worklist')
const showBottomSheet = ref(false)

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
          quality: QUALITY_CYCLE[index],
        } satisfies ArticleCard
      } catch {
        return {
          title,
          description: '',
          thumbnail: null,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
          dateAdded: fakeDate(index).full,
          dateAddedShort: fakeDate(index).short,
          quality: QUALITY_CYCLE[index],
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
              v-if="wikiPosition === 'below-title' || datePosition === 'below-title'"
              class="wl__card-meta"
            >
              <span v-if="wikiPosition === 'below-title'">English Wikipedia</span>
              <span v-if="wikiPosition === 'below-title' && datePosition === 'below-title'" class="wl__card-meta-sep"> · </span>
              <span v-if="datePosition === 'below-title'">{{ card.dateAdded }}</span>
            </span>
            <p v-if="showDescription" class="wl__card-description">{{ card.description }}</p>
            <div
              v-if="wikiPosition === 'below-description' || datePosition === 'below-description' || showQuality"
              class="wl__card-bottom-meta"
            >
              <span
                v-if="wikiPosition === 'below-description' || datePosition === 'below-description'"
                class="wl__card-meta"
              >
                <span v-if="wikiPosition === 'below-description'">English Wikipedia</span>
                <span v-if="wikiPosition === 'below-description' && datePosition === 'below-description'" class="wl__card-meta-sep"> · </span>
                <span v-if="datePosition === 'below-description'">{{ card.dateAdded }}</span>
              </span>
              <CdxInfoChip
                v-if="showQuality"
                :status="QUALITY_STATUS[card.quality]"
                class="wl__card-quality"
              >{{ card.quality.charAt(0).toUpperCase() + card.quality.slice(1) }} quality</CdxInfoChip>
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

    <!-- FAB -->
    <CdxButton
      class="wl__fab"
      weight="primary"
      action="progressive"
      :icon-only="true"
      aria-label="Configure card display"
      @click="showBottomSheet = true"
    >
      <CdxIcon :icon="cdxIconConfigure" />
    </CdxButton>
  </ChromeWrapper>

  <!-- Bottom sheet backdrop -->
  <Transition name="wl-backdrop">
    <div
      v-if="showBottomSheet"
      class="wl__backdrop"
      @click.self="showBottomSheet = false"
    />
  </Transition>

  <!-- Bottom sheet -->
  <Transition name="wl-sheet">
    <div v-if="showBottomSheet" class="wl__sheet" role="dialog" aria-label="Configure cards">
      <div class="wl__sheet-header">
        <span class="wl__sheet-title">customize cards</span>
        <CdxButton weight="quiet" :icon-only="true" aria-label="Close" @click="showBottomSheet = false">
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>

      <div class="wl__sheet-body">
        <div class="wl__sheet-row">
          <label class="wl__sheet-label" for="toggle-thumbnail">thumbnail</label>
          <CdxToggleSwitch
            id="toggle-thumbnail"
            v-model="showThumbnail"
          />
        </div>
        <div class="wl__sheet-row">
          <label class="wl__sheet-label" for="toggle-description">description</label>
          <CdxToggleSwitch
            id="toggle-description"
            v-model="showDescription"
          />
        </div>
        <div class="wl__sheet-row">
          <label class="wl__sheet-label" for="toggle-quality">article quality</label>
          <CdxToggleSwitch
            id="toggle-quality"
            v-model="showQuality"
          />
        </div>
        <div class="wl__sheet-option">
          <span class="wl__sheet-label">wiki</span>
          <div class="wl__sheet-radios">
            <CdxRadio v-model="wikiPosition" name="wiki-position" input-value="hidden">hidden</CdxRadio>
            <CdxRadio v-model="wikiPosition" name="wiki-position" input-value="below-title">below title</CdxRadio>
            <CdxRadio v-model="wikiPosition" name="wiki-position" input-value="below-description">below description</CdxRadio>
          </div>
        </div>
        <div class="wl__sheet-option">
          <span class="wl__sheet-label">date added</span>
          <div class="wl__sheet-radios">
            <CdxRadio v-model="datePosition" name="date-position" input-value="hidden">hidden</CdxRadio>
            <CdxRadio v-model="datePosition" name="date-position" input-value="top-right">top right</CdxRadio>
            <CdxRadio v-model="datePosition" name="date-position" input-value="below-title">below title</CdxRadio>
            <CdxRadio v-model="datePosition" name="date-position" input-value="below-description">below description</CdxRadio>
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
  padding-bottom: 96px;
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

.wl__card-quality {
  align-self: flex-start;
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

/* FAB */
.wl__fab {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 50% !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
}

/* Backdrop */
.wl__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 20;
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

.wl__sheet-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wl__sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wl__sheet-option {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.wl__sheet-radios {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--spacing-50) var(--spacing-100);
}

.wl__sheet-label {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
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
