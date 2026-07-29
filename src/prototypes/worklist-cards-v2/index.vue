<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CdxIcon, CdxMenuButton, CdxTab, CdxTabs } from '@wikimedia/codex'
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
    title: 'Worklist cards',
    description:
      'View the worklist as a list of cards with an MVP of article context: views per month, edit suggestions, and article quality.',
  },
})

type Quality = 'low' | 'medium' | 'high'

interface ArticleCard {
  title: string
  description: string
  thumbnail: string | null
  url: string
  viewsPerMonth: string
  quality: Quality
  suggestions: string[]
}

const QUALITY_CYCLE: Quality[] = ['medium', 'high', 'low', 'high', 'medium', 'low', 'high']

const VIEW_COUNTS = [20, 5, 35, 12, 8, 15, 120]

const SUGGESTION_SETS = [
  ['Add a citation', 'Add a link'],
  ['Remove duplicated link'],
  ['Revise tone'],
  ['Add a citation', 'Add a link'],
  ['Add a citation', 'Add a link'],
  ['Add a citation', 'Add a link'],
  ['Add a citation', 'Add a link'],
]

const ARTICLES = [
  'Coral bleaching',
  'Endangered species',
  'Climate variability and change',
  'Ozone layer',
  'Politics of climate change',
  'Amazon rainforest',
  'Biodiversity',
]

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k views last month`
}

function qualityLabel(quality: Quality): string {
  return `${quality.charAt(0).toUpperCase()}${quality.slice(1)} quality`
}

const cards = ref<ArticleCard[]>([])
const loading = ref(true)
const activeTab = ref('worklist')
const titleMenuAction = ref<string | null>(null)

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
          title: data.title ?? title,
          description: data.extract ?? '',
          thumbnail: data.thumbnail?.source ?? null,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
          viewsPerMonth: fakeViews(index),
          quality: QUALITY_CYCLE[index],
          suggestions: SUGGESTION_SETS[index],
        } satisfies ArticleCard
      } catch {
        return {
          title,
          description: '',
          thumbnail: null,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
          viewsPerMonth: fakeViews(index),
          quality: QUALITY_CYCLE[index],
          suggestions: SUGGESTION_SETS[index],
        }
      }
    }),
  )
  cards.value = results
  loading.value = false
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" skin="mobile">
    <SpecialPageWrapper :title="null" class="wc2__special-page" skin="mobile">
      <template #header>
        <div class="wc2__page-title">
          <h1 class="wc2__page-title-text">
            Event details: Wiki Loves Earth 2026
          </h1>
          <CdxMenuButton
            v-model:selected="titleMenuAction"
            :menu-items="TITLE_MENU_ITEMS"
            weight="quiet"
            aria-label="More options"
            class="wc2__page-title-menu"
          >
            <CdxIcon :icon="cdxIconEllipsis" />
          </CdxMenuButton>
        </div>
      </template>
      <CdxTabs v-model:active="activeTab" class="wc2__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
          <div class="wc2__page">
            <div v-if="loading" class="wc2__loading">Loading articles…</div>

            <ul v-else class="wc2__list" role="list">
              <li v-for="card in cards" :key="card.title" class="wc2__card">
                <div class="wc2__card-body">
                  <a
                    class="wc2__card-title"
                    :href="card.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ card.title }}</a>
                  <p class="wc2__card-description">{{ card.description }}</p>

                  <div class="wc2__card-signals">
                    <div class="wc2__signal">
                      <CdxIcon :icon="cdxIconChartLine" size="small" class="wc2__signal-icon wc2__signal-icon--views" />
                      <span class="wc2__signal-text">{{ card.viewsPerMonth }}</span>
                    </div>

                    <div class="wc2__signal">
                      <CdxIcon :icon="cdxIconLightbulb" size="small" class="wc2__signal-icon wc2__signal-icon--suggestion" />
                      <span class="wc2__signal-text wc2__signal-text--suggestions">
                        <template v-for="(suggestion, index) in card.suggestions" :key="suggestion">
                          <span v-if="index > 0" class="wc2__suggestion-sep">, </span>
                          <button type="button" class="wc2__suggestion-link">{{ suggestion }}</button>
                        </template>
                      </span>
                    </div>

                    <div
                      class="wc2__signal"
                      :class="`wc2__signal--${card.quality}`"
                    >
                      <CdxIcon
                        v-if="card.quality === 'high'"
                        :icon="cdxIconArrowUp"
                        size="small"
                        class="wc2__signal-icon"
                      />
                      <CdxIcon
                        v-else-if="card.quality === 'low'"
                        :icon="cdxIconArrowDown"
                        size="small"
                        class="wc2__signal-icon"
                      />
                      <span v-else class="wc2__signal-icon wc2__signal-icon--medium" aria-hidden="true">—</span>
                      <span class="wc2__signal-text wc2__signal-text--quality">{{ qualityLabel(card.quality) }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="card.thumbnail" class="wc2__card-thumb-wrap">
                  <img
                    class="wc2__card-thumb"
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
</template>

<style scoped>
.wc2__special-page:deep(.special-page-wrapper__header) {
  width: 100%;
}

.wc2__special-page:deep(.special-page-wrapper__title-cluster) {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.wc2__page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
  min-width: 0;
}

.wc2__page-title-text {
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

.wc2__page-title-menu {
  flex-shrink: 0;
  margin-top: 2px;
}

.wc2__tabs {
  margin-bottom: var(--spacing-150);
}

.wc2__page {
  padding-top: var(--spacing-200);
}

.wc2__loading {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  padding: var(--spacing-100) 0;
}

.wc2__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wc2__card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-100);
  padding: var(--spacing-75) var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.wc2__card-body {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.wc2__card-title {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive);
  text-decoration: none;
  line-height: var(--line-height-medium);
}

.wc2__card-title:hover {
  text-decoration: underline;
}

.wc2__card-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  color: var(--color-base);
  line-height: var(--line-height-small);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wc2__card-signals {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin-top: var(--spacing-25);
}

.wc2__signal {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  min-width: 0;
}

.wc2__signal-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.wc2__signal-icon--views {
  color: var(--color-subtle);
}

.wc2__signal-icon--suggestion {
  color: var(--color-progressive);
}

.wc2__signal-icon--medium {
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

.wc2__signal-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wc2__signal-text--suggestions {
  color: var(--color-base);
}

.wc2__suggestion-link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--color-progressive);
  cursor: pointer;
  text-align: left;
}

.wc2__suggestion-link:hover {
  text-decoration: underline;
}

.wc2__suggestion-sep {
  color: var(--color-base);
}

.wc2__signal--high .wc2__signal-icon,
.wc2__signal--high .wc2__signal-text--quality {
  color: var(--color-success);
}

.wc2__signal--medium .wc2__signal-text--quality {
  color: var(--color-warning);
}

.wc2__signal--low .wc2__signal-icon,
.wc2__signal--low .wc2__signal-text--quality {
  color: var(--color-destructive);
}

.wc2__card-thumb-wrap {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-base);
  overflow: hidden;
  background-color: var(--background-color-neutral);
}

.wc2__card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
