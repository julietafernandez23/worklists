<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  CdxCheckbox,
  CdxIcon,
  CdxMenuButton,
  CdxTab,
  CdxTabs,
} from '@wikimedia/codex'
import {
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconChartLine,
  cdxIconEllipsis,
  cdxIconLightbulb,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Worklist checklist',
    description: 'Use the worklist as a to-do list.',
  },
})

type Quality = 'low' | 'medium' | 'high'

interface ArticleItem {
  id: string
  title: string
  description: string
  url: string
  viewsPerMonth: string
  suggestionCount: number
  quality: Quality
}

const QUALITY_CYCLE: Quality[] = ['medium', 'high', 'low', 'low', 'medium', 'low', 'high']

/** Raw view counts — values under 1000 are literal; others are thousands (e.g. 20 → 20k). */
const VIEW_COUNTS = [20, 5, 35, 15, 500, 15, 120]

const SUGGESTION_COUNTS = [2, 1, 1, 3, 7, 2, 4]

const ARTICLES = [
  'Coral bleaching',
  'Endangered species',
  'Climate variability and change',
  'Ozone layer',
  'Politics of climate change',
  'Amazon rainforest',
  'Biodiversity',
]

/** Pre-checked items so the todo state is visible on load. */
const PRE_COMPLETED_IDS = ['Coral_bleaching', 'Endangered_species']

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  if (count < 100) {
    return `${count} views last month`
  }
  return `${count}k views last month`
}

function suggestionLabel(count: number): string {
  return count === 1 ? '1 suggestion' : `${count} suggestions`
}

function qualityLabel(quality: Quality): string {
  return `${quality.charAt(0).toUpperCase()}${quality.slice(1)} quality`
}

function isDone(id: string): boolean {
  return completedIds.value.includes(id)
}

const items = ref<ArticleItem[]>([])
const loading = ref(true)
const activeTab = ref('worklist')
const titleMenuAction = ref<string | null>(null)
const completedIds = ref<string[]>([...PRE_COMPLETED_IDS])

const TITLE_MENU_ITEMS = [
  { value: 'export-collections', label: 'Export to Collections' },
]

