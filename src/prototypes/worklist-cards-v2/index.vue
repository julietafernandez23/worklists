<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxInfoChip,
  CdxLookup,
  CdxMessage,
  CdxSearchInput,
  CdxSelect,
  CdxTab,
  CdxTabs,
  CdxTextArea,
  CdxTooltip,
} from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import {
  cdxIconAdd,
  cdxIconChartLine,
  cdxIconCode,
  cdxIconConfigure,
  cdxIconEdit,
  cdxIconHistory,
  cdxIconLightbulb,
  cdxIconTrash,
} from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import {
  DEFAULT_EVENT_WORKLIST_ID,
  getWorklistArticleTitles,
  saveWorklistArticleTitles,
} from '@/lib/event-worklist-storage'
import {
  otherSuggestedTaskCount,
  otherSuggestedTasksSuffix,
} from '@/lib/worklist-card-signals'
import {
  COLLECTION_LOOKUP_PREFIX,
  collectionNameFromLine,
  formatCollectionLine,
} from '@/lib/worklist-collection-line'
import { registerCollection } from '@/prototypes/collections-view-modes/saved-items'
import { useSkin } from '@/composables/useSkin'

const vTooltip = CdxTooltip

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

const route = useRoute()
const skin = useSkin()
const isMobileSkin = computed(() => skin.value === 'mobile')

const eventWorklistId = computed(() => {
  const value = route.query.event
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_EVENT_WORKLIST_ID
})

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

const VIEW_COUNTS = [20, 5, 35, 12, 8, 15, 120, 9, 45, 28, 6, 18, 22, 11, 33]

const RECOMMENDED_TASKS = [
  'Add citations',
  'Add links',
  'Improve headings',
  'Add images',
  'Add an infobox',
  'Add categories',
  'Expand article',
  'Check maintenance message',
] as const

const RECOMMENDED_TASK_TOOLTIPS: Record<(typeof RECOMMENDED_TASKS)[number], string> = {
  'Add citations': 'Help readers understand where this information is coming from',
  'Add links': 'Connect this article to related topics on Wikipedia',
  'Improve headings': 'Give the article clearer structure with section headings',
  'Add images': 'Illustrate the article with photos or other media',
  'Add an infobox': 'Help readers scan key facts with an infobox',
  'Add categories': 'Help readers discover this article through categories',
  'Expand article': 'Add more detail so the article better covers its topic',
  'Check maintenance message': 'Resolve the issue flagged by the maintenance message on this article',
}

/** Highest-priority task first — used to pick one label per card. */
const RECOMMENDED_TASK_PRIORITY: readonly string[] = [
  'Check maintenance message',
  'Add citations',
  'Expand article',
  'Add an infobox',
  'Improve headings',
  'Add images',
  'Add links',
  'Add categories',
]

