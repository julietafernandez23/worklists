<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxLookup,
  CdxMenuButton,
  CdxSelect,
  CdxTab,
  CdxTabs,
  CdxTextArea,
} from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import {
  cdxIconAdd,
  cdxIconArrowDown,
  cdxIconArrowUp,
  cdxIconChartLine,
  cdxIconClose,
  cdxIconCode,
  cdxIconEdit,
  cdxIconEllipsis,
  cdxIconConfigure,
  cdxIconHistory,
  cdxIconInfo,
  cdxIconLightbulb,
  cdxIconTrash,
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

interface ArticleNote {
  text: string
  author: string
  addedAt: Date
}

interface ArticleCard {
  title: string
  description: string
  url: string
  viewsPerMonth: string
  viewsCount: number
  order: number
  quality: Quality
  suggestions: string[]
  workingOn: string[]
  note: ArticleNote | null
}

const CURRENT_USERNAME = 'LittleBird'

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

const SUGGESTION_FILTER_OPTIONS: MenuItemData[] = [
  { value: 'all', label: 'All suggestions' },
  { value: 'Add a citation', label: 'Add a citation' },
  { value: 'Add a link', label: 'Add a link' },
  { value: 'Remove duplicated link', label: 'Remove duplicated link' },
  { value: 'Revise tone', label: 'Revise tone' },
]

const SORT_OPTIONS: MenuItemData[] = [
  { value: 'default', label: 'Default order' },
  { value: 'views-desc', label: 'Most views' },
  { value: 'views-asc', label: 'Fewest views' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
]

const QUALITY_FILTER_OPTIONS: MenuItemData[] = [
  { value: 'all', label: 'All quality' },
  { value: 'high', label: 'High quality' },
  { value: 'medium', label: 'Medium quality' },
  { value: 'low', label: 'Low quality' },
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

async function fetchArticleCard(title: string, index: number): Promise<ArticleCard> {
  const wikiTitle = title.replace(/ /g, '_')
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
    )
    const data = await res.json()
    return {
      title: data.title ?? title,
      description: data.description?.trim() || '',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      viewsPerMonth: fakeViews(index),
      viewsCount: VIEW_COUNTS[index % VIEW_COUNTS.length],
      order: index,
      quality: QUALITY_CYCLE[index % QUALITY_CYCLE.length],
      suggestions: SUGGESTION_SETS[index % SUGGESTION_SETS.length],
      workingOn: index === 1 ? ['Sam'] : [],
      note: null,
    }
  } catch {
    return {
      title,
      description: '',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      viewsPerMonth: fakeViews(index),
      viewsCount: VIEW_COUNTS[index % VIEW_COUNTS.length],
      order: index,
      quality: QUALITY_CYCLE[index % QUALITY_CYCLE.length],
      suggestions: SUGGESTION_SETS[index % SUGGESTION_SETS.length],
      workingOn: index === 1 ? ['Sam'] : [],
      note: null,
    }
  }
}

const REDLINK_PREFIX = '__redlink__:'

const cards = ref<ArticleCard[]>([])
const loading = ref(true)
const activeTab = ref('worklist')
const sortBy = ref('default')
const qualityFilter = ref('all')
const suggestionFilter = ref('all')
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

const showNoteDialog = ref(false)
const noteDialogCard = ref<ArticleCard | null>(null)
const noteDialogMode = ref<'add' | 'edit'>('add')
const noteDraft = ref('')

const showRemoveDialog = ref(false)
const pendingRemoveTitle = ref<string | null>(null)

const showQualityHelpSheet = ref(false)

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

function cardMenuItems(card: ArticleCard): MenuItemData[] {
  const items: MenuItemData[] = [{ value: 'remove', label: 'Remove' }]

  if (isWorkingOn(card)) {
    items.push({ value: 'stop-working', label: 'Stop working on this' })
  } else {
    items.push({ value: 'start-working', label: "I'm working on this" })
  }

  if (!card.note) {
    items.push({ value: 'add-note', label: 'Add a note' })
  }

  return items
}

function isWorkingOn(card: ArticleCard): boolean {
  return card.workingOn.includes(CURRENT_USERNAME)
}

function startWorkingOn(card: ArticleCard) {
  if (!isWorkingOn(card)) {
    card.workingOn = [...card.workingOn, CURRENT_USERNAME]
  }
}

function stopWorkingOn(card: ArticleCard) {
  card.workingOn = card.workingOn.filter((name) => name !== CURRENT_USERNAME)
}

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
  showRemoveDialog.value = false
  pendingRemoveTitle.value = null
}

function onRemoveCancelled() {
  showRemoveDialog.value = false
  pendingRemoveTitle.value = null
}

function onCardMenuAction(card: ArticleCard, action: string | null) {
  if (action === 'start-working') {
    startWorkingOn(card)
  } else if (action === 'stop-working') {
    stopWorkingOn(card)
  } else if (action === 'add-note') {
    openNoteDialog(card, 'add')
  } else if (action === 'remove') {
    confirmRemove(card.title)
  }
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
  const added = await Promise.all(
    newTitles.map((title, offset) => fetchArticleCard(title, startIndex + offset)),
  )
  cards.value = [...cards.value, ...added]
  addPending.value = false
  showAddDialog.value = false
}

