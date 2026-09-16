<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxInfoChip,
  CdxLookup,
  CdxSearchInput,
  CdxSelect,
  CdxTab,
  CdxTabs,
  CdxTextArea,
} from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import {
  cdxIconAdd,
  cdxIconChartLine,
  cdxIconCode,
  cdxIconConfigure,
  cdxIconEdit,
  cdxIconHalfStar,
  cdxIconHistory,
  cdxIconLightbulb,
  cdxIconStar,
  cdxIconTrash,
  cdxIconUnStar,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import {
  getWorklistArticleTitles,
  saveWorklistArticleTitles,
} from '@/lib/event-worklist-storage'

definePage({
  meta: {
    title: 'Worklist cards',
    description:
      'View the worklist as a list of cards with an MVP of article context: views per month, edit suggestions, and article quality.',
  },
})

type QualityBand = 'low' | 'medium' | 'high'

interface QualityMetric {
  label: string
  progress: number
}

interface ArticleNote {
  text: string
  author: string
  addedAt: Date
}

interface ArticleCard {
  title: string
  description: string
  url: string
  wiki: string
  dateAdded: Date
  viewsPerMonth: string
  viewsCount: number
  order: number
  qualityScore: number
  qualityMetrics: QualityMetric[]
  suggestions: string[]
  workingOn: string[]
  note: ArticleNote | null
}

const CURRENT_USERNAME = 'LittleBird'

const QUALITY_METRIC_LABELS = [
  'Article length',
  'References',
  'Internal links',
  'Categories',
  'Media (images/files)',
  'Article structure',
  'Infobox',
  'Maintenance messages',
] as const

const QUALITY_PROFILES: Record<QualityBand, number[]> = {
  high: [100, 100, 76, 80, 100, 76, 100, 0],
  medium: [76, 65, 50, 40, 76, 55, 0, 0],
  low: [45, 30, 20, 13, 50, 25, 0, 0],
}

const QUALITY_CYCLE: QualityBand[] = ['medium', 'high', 'low', 'high', 'medium', 'low', 'high']

/** Fixed scores so each quality band is visible in the demo list. */
const DEMO_MEDIUM_ARTICLE_INDEX = 0 // Coral bleaching

const DEMO_QUALITY_SCORES: Record<number, number> = {
  [DEMO_MEDIUM_ARTICLE_INDEX]: 62, // medium (half star)
}

function articleOrder(index: number, totalCount: number): number {
  if (index === DEMO_MEDIUM_ARTICLE_INDEX) return totalCount
  return index
}

function fakeQualityMetrics(band: QualityBand, index: number): QualityMetric[] {
  return QUALITY_METRIC_LABELS.map((label, metricIndex) => {
    const base = QUALITY_PROFILES[band][metricIndex]
    const variation = (index + metricIndex) % 3 === 0 ? -8 : (index + metricIndex) % 3 === 1 ? 5 : 0
    const progress = Math.max(0, Math.min(100, base + variation))
    return { label, progress }
  })
}

function overallQualityScore(metrics: QualityMetric[]): number {
  if (!metrics.length) return 0
  const total = metrics.reduce((sum, metric) => sum + metric.progress, 0)
  return Math.round(total / metrics.length)
}

const HIGH_QUALITY_THRESHOLD = 75
const MEDIUM_QUALITY_THRESHOLD = 50

function qualityBand(score: number): QualityBand {
  if (score >= HIGH_QUALITY_THRESHOLD) return 'high'
  if (score >= MEDIUM_QUALITY_THRESHOLD) return 'medium'
  return 'low'
}

function qualityChipIcon(score: number) {
  if (score >= HIGH_QUALITY_THRESHOLD) return cdxIconUnStar
  if (score >= MEDIUM_QUALITY_THRESHOLD) return cdxIconHalfStar
  return cdxIconStar
}

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

const SUGGESTION_COUNTS = [2, 1, 3, 82, 2, 2, 4]

const MAX_VISIBLE_SUGGESTIONS = 2

function fakeSuggestions(index: number): string[] {
  const types = SUGGESTION_SETS[index % SUGGESTION_SETS.length]
  const count = SUGGESTION_COUNTS[index % SUGGESTION_COUNTS.length]
  return Array.from({ length: count }, (_, i) => types[i % types.length])
}

function uniqueSuggestions(suggestions: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const suggestion of suggestions) {
    if (seen.has(suggestion)) continue
    seen.add(suggestion)
    unique.push(suggestion)
  }
  return unique
}