/** Demo tasks per card — lead task cycles all eight types; optional lower-priority extra for filters. */
function fakeSuggestions(index: number): string[] {
  const lead = RECOMMENDED_TASKS[index % RECOMMENDED_TASKS.length]
  const leadRank = RECOMMENDED_TASK_PRIORITY.indexOf(lead)
  const lowerPriority = RECOMMENDED_TASK_PRIORITY.slice(leadRank + 1)
  if (!lowerPriority.length) return [lead]
  if (index % 4 === 0) {
    const extras = lowerPriority.slice(0, 5)
    return uniqueSuggestions([lead, ...extras])
  }
  const extra = lowerPriority[(index + 1) % lowerPriority.length]
  return extra === lead ? [lead] : [lead, extra]
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

function primaryRecommendedTask(suggestions: string[]): string | null {
  const unique = uniqueSuggestions(suggestions)
  if (!unique.length) return null
  for (const task of RECOMMENDED_TASK_PRIORITY) {
    if (unique.includes(task)) return task
  }
  return unique[0]
}

function recommendedTaskTooltip(task: string): string {
  return RECOMMENDED_TASK_TOOLTIPS[task as (typeof RECOMMENDED_TASKS)[number]]
    ?? task
}

const SUGGESTION_FILTER_OPTIONS: MenuItemData[] = [
  { value: 'all', label: 'All tasks' },
  ...RECOMMENDED_TASKS.map(task => ({ value: task, label: task })),
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

const IMPACT_OPPORTUNITY_LABEL: Record<QualityBand, string> = {
  low: 'High impact opportunity',
  medium: 'Medium impact opportunity',
  high: 'Low impact opportunity',
}

function qualityLabel(score: number): string {
  return IMPACT_OPPORTUNITY_LABEL[qualityBand(score)]
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
  wikiHost = 'en.wikipedia.org',
): Promise<ArticleCard> {
  const wikiTitle = title.replace(/ /g, '_')
  const wikiLabel = wikiLabelForHost(wikiHost)
  const summaryUrl = `https://${wikiHost}/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`

  const summaryResult = await fetch(summaryUrl)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)

  if (summaryResult) {
    const qualityMetrics = fakeQualityMetrics(QUALITY_CYCLE[index % QUALITY_CYCLE.length], index)
    return {
      title: summaryResult.title ?? title,
      description: summaryResult.description?.trim() || '',
      url: summaryResult.content_urls?.desktop?.page
        ?? `https://${wikiHost}/wiki/${encodeURIComponent(wikiTitle)}`,
      wiki: wikiLabel,
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
    url: `https://${wikiHost}/wiki/${encodeURIComponent(wikiTitle)}`,
    wiki: wikiLabel,
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

const ADD_WIKI_OPTIONS: MenuItemData[] = [
  { value: 'en.wikipedia.org', label: 'English Wikipedia' },
  { value: 'es.wikipedia.org', label: 'Spanish Wikipedia' },
  { value: 'de.wikipedia.org', label: 'German Wikipedia' },
  { value: 'fr.wikipedia.org', label: 'French Wikipedia' },
  { value: 'pt.wikipedia.org', label: 'Portuguese Wikipedia' },
  { value: 'commons.wikimedia.org', label: 'Wikimedia Commons' },
  { value: 'www.wikidata.org', label: 'Wikidata' },
]

function wikiLabelForHost(host: string): string {
  const match = ADD_WIKI_OPTIONS.find(option => option.value === host)
  return match?.label ?? host
}

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
const addWikiHost = ref('en.wikipedia.org')

const lookupInput = ref('')
const lookupSelected = ref<string | null>(null)
const lookupMenuItems = ref<MenuItemData[]>([])
const lookupPending = ref(false)
const lookupIsRedLink = ref(false)
const lookupIsCollection = ref(false)
const selectedPages = ref('')
const addCollectionNotice = ref<string | null>(null)

const showRemoveDialog = ref(false)
const pendingRemoveTitle = ref<string | null>(null)

const showNoteDialog = ref(false)
const noteDialogCard = ref<ArticleCard | null>(null)
const noteDialogMode = ref<'add' | 'edit'>('add')
const noteDraft = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(lookupSelected, (val) => {
  if (!val) return
  let lineToAppend = val
  if (val.startsWith(COLLECTION_LOOKUP_PREFIX)) {
    const name = val.slice(COLLECTION_LOOKUP_PREFIX.length)
    lineToAppend = formatCollectionLine(name)
  } else if (val.startsWith(REDLINK_PREFIX)) {
    lineToAppend = val.slice(REDLINK_PREFIX.length)
  }
  const current = selectedPages.value.trim()
  selectedPages.value = current ? `${current}\n${lineToAppend}` : lineToAppend
  lookupSelected.value = null
  lookupInput.value = ''
  lookupMenuItems.value = []
  lookupIsRedLink.value = false
  lookupIsCollection.value = false
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
  saveWorklistArticleTitles(cards.value.map((card) => card.title), eventWorklistId.value)
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

function showCollectionLookupOption(query: string): boolean {
  const name = collectionNameFromLine(query)
  if (!name) {
    lookupIsCollection.value = false
    return false
  }
  lookupIsRedLink.value = false
  lookupIsCollection.value = true
  lookupMenuItems.value = [
    {
      value: `${COLLECTION_LOOKUP_PREFIX}${name}`,
      label: formatCollectionLine(name),
    },
  ]
  return true
}

async function searchArticles(query: string) {
  if (!query.trim()) {
    lookupMenuItems.value = []
    lookupIsCollection.value = false
    return
  }
  if (showCollectionLookupOption(query)) {
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
    const res = await fetch(`https://${addWikiHost.value}/w/api.php?${params}`)
    const [, titles] = (await res.json()) as [string, string[]]
    if (titles.length > 0) {
      lookupIsRedLink.value = false
      lookupIsCollection.value = false
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
  lookupIsCollection.value = false
  addWikiHost.value = 'en.wikipedia.org'
  addCollectionNotice.value = null
  showAddDialog.value = true
}

function onAddWikiSelected(value: string | null) {
  if (!value) return
  addWikiHost.value = value
  lookupMenuItems.value = []
  lookupIsRedLink.value = false
  if (lookupInput.value.trim()) {
    searchArticles(lookupInput.value)
  }
}

function cardIdentityKey(wiki: string, title: string): string {
  return `${wiki.toLowerCase()}::${title.toLowerCase()}`
}

async function onAdd() {
  const lines = selectedPages.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const collectionNames: string[] = []
  const articleLines: string[] = []

  for (const line of lines) {
    const collectionName = collectionNameFromLine(line)
    if (collectionName) {
      collectionNames.push(collectionName)
    } else {
      articleLines.push(line)
    }
  }

  for (const name of collectionNames) {
    registerCollection(name)
  }

  if (collectionNames.length) {
    addCollectionNotice.value = collectionNames.length === 1
      ? `Collection “${collectionNames[0]}” was added to your saved collections (demo).`
      : `${collectionNames.length} collections were added to your saved collections (demo).`
  }

  const wikiLabel = wikiLabelForHost(addWikiHost.value)
  const existingKeys = new Set(
    cards.value.map((card) => cardIdentityKey(card.wiki, card.title)),
  )
  const newTitles = articleLines.filter(
    (title) => !existingKeys.has(cardIdentityKey(wikiLabel, title)),
  )

  if (!newTitles.length) {
    showAddDialog.value = false
    return
  }

  addPending.value = true
  const startIndex = cards.value.length
  const totalAfterAdd = startIndex + newTitles.length
  const added = await Promise.all(
    newTitles.map((title, offset) =>
      fetchArticleCard(
        title,
        startIndex + offset,
        totalAfterAdd,
        new Date(),
        addWikiHost.value,
      ),
    ),
  )
  cards.value = [...cards.value, ...added]
  saveWorklistArticleTitles(cards.value.map((card) => card.title), eventWorklistId.value)
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

async function loadWorklistCards() {
  loading.value = true
  const titles = getWorklistArticleTitles(eventWorklistId.value)
  cards.value = await Promise.all(
    titles.map((title, index) => fetchArticleCard(title, index, titles.length)),
  )
  loading.value = false
}

onMounted(loadWorklistCards)

watch(eventWorklistId, loadWorklistCards)
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="wc2__special-page">
      <template #header>
        <h1 class="wc2__page-title-text">
          Event details: Wiki Loves Earth 2026
        </h1>
      </template>
      <CdxTabs v-model:active="activeTab" class="wc2__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
          <div class="wc2__skin-root" :data-skin="skin">
          <nav class="wc2__toolbar" aria-label="Worklist actions">
            <div class="wc2__toolbar-bar">
              <div class="wc2__toolbar-actions">
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
                  :icon-only="isMobileSkin"
                  :aria-label="isMobileSkin ? 'View history' : undefined"
                  @click="openWorklistHistory"
                >
                  <CdxIcon :icon="cdxIconHistory" />
                  <span v-if="!isMobileSkin">History</span>
                </CdxButton>
                <CdxButton
                  class="wc2__toolbar-filter"
                  weight="normal"
                  :action="hasActiveFilters ? 'progressive' : 'default'"
                  :icon-only="isMobileSkin"
                  :aria-label="isMobileSkin ? 'Filter and sort articles' : undefined"
                  @click="openFilterDialog"
                >
                  <CdxIcon :icon="cdxIconConfigure" />
                  <span v-if="!isMobileSkin">Filters</span>
                </CdxButton>
              </div>

              <div
                v-if="!loading && !isMobileSkin"
                class="wc2__toolbar-search"
              >
                <div class="wc2__search-with-button">
                  <CdxSearchInput
                    v-model="searchQuery"
                    class="wc2__search wc2__search--toolbar"
                    placeholder="Search"
                    aria-label="Search articles"
                  />
                  <CdxButton
                    class="wc2__search-submit"
                    weight="normal"
                    type="button"
                  >
                    Search
                  </CdxButton>
                </div>
              </div>
            </div>
          </nav>

          <div v-if="!loading && isMobileSkin" class="wc2__search-row">
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
            <CdxMessage
              v-if="addCollectionNotice"
              type="success"
              class="wc2__collection-notice"
              :allow-user-dismiss="true"
              @user-dismissed="addCollectionNotice = null"
            >
              {{ addCollectionNotice }}
            </CdxMessage>

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
                      <CdxInfoChip :status="QUALITY_CHIP_STATUS">
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
                        <template v-if="primaryRecommendedTask(card.suggestions)">
                          <span
                            v-if="!isMobileSkin"
                            v-tooltip="recommendedTaskTooltip(primaryRecommendedTask(card.suggestions)!)"
                            tabindex="0"
                            class="wc2__suggestion-text wc2__suggestion-text--tooltip"
                          >
                            {{ primaryRecommendedTask(card.suggestions) }}
                          </span>
                          <span
                            v-else
                            class="wc2__suggestion-text"
                          >
                            {{ primaryRecommendedTask(card.suggestions) }}
                          </span>
                          <span
                            v-if="otherSuggestedTaskCount(card.suggestions)"
                            class="wc2__suggestion-remainder"
                          >
                            {{ otherSuggestedTasksSuffix(otherSuggestedTaskCount(card.suggestions)) }}
                          </span>
                        </template>
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
      <CdxField class="wc2__add-dialog-wiki-field">
        <template #label>Wiki</template>
        <CdxSelect
          :selected="addWikiHost"
          :menu-items="ADD_WIKI_OPTIONS"
          @update:selected="onAddWikiSelected"
        />
      </CdxField>

      <CdxField>
        <template #label>Search Wikipedia</template>
        <div
          :class="{
            'wc2__lookup--redlink': lookupIsRedLink,
            'wc2__lookup--collection': lookupIsCollection,
          }"
        >
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
        <template #description>
          One title per line, or Collection:Name to create a saved collection (demo).
        </template>
        <CdxTextArea
          v-model="selectedPages"
          :rows="5"
          :placeholder="'Earth\nMoon\nCollection:Birds I like'"
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
        <template #label>Recommended tasks</template>
        <CdxSelect
          v-model:selected="draftSuggestionFilter"
          :menu-items="SUGGESTION_FILTER_OPTIONS"
          default-label="All tasks"
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

.wc2__toolbar-bar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.wc2__skin-root[data-skin='desktop'] .wc2__toolbar-bar {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-100);
}

.wc2__toolbar-actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--spacing-50);
  align-items: stretch;
  min-width: 0;
}

.wc2__toolbar-add:deep(.cdx-button),
.wc2__toolbar-history:deep(.cdx-button),
.wc2__toolbar-filter:deep(.cdx-button),
.wc2__visit-page:deep(.cdx-button) {
  gap: var(--spacing-50);
  padding-inline: var(--spacing-75);
  box-sizing: border-box;
  width: auto;
  justify-content: center;
  white-space: nowrap;
}

.wc2__skin-root[data-skin='mobile'] .wc2__toolbar-add {
  flex: 1 1 auto;
  min-width: 0;
}

.wc2__skin-root[data-skin='mobile'] .wc2__toolbar-add:deep(.cdx-button) {
  width: 100%;
}

.wc2__visit-page:deep(.cdx-button) {
  width: 100%;
  justify-content: center;
}

.wc2__toolbar-add:deep(.cdx-icon),
.wc2__toolbar-history:deep(.cdx-icon),
.wc2__toolbar-filter:deep(.cdx-icon),
.wc2__visit-page:deep(.cdx-icon) {
  flex-shrink: 0;
}

.wc2__toolbar-add {
  flex-shrink: 0;
}

.wc2__toolbar-history,
.wc2__toolbar-filter {
  flex-shrink: 0;
}

.wc2__toolbar-search {
  flex: 1 1 auto;
  min-width: 12rem;
  max-width: 28rem;
}

.wc2__skin-root[data-skin='desktop'] .wc2__toolbar-search {
  margin-inline-start: auto;
}

.wc2__search-with-button {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
}

.wc2__search--toolbar {
  flex: 1 1 auto;
  min-width: 0;
}

.wc2__search--toolbar:deep(.cdx-search-input),
.wc2__search--toolbar:deep(.cdx-text-input) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.wc2__search-submit {
  flex-shrink: 0;
}

.wc2__search-submit:deep(.cdx-button) {
  height: 100%;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-inline-start: calc(-1 * var(--border-width-base, 1px));
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

.wc2__skin-root[data-skin='desktop'] .wc2__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-100);
  align-items: stretch;
}

.wc2__list > li {
  margin: 0;
  min-width: 0;
}

.wc2__card {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.wc2__suggestion-text--tooltip {
  cursor: help;
  border-bottom: var(--border-width-base) dotted var(--border-color-subtle);
}

.wc2__suggestion-remainder {
  color: var(--color-subtle);
  cursor: default;
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

.wc2__add-dialog-wiki-field {
  width: 100%;
  min-width: 0;
}

.wc2__add-dialog-wiki-field:deep(.cdx-select-vue) {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.wc2__add-dialog-wiki-field:deep(.cdx-select-vue__handle) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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

.wc2__lookup--collection :deep(.cdx-menu-item__text__label) {
  color: var(--color-progressive);
}

.wc2__collection-notice {
  margin-bottom: var(--spacing-100);
}
</style>