const canAdd = computed(() => selectedPages.value.trim().length > 0)

const addPrimaryAction = computed(() => ({
  label: 'Add',
  actionType: 'progressive' as const,
  disabled: !canAdd.value || addPending.value,
}))

const canSaveNote = computed(() => noteDraft.value.trim().length > 0)

const notePrimaryAction = computed(() => ({
  label: 'Save',
  actionType: 'progressive' as const,
  disabled: !canSaveNote.value,
}))

const noteDialogTitle = computed(() =>
  noteDialogMode.value === 'edit' ? 'Edit note' : 'Add a note',
)

const hasActiveFilters = computed(
  () =>
    sortBy.value !== 'default'
    || qualityFilter.value !== 'all'
    || suggestionFilter.value !== 'all',
)

const filteredCards = computed(() => {
  let result = cards.value.filter((card) => {
    if (qualityFilter.value !== 'all' && card.quality !== qualityFilter.value) {
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
      result = [...result].sort((a, b) => a.order - b.order)
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

onMounted(async () => {
  cards.value = await Promise.all(
    ARTICLES.map((title, index) => fetchArticleCard(title, index)),
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

          <div class="wc2__page">
            <div v-if="loading" class="wc2__loading">Loading articles…</div>

            <template v-else>
              <p v-if="filteredCards.length === 0" class="wc2__filters-empty">
                No articles match these filters.
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
                  <div class="wc2__card-top">
                    <a
                      class="wc2__card-title"
                      :href="card.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{ card.title }}</a>
                    <CdxMenuButton
                      :menu-items="cardMenuItems(card)"
                      weight="quiet"
                      aria-label="Article options"
                      class="wc2__card-menu"
                      @update:selected="(action) => onCardMenuAction(card, action)"
                    >
                      <CdxIcon :icon="cdxIconEllipsis" />
                    </CdxMenuButton>
                    <p class="wc2__card-description">{{ card.description }}</p>
                  </div>

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
                          <span class="wc2__suggestion-text">{{ suggestion }}</span>
                        </template>
                      </span>
                    </div>

                    <div
                      class="wc2__signal wc2__signal--quality"
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
                      <CdxButton
                        weight="quiet"
                        :icon-only="true"
                        size="small"
                        aria-label="What is article quality?"
                        class="wc2__quality-help"
                        @click="showQualityHelpSheet = true"
                      >
                        <CdxIcon :icon="cdxIconInfo" size="small" />
                      </CdxButton>
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

    <Transition name="wc2-sheet">
      <div
        v-if="showQualityHelpSheet"
        class="wc2__sheet-backdrop"
        @click.self="showQualityHelpSheet = false"
      >
        <div class="wc2__sheet">
          <div class="wc2__sheet-header">
            <p class="wc2__sheet-title">What is this?</p>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Close"
              @click="showQualityHelpSheet = false"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>
          <p class="wc2__sheet-body">
            Article quality is an automatic estimate of how complete the article's structure is. It looks at signals like article length, references, section headings, media, and categories.
          </p>
        </div>
      </div>
    </Transition>
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
          default-label="Default order"
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
      <CdxButton
        class="wc2__filter-dialog-apply"
        action="progressive"
        weight="primary"
        @click="applyFilters"
      >
        Apply
      </CdxButton>
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

.wc2__filter-dialog-apply {
  display: block;
  width: 100%;
}

.wc2__filter-dialog-apply:deep(.cdx-button) {
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
  gap: var(--spacing-25);
  padding: var(--spacing-75) var(--spacing-100);
  min-width: 0;
}

.wc2__card-top {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: var(--spacing-50);
  row-gap: var(--spacing-25);
}

.wc2__card-menu {
  grid-column: 2;
  grid-row: 1;
  flex-shrink: 0;
  align-self: start;
  margin: -2px -4px 0 0;
}

.wc2__card-title {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
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
  grid-column: 1 / -1;
  grid-row: 2;
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

.wc2__card-signals {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin-top: var(--spacing-50);
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

.wc2__suggestion-text {
  color: var(--color-progressive);
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

.wc2__signal--quality {
  align-items: center;
}

.wc2__quality-help {
  flex-shrink: 0;
  margin: -2px 0 -2px calc(-1 * var(--spacing-25));
  color: var(--color-subtle);
}

.wc2__sheet-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.wc2__sheet {
  width: 100%;
  background-color: var(--background-color-base);
  padding: var(--spacing-100);
}

.wc2__sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-75);
}

.wc2__sheet-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.wc2__sheet-body {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wc2-sheet-enter-active {
  transition: opacity 0.3s ease;
}

.wc2-sheet-leave-active {
  transition: opacity 0.25s ease;
}

.wc2-sheet-enter-active .wc2__sheet {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.wc2-sheet-leave-active .wc2__sheet {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}

.wc2-sheet-enter-from,
.wc2-sheet-leave-to {
  opacity: 0;
}

.wc2-sheet-enter-from .wc2__sheet {
  transform: translateY(100%);
}

.wc2-sheet-leave-to .wc2__sheet {
  transform: translateY(100%);
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