function visibleSuggestions(suggestions: string[]): string[] {
  return uniqueSuggestions(suggestions).slice(0, MAX_VISIBLE_SUGGESTIONS)
}

function extraSuggestionsCount(suggestions: string[]): number {
  const visible = visibleSuggestions(suggestions)
  return Math.max(0, suggestions.length - visible.length)
}

const SUGGESTION_FILTER_OPTIONS: MenuItemData[] = [
  { value: 'all', label: 'All suggestions' },
  { value: 'Add a citation', label: 'Add a citation' },
  { value: 'Add a link', label: 'Add a link' },
  { value: 'Remove duplicated link', label: 'Remove duplicated link' },
  { value: 'Revise tone', label: 'Revise tone' },
]

const SORT_OPTIONS: MenuItemData[] = [
  { value: 'default', label: 'Recently added' },
  { value: 'views-desc', label: 'Most views' },
  { value: 'views-asc', label: 'Fewest views' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
]

const QUALITY_FILTER_OPTIONS: MenuItemData[] = [
  { value: 'all', label: 'All quality' },
  { value: 'high', label: '75% or above' },
  { value: 'medium', label: '50–74%' },
  { value: 'low', label: 'Below 50%' },
]

function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k views last month`
}

const QUALITY_CHIP_STATUS = 'subtle' as const

function qualityLabel(score: number): string {
  return `${score}% quality`
}

function shortViewsLabel(viewsCount: number): string {
  return `${viewsCount}k`
}

function formatWikiDate(d: Date): string {
  return d.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour12: false,
  })
}

async function fetchArticleCard(
  title: string,
  index: number,
  totalCount: number,
  dateAdded: Date = new Date(Date.now() - (totalCount - index) * 86_400_000),
): Promise<ArticleCard> {
  const wikiTitle = title.replace(/ /g, '_')
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`

  const summaryResult = await fetch(summaryUrl)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)

  if (summaryResult) {
    const qualityMetrics = fakeQualityMetrics(QUALITY_CYCLE[index % QUALITY_CYCLE.length], index)
    return {
      title: summaryResult.title ?? title,
      description: summaryResult.description?.trim() || '',
      url: summaryResult.content_urls?.desktop?.page
        ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      wiki: 'English Wikipedia',
      dateAdded,
      viewsPerMonth: fakeViews(index),
      viewsCount: VIEW_COUNTS[index % VIEW_COUNTS.length],
      order: articleOrder(index, totalCount),
      qualityScore: DEMO_QUALITY_SCORES[index] ?? overallQualityScore(qualityMetrics),
      qualityMetrics,
      suggestions: fakeSuggestions(index),
      workingOn: [],
      note: null,
    }
  }

  const qualityMetrics = fakeQualityMetrics(QUALITY_CYCLE[index % QUALITY_CYCLE.length], index)
  return {
    title,
    description: '',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
    wiki: 'English Wikipedia',
    dateAdded,
    viewsPerMonth: fakeViews(index),
    viewsCount: VIEW_COUNTS[index % VIEW_COUNTS.length],
    order: articleOrder(index, totalCount),
    qualityScore: DEMO_QUALITY_SCORES[index] ?? overallQualityScore(qualityMetrics),
    qualityMetrics,
    suggestions: fakeSuggestions(index),
    workingOn: [],
    note: null,
  }
}

const REDLINK_PREFIX = '__redlink__:'

const cards = ref<ArticleCard[]>([])
const loading = ref(true)
const activeTab = ref('worklist')
const sortBy = ref('default')
const qualityFilter = ref('all')
const suggestionFilter = ref('all')
const searchQuery = ref('')
const showFilterDialog = ref(false)
const draftSortBy = ref('default')
const draftQualityFilter = ref('all')
const draftSuggestionFilter = ref('all')
const showAddDialog = ref(false)
const addPending = ref(false)