onMounted(async () => {
  const results = await Promise.all(
    ARTICLES.map(async (title, index) => {
      const wikiTitle = title.replace(/ /g, '_')
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
        )
        const data = await res.json()
        return {
          id: wikiTitle,
          title: data.title ?? title,
          description: data.extract ?? '',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
          viewsPerMonth: fakeViews(index),
          suggestionCount: SUGGESTION_COUNTS[index],
          quality: QUALITY_CYCLE[index],
        } satisfies ArticleItem
      } catch {
        return {
          id: wikiTitle,
          title,
          description: '',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
          viewsPerMonth: fakeViews(index),
          suggestionCount: SUGGESTION_COUNTS[index],
          quality: QUALITY_CYCLE[index],
        }
      }
    }),
  )
  items.value = results
  loading.value = false
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" skin="mobile">
    <SpecialPageWrapper :title="null" class="wc4__special-page" skin="mobile">
      <template #header>
        <div class="wc4__page-title">
          <h1 class="wc4__page-title-text">
            Event details: Wiki Loves Earth 2026
          </h1>
          <CdxMenuButton
            v-model:selected="titleMenuAction"
            :menu-items="TITLE_MENU_ITEMS"
            weight="quiet"
            aria-label="More options"
            class="wc4__page-title-menu"
          >
            <CdxIcon :icon="cdxIconEllipsis" />
          </CdxMenuButton>
        </div>
      </template>
      <CdxTabs v-model:active="activeTab" class="wc4__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
          <div class="wc4__page">
            <div v-if="loading" class="wc4__loading">Loading articles…</div>

            <ul v-else class="wc4__list" role="list">
              <li
                v-for="item in items"
                :key="item.id"
                class="wc4__item"
                :class="{ 'wc4__item--done': isDone(item.id) }"
              >
                <div class="wc4__item-row">
                  <CdxCheckbox
                    v-model="completedIds"
                    :input-value="item.id"
                    hide-label
                    inline
                    class="wc4__checkbox-control"
                    :aria-label="`Check off ${item.title}`"
                  />
                  <div class="wc4__item-body">
                    <a
                      class="wc4__item-title"
                      :href="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{ item.title }}</a>
                    <p class="wc4__item-description">{{ item.description }}</p>

                    <div class="wc4__meta-row">
                      <span class="wc4__meta-item">
                        <CdxIcon :icon="cdxIconChartLine" size="small" class="wc4__meta-icon wc4__meta-icon--views" />
                        <span>{{ item.viewsPerMonth }}</span>
                      </span>
                      <span class="wc4__meta-item">
                        <CdxIcon :icon="cdxIconLightbulb" size="small" class="wc4__meta-icon wc4__meta-icon--suggestions" />
                        <span>{{ suggestionLabel(item.suggestionCount) }}</span>
                      </span>
                      <span
                        class="wc4__meta-item wc4__meta-item--quality"
                        :class="`wc4__meta-item--${item.quality}`"
                      >
                        <CdxIcon
                          v-if="item.quality === 'high'"
                          :icon="cdxIconArrowUp"
                          size="small"
                          class="wc4__meta-icon"
                        />
                        <CdxIcon
                          v-else-if="item.quality === 'low'"
                          :icon="cdxIconArrowDown"
                          size="small"
                          class="wc4__meta-icon"
                        />
                        <span v-else class="wc4__meta-icon wc4__meta-icon--medium" aria-hidden="true">—</span>
                        <span>{{ qualityLabel(item.quality) }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
              </ul>
          </div>
        </CdxTab>
        <CdxTab name="contributions" label="Contributions" :disabled="true" />
      </CdxTabs>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.wc4__special-page:deep(.special-page-wrapper__header) {
  width: 100%;
}

.wc4__special-page:deep(.special-page-wrapper__title-cluster) {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.wc4__page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
  min-width: 0;
}

.wc4__page-title-text {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  font-family: var(--font-family-system-sans), var(--font-family-base);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.wc4__page-title-menu {
  flex-shrink: 0;
  margin-top: 2px;
}

.wc4__tabs {
  margin-bottom: var(--spacing-100);
}

.wc4__page {
  padding-top: var(--spacing-100);
}

.wc4__loading {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  padding: var(--spacing-100) 0;
}

.wc4__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wc4__item {
  padding: var(--spacing-75) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.wc4__item:first-child {
  padding-top: 0;
}

.wc4__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.wc4__item-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

.wc4__checkbox-control {
  flex-shrink: 0;
  margin-top: 1px;
}

.wc4__checkbox-control:deep(.cdx-checkbox) {
  margin: 0;
}

.wc4__item-body {
  min-width: 0;
}

.wc4__item-title {
  display: block;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive);
  text-decoration: none;
  line-height: var(--line-height-medium);
}

.wc4__item-title:hover {
  text-decoration: underline;
}

.wc4__item--done .wc4__item-title {
  color: var(--color-subtle);
  text-decoration: line-through;
}

.wc4__item--done .wc4__item-title:hover {
  text-decoration: line-through underline;
}

.wc4__item-description {
  margin: var(--spacing-25) 0 var(--spacing-50);
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

.wc4__item--done .wc4__item-description,
.wc4__item--done .wc4__meta-row {
  opacity: 0.72;
}

.wc4__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--spacing-75);
  row-gap: var(--spacing-25);
}

.wc4__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wc4__meta-icon {
  flex-shrink: 0;
}

.wc4__meta-icon--views {
  color: var(--color-subtle);
}

.wc4__meta-icon--suggestions {
  color: var(--color-progressive);
}

.wc4__meta-icon--medium {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  color: var(--color-warning);
}

.wc4__meta-item--quality.wc4__meta-item--high,
.wc4__meta-item--quality.wc4__meta-item--high .wc4__meta-icon {
  color: var(--color-success);
}

.wc4__meta-item--quality.wc4__meta-item--medium {
  color: var(--color-warning);
}

.wc4__meta-item--quality.wc4__meta-item--low,
.wc4__meta-item--quality.wc4__meta-item--low .wc4__meta-icon {
  color: var(--color-destructive);
}
</style>