const lookupInput = ref('')
const lookupSelected = ref<string | null>(null)
const lookupMenuItems = ref<MenuItemData[]>([])
const lookupPending = ref(false)
const lookupIsRedLink = ref(false)
const selectedPages = ref('')

const showRemoveDialog = ref(false)
const pendingRemoveTitle = ref<string | null>(null)

const showNoteDialog = ref(false)
const noteDialogCard = ref<ArticleCard | null>(null)
const noteDialogMode = ref<'add' | 'edit'>('add')
const noteDraft = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(lookupSelected, (val) => {
  if (!val) return
  let title = val
  if (title.startsWith(REDLINK_PREFIX)) {
    title = title.slice(REDLINK_PREFIX.length)
  }
  const current = selectedPages.value.trim()
  selectedPages.value = current ? `${current}\n${title}` : title
  lookupSelected.value = null
  lookupInput.value = ''
  lookupMenuItems.value = []
  lookupIsRedLink.value = false
})

function canEditNote(card: ArticleCard): boolean {
  return card.note?.author === CURRENT_USERNAME
}

function formatNoteTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'just now'
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function noteLink(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="wc2__card-note-link">${label}</a>`
}

function linkifyNote(text: string): string {
  const links: string[] = []
  let html = escapeHtml(text)

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => {
      const token = `__NOTE_LINK_${links.length}__`
      links.push(noteLink(label, url))
      return token
    },
  )

  html = html.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    (url) => {
      const token = `__NOTE_LINK_${links.length}__`
      links.push(noteLink(url, url))
      return token
    },
  )

  html = html.replace(/\n/g, '<br>')

  links.forEach((link, index) => {
    html = html.replace(`__NOTE_LINK_${index}__`, link)
  })

  return html
}

function openNoteDialog(card: ArticleCard, mode: 'add' | 'edit') {
  noteDialogCard.value = card
  noteDialogMode.value = mode
  noteDraft.value = mode === 'edit' && card.note ? card.note.text : ''
  showNoteDialog.value = true
}

function onNoteSave() {
  const text = noteDraft.value.trim()
  if (!text || !noteDialogCard.value) return

  noteDialogCard.value.note = {
    text,
    author: CURRENT_USERNAME,
    addedAt: new Date(),
  }
  showNoteDialog.value = false
  noteDialogCard.value = null
  noteDraft.value = ''
}

function removeNote(card: ArticleCard) {
  if (card.note?.author === CURRENT_USERNAME) {
    card.note = null
  }
}

function confirmRemove(title: string) {
  pendingRemoveTitle.value = title
  showRemoveDialog.value = true
}

function onRemoveConfirmed() {
  if (!pendingRemoveTitle.value) return
  cards.value = cards.value.filter((card) => card.title !== pendingRemoveTitle.value)
  saveWorklistArticleTitles(cards.value.map((card) => card.title))
  showRemoveDialog.value = false
  pendingRemoveTitle.value = null
}

function onRemoveCancelled() {
  showRemoveDialog.value = false
  pendingRemoveTitle.value = null
}

const WORKLIST_PAGE_URL =
  'https://en.wikipedia.org/wiki/Wikipedia:Wiki_Loves_Earth_2026/Worklist'

const WORKLIST_HISTORY_URL =
  'https://en.wikipedia.org/w/index.php?title=Wikipedia:Wiki_Loves_Earth_2026/Worklist&action=history'

function openWorklistPage() {
  window.open(WORKLIST_PAGE_URL, '_blank', 'noopener,noreferrer')
}

function openWorklistHistory() {
  window.open(WORKLIST_HISTORY_URL, '_blank', 'noopener,noreferrer')
}

async function searchArticles(query: string) {
  if (!query.trim()) {
    lookupMenuItems.value = []
    return
  }
  lookupPending.value = true
  try {
    const params = new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: '10',
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)
    const [, titles] = (await res.json()) as [string, string[]]
    if (titles.length > 0) {
      lookupIsRedLink.value = false
      lookupMenuItems.value = titles.map((t) => ({ value: t, label: t }))
    } else {
      lookupMenuItems.value = [
        {
          value: `${REDLINK_PREFIX}${query.trim()}`,
          label: query.trim(),
        },
      ]
      lookupIsRedLink.value = true
    }
  } catch {
    lookupMenuItems.value = []
  } finally {
    lookupPending.value = false
  }
}

function onLookupInput(value: string) {
  lookupInput.value = value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchArticles(value), 300)
}

function openAddDialog() {
  selectedPages.value = ''
  lookupInput.value = ''
  lookupSelected.value = null
  lookupMenuItems.value = []
  lookupIsRedLink.value = false
  showAddDialog.value = true
}

async function onAdd() {
  const lines = selectedPages.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const existingTitles = new Set(cards.value.map((card) => card.title.toLowerCase()))
  const newTitles = lines.filter((title) => !existingTitles.has(title.toLowerCase()))

  if (!newTitles.length) {
    showAddDialog.value = false
    return
  }

  addPending.value = true
  const startIndex = cards.value.length
  const totalAfterAdd = startIndex + newTitles.length
  const added = await Promise.all(
    newTitles.map((title, offset) =>
      fetchArticleCard(title, startIndex + offset, totalAfterAdd, new Date()),
    ),
  )
  cards.value = [...cards.value, ...added]
  saveWorklistArticleTitles(cards.value.map((card) => card.title))
  addPending.value = false
  showAddDialog.value = false
}

const canAdd = computed(() => selectedPages.value.trim().length > 0)

const canSaveNote = computed(() => noteDraft.value.trim().length > 0)

const notePrimaryAction = computed(() => ({
  label: 'Save',
  actionType: 'progressive' as const,
  disabled: !canSaveNote.value,
}))

const noteDialogTitle = computed(() =>
  noteDialogMode.value === 'edit' ? 'Edit note' : 'Add a note',
)

const addPrimaryAction = computed(() => ({
  label: 'Add',
  actionType: 'progressive' as const,
  disabled: !canAdd.value || addPending.value,
}))

const hasActiveFilters = computed(
  () =>
    sortBy.value !== 'default'
    || qualityFilter.value !== 'all'
    || suggestionFilter.value !== 'all',
)

const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

const emptyListMessage = computed(() => {
  if (hasSearchQuery.value && hasActiveFilters.value) {
    return 'No articles match your search and filters.'
  }
  if (hasSearchQuery.value) {
    return 'No articles match your search.'
  }
  return 'No articles match these filters.'
})

const filteredCards = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()

  let result = cards.value.filter((card) => {
    if (normalizedSearch) {
      const haystack = `${card.title} ${card.description}`.toLowerCase()
      if (!haystack.includes(normalizedSearch)) {
        return false
      }
    }

    if (qualityFilter.value !== 'all' && qualityBand(card.qualityScore) !== qualityFilter.value) {
      return false
    }
    if (
      suggestionFilter.value !== 'all'
      && !card.suggestions.includes(suggestionFilter.value)
    ) {
      return false
    }
    return true
  })

  switch (sortBy.value) {
    case 'views-desc':
      result = [...result].sort((a, b) => b.viewsCount - a.viewsCount)
      break
    case 'views-asc':
      result = [...result].sort((a, b) => a.viewsCount - b.viewsCount)
      break
    case 'title-asc':
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'title-desc':
      result = [...result].sort((a, b) => b.title.localeCompare(a.title))
      break
    default:
      result = [...result].sort((a, b) => b.order - a.order)
  }

  return result
})

function openFilterDialog() {
  draftSortBy.value = sortBy.value
  draftQualityFilter.value = qualityFilter.value
  draftSuggestionFilter.value = suggestionFilter.value
  showFilterDialog.value = true
}

function applyFilters() {
  sortBy.value = draftSortBy.value
  qualityFilter.value = draftQualityFilter.value
  suggestionFilter.value = draftSuggestionFilter.value
  showFilterDialog.value = false
}

function resetFilters() {
  draftSortBy.value = 'default'
  draftQualityFilter.value = 'all'
  draftSuggestionFilter.value = 'all'
  sortBy.value = 'default'
  qualityFilter.value = 'all'
  suggestionFilter.value = 'all'
}

onMounted(async () => {
  const titles = getWorklistArticleTitles()
  cards.value = await Promise.all(
    titles.map((title, index) => fetchArticleCard(title, index, titles.length)),
  )
  loading.value = false
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" skin="mobile">
    <SpecialPageWrapper :title="null" class="wc2__special-page" skin="mobile">
      <template #header>
        <h1 class="wc2__page-title-text">
          Event details: Wiki Loves Earth 2026
        </h1>
      </template>
      <CdxTabs v-model:active="activeTab" class="wc2__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
          <nav class="wc2__toolbar" aria-label="Worklist actions">
            <div class="wc2__toolbar-row">
              <CdxButton
                class="wc2__toolbar-add"
                action="progressive"
                weight="normal"
                @click="openAddDialog"
              >
                <CdxIcon :icon="cdxIconAdd" />
                Add article
              </CdxButton>
              <CdxButton
                class="wc2__toolbar-history"
                weight="normal"
                :icon-only="true"
                aria-label="View history"
                @click="openWorklistHistory"
              >
                <CdxIcon :icon="cdxIconHistory" />
              </CdxButton>
              <CdxButton
                class="wc2__toolbar-filter"
                weight="normal"
                :action="hasActiveFilters ? 'progressive' : 'default'"
                :icon-only="true"
                aria-label="Filter and sort articles"
                @click="openFilterDialog"
              >
                <CdxIcon :icon="cdxIconConfigure" />
              </CdxButton>
            </div>
          </nav>

          <div v-if="!loading" class="wc2__search-row">
            <div class="wc2__search-wrap">
              <CdxSearchInput
                v-model="searchQuery"
                class="wc2__search"
                placeholder="Search articles"
                aria-label="Search articles"
              />
            </div>
          </div>

          <div class="wc2__page">
            <div v-if="loading" class="wc2__loading">Loading articles…</div>

            <template v-else>
              <p v-if="filteredCards.length === 0" class="wc2__filters-empty">
                {{ emptyListMessage }}
              </p>

              <ul v-else class="wc2__list" role="list">
              <li v-for="card in filteredCards" :key="card.title" class="wc2__card">
                <div
                  v-if="card.workingOn.length"
                  class="wc2__card-working-banner"
                >
                  Working on this:
                  <template v-for="(name, index) in card.workingOn" :key="name">
                    <span v-if="index > 0">, </span>
                    <span class="wc2__card-working-name">{{ name }}</span>
                  </template>
                </div>

                <div class="wc2__card-content">
                  <div class="wc2__card-header">
                    <div
                      class="wc2__quality-chip"
                      :class="`wc2__quality-chip--${qualityBand(card.qualityScore)}`"
                    >
                      <CdxInfoChip
                        :status="QUALITY_CHIP_STATUS"
                        :icon="qualityChipIcon(card.qualityScore)"
                      >
                        {{ qualityLabel(card.qualityScore) }}
                      </CdxInfoChip>
                    </div>
                    <CdxButton
                      weight="quiet"
                      :icon-only="true"
                      aria-label="Remove article"
                      class="wc2__card-remove"
                      @click="confirmRemove(card.title)"
                    >
                      <CdxIcon :icon="cdxIconTrash" />
                    </CdxButton>
                  </div>

                  <a
                    class="wc2__card-title"
                    :href="card.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ card.title }}</a>
                  <p v-if="card.description" class="wc2__card-description">
                    {{ card.description }}
                  </p>

                  <div class="wc2__card-meta">
                    <div class="wc2__meta-item">
                      <CdxIcon
                        :icon="cdxIconChartLine"
                        size="small"
                        class="wc2__meta-icon wc2__meta-icon--views"
                      />
                      <span class="wc2__meta-text">{{ shortViewsLabel(card.viewsCount) }}</span>
                    </div>

                    <div class="wc2__meta-item">
                      <CdxIcon
                        :icon="cdxIconLightbulb"
                        size="small"
                        class="wc2__meta-icon wc2__meta-icon--suggestion"
                      />
                      <span class="wc2__meta-text wc2__meta-text--suggestions">
                        <template
                          v-for="(suggestion, index) in visibleSuggestions(card.suggestions)"
                          :key="`${suggestion}-${index}`"
                        >
                          <span v-if="index > 0" class="wc2__suggestion-sep">, </span>
                          <span class="wc2__suggestion-text">{{ suggestion }}</span>
                        </template>
                        <span
                          v-if="extraSuggestionsCount(card.suggestions) > 0"
                          class="wc2__suggestion-more"
                        >
                          <span class="wc2__suggestion-sep">, </span>+{{ extraSuggestionsCount(card.suggestions) }} more
                        </span>
                      </span>
                    </div>
                  </div>

                  <div v-if="card.note" class="wc2__card-note">
                    <div class="wc2__card-note-header">
                      <p class="wc2__card-note-label">Note</p>
                      <div v-if="canEditNote(card)" class="wc2__card-note-actions">
                        <CdxButton
                          weight="quiet"
                          :icon-only="true"
                          aria-label="Edit note"
                          @click="openNoteDialog(card, 'edit')"
                        >
                          <CdxIcon :icon="cdxIconEdit" />
                        </CdxButton>
                        <CdxButton
                          weight="quiet"
                          :icon-only="true"
                          aria-label="Remove note"
                          @click="removeNote(card)"
                        >
                          <CdxIcon :icon="cdxIconTrash" />
                        </CdxButton>
                      </div>
                    </div>
                    <p class="wc2__card-note-text" v-html="linkifyNote(card.note.text)" />
                    <p class="wc2__card-note-meta">
                      {{ card.note.author }} · {{ formatNoteTime(card.note.addedAt) }}
                    </p>
                  </div>
                </div>
              </li>
              </ul>

              <CdxButton
                v-if="filteredCards.length > 0"
                class="wc2__visit-page"
                weight="normal"
                @click="openWorklistPage"
              >
                <CdxIcon :icon="cdxIconCode" />
                Visit worklist page
              </CdxButton>
            </template>
          </div>
        </CdxTab>
        <CdxTab name="contributions" label="Contributions" :disabled="true" />
      </CdxTabs>
    </SpecialPageWrapper>

  </ChromeWrapper>

  <CdxDialog
    v-model:open="showAddDialog"
    title="Add to worklist"
    close-button-label="Close"
    :dismissable="true"
    :primary-action="addPrimaryAction"
    @primary="onAdd"
  >
    <div class="wc2__dialog-body">
      <CdxField>
        <template #label>Search Wikipedia</template>
        <div :class="{ 'wc2__lookup--redlink': lookupIsRedLink }">
          <CdxLookup
            v-model:selected="lookupSelected"
            v-model:input-value="lookupInput"
            :menu-items="lookupMenuItems"
            :loading="lookupPending"
            placeholder="Search Wikipedia"
            @input="onLookupInput"
          />
        </div>
      </CdxField>

      <div class="wc2__dialog-or">or</div>

      <CdxField>
        <template #label>List pages</template>
        <template #description>One title per line</template>
        <CdxTextArea
          v-model="selectedPages"
          :rows="5"
          :placeholder="'Earth\nMoon\nJupiter'"
          class="wc2__pages-textarea"
        />
      </CdxField>
    </div>
  </CdxDialog>

  <CdxDialog
    v-model:open="showNoteDialog"
    :title="noteDialogTitle"
    subtitle="Notes are public and visible to everyone on this worklist."
    close-button-label="Close"
    :dismissable="true"
    :primary-action="notePrimaryAction"
    @primary="onNoteSave"
  >
    <CdxTextArea
      v-model="noteDraft"
      :rows="4"
      placeholder="What should others know about working on this article?"
      class="wc2__note-textarea"
    />
  </CdxDialog>

  <CdxDialog
    v-model:open="showFilterDialog"
    title="Filter"
    close-button-label="Close"
    class="wc2__filter-dialog-modal"
    :dismissable="true"
  >
    <div class="wc2__filter-dialog">
      <CdxField class="wc2__filter-dialog-field">
        <template #label>Sort</template>
        <CdxSelect
          v-model:selected="draftSortBy"
          :menu-items="SORT_OPTIONS"
          default-label="Recently added"
        />
      </CdxField>

      <CdxField class="wc2__filter-dialog-field">
        <template #label>Quality</template>
        <CdxSelect
          v-model:selected="draftQualityFilter"
          :menu-items="QUALITY_FILTER_OPTIONS"
          default-label="All quality"
        />
      </CdxField>

      <CdxField class="wc2__filter-dialog-field">
        <template #label>Edit suggestions</template>
        <CdxSelect
          v-model:selected="draftSuggestionFilter"
          :menu-items="SUGGESTION_FILTER_OPTIONS"
          default-label="All suggestions"
        />
      </CdxField>
    </div>

    <template #footer>
      <div class="wc2__filter-dialog-footer">
        <CdxButton
          class="wc2__filter-dialog-apply"
          action="progressive"
          weight="primary"
          @click="applyFilters"
        >
          Apply
        </CdxButton>
        <CdxButton
          class="wc2__filter-dialog-reset"
          weight="normal"
          @click="resetFilters"
        >
          Reset all filters
        </CdxButton>
      </div>
    </template>
  </CdxDialog>

  <CdxDialog
    v-model:open="showRemoveDialog"
    title="Remove article from worklist"
    close-button-label="Cancel"
    :dismissable="true"
    :primary-action="{ label: 'Remove', actionType: 'destructive' }"
    :default-action="{ label: 'Cancel' }"
    @primary="onRemoveConfirmed"
    @default="onRemoveCancelled"
  >
    <p class="wc2__remove-message">Are you sure you want to remove this article from the worklist?</p>
  </CdxDialog>
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

.wc2__page-title-text {
  width: 100%;
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

.wc2__tabs {
  margin-bottom: var(--spacing-150);
}

.wc2__tabs:deep(.cdx-tabs__header) {
  margin-bottom: 0;
}

.wc2__tabs:deep([role="tabpanel"]) {
  padding: 0;
  margin: 0;
}

.wc2__page {
  padding-top: 0;
}

.wc2__loading {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  padding: var(--spacing-100) 0;
}

.wc2__toolbar {
  margin-top: var(--spacing-100);
  margin-bottom: var(--spacing-100);
}

.wc2__toolbar-row {
  display: flex;
  gap: var(--spacing-50);
  align-items: stretch;
}

.wc2__toolbar-add:deep(.cdx-button),
.wc2__visit-page:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
  gap: var(--spacing-50);
  padding-inline: var(--spacing-75);
  box-sizing: border-box;
}

.wc2__toolbar-add:deep(.cdx-icon),
.wc2__visit-page:deep(.cdx-icon) {
  flex-shrink: 0;
}

.wc2__toolbar-add {
  flex: 1 1 auto;
  min-width: 0;
}

.wc2__toolbar-history,
.wc2__toolbar-filter {
  flex-shrink: 0;
}

.wc2__search-row {
  display: flex;
  align-items: stretch;
  margin-bottom: var(--spacing-100);
}

.wc2__search-wrap {
  flex: 1 1 0;
  min-width: 0;
}

.wc2__search {
  display: block;
  width: 100%;
  max-width: 100%;
}

.wc2__search:deep(.cdx-search-input),
.wc2__search:deep(.cdx-text-input) {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.wc2__filters-empty {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wc2__filter-dialog-modal:deep(.cdx-dialog__body) {
  padding-bottom: 0;
}

.wc2__filter-dialog-modal:deep(.cdx-dialog__footer) {
  padding-top: var(--spacing-150);
  border-top: none;
}

.wc2__filter-dialog {
  display: flex;
  flex-direction: column;
}

.wc2__filter-dialog-field {
  margin: 0;
}

.wc2__filter-dialog-field:not(:last-child) {
  margin-bottom: var(--spacing-100);
}

.wc2__filter-dialog-field:deep(.cdx-label) {
  display: block;
  padding-bottom: 0;
  margin-bottom: var(--spacing-50);
}

.wc2__filter-dialog-field:deep(.cdx-label__label__text) {
  font-weight: var(--font-weight-bold);
}

.wc2__filter-dialog-field:deep(.cdx-select-vue) {
  width: 100%;
}

.wc2__filter-dialog-footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  width: 100%;
}

.wc2__filter-dialog-apply {
  display: block;
  width: 100%;
}

.wc2__filter-dialog-apply:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.wc2__filter-dialog-reset {
  display: block;
  width: 100%;
}

.wc2__filter-dialog-reset:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.wc2__visit-page {
  display: block;
  width: 100%;
  margin-top: var(--spacing-100);
}

.wc2__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wc2__list > li {
  margin: 0;
}

.wc2__card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.wc2__card-working-banner {
  padding: var(--spacing-50) var(--spacing-100);
  background-color: var(--background-color-notice-subtle);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.wc2__card-working-name {
  color: var(--color-progressive);
}

.wc2__card-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: var(--spacing-75);
  min-width: 0;
}

.wc2__card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wc2__quality-chip {
  min-width: 0;
}

.wc2__quality-chip:deep(.cdx-info-chip) {
  max-width: 100%;
}

.wc2__quality-chip:deep(.cdx-info-chip__text) {
  color: var(--color-base);
}

.wc2__quality-chip:deep(.cdx-info-chip__icon--vue) {
  color: var(--color-subtle);
}

.wc2__quality-chip--high:deep(.cdx-info-chip__icon--vue) {
  color: var(--color-base);
}

.wc2__card-remove {
  flex-shrink: 0;
  margin: calc(-1 * var(--spacing-25)) calc(-1 * var(--spacing-25)) 0 0;
}

.wc2__card-title {
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
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
  color: var(--color-subtle);
  line-height: var(--line-height-small);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wc2__card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100);
  margin-top: var(--spacing-50);
}

.wc2__meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wc2__meta-icon {
  flex-shrink: 0;
}

.wc2__meta-icon--views {
  color: var(--color-subtle);
}

.wc2__meta-icon--suggestion {
  color: var(--color-subtle);
}

.wc2__meta-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wc2__meta-text--suggestions {
  color: var(--color-subtle);
}

.wc2__card-note {
  padding: var(--spacing-75);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-option-yellow, #fdf2d5);
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  margin-top: var(--spacing-50);
}

.wc2__card-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-25);
}

.wc2__card-note-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: calc(-1 * var(--spacing-25)) calc(-1 * var(--spacing-25)) 0 0;
}

.wc2__card-note-label {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wc2__card-note-text {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wc2__card-note-text :deep(.wc2__card-note-link) {
  color: var(--color-progressive);
  text-decoration: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wc2__card-note-text :deep(.wc2__card-note-link:hover) {
  text-decoration: underline;
}

.wc2__card-note-meta {
  margin: var(--spacing-50) 0 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wc2__suggestion-text {
  color: var(--color-subtle);
}

.wc2__suggestion-sep {
  color: var(--color-subtle);
}

.wc2__suggestion-more {
  color: var(--color-subtle);
}

.wc2__dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wc2__dialog-or + * {
  margin-top: calc(-1 * var(--spacing-50));
}

.wc2__dialog-or {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.wc2__dialog-or::before,
.wc2__dialog-or::after {
  content: '';
  flex: 1;
  border-top: var(--border-width-base) solid var(--border-color-subtle);
}

.wc2__pages-textarea :deep(textarea) {
  resize: vertical;
}

.wc2__note-textarea :deep(textarea) {
  resize: vertical;
}

.wc2__remove-message {
  margin: 0;
}

.wc2__lookup--redlink :deep(.cdx-menu-item__text__label) {
  color: var(--color-destructive, #d73333);
}
</style>
