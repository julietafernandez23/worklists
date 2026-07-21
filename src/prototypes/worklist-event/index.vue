<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxLookup,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxTextArea,
} from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import { cdxIconAdd, cdxIconTrash } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Event worklist MVP',
    description: 'Event worklist — article lookup, bulk paste, and table view.',
  },
})

const REDLINK_PREFIX = '__redlink__:'

interface WorklistRow {
  id: string
  article: string
  articleUrl: string
  wiki: string
  dateAdded: Date
  isRedLink: boolean
}

const activeTab = ref('worklist')
const showAddDialog = ref(false)
const showIntroDialog = ref(true)

// Lookup state
const lookupInput = ref('')
const lookupSelected = ref<string | null>(null)
const lookupMenuItems = ref<MenuItemData[]>([])
const lookupPending = ref(false)
const lookupIsRedLink = ref(false)

// Titles confirmed to not exist on Wikipedia (lowercase keys)
const knownRedLinks = ref<Set<string>>(new Set())

watch(lookupSelected, (val) => {
  if (!val) return
  let title = val
  if (title.startsWith(REDLINK_PREFIX)) {
    title = title.slice(REDLINK_PREFIX.length)
    knownRedLinks.value = new Set([...knownRedLinks.value, title.toLowerCase()])
  }
  const current = selectedPages.value.trim()
  selectedPages.value = current ? `${current}\n${title}` : title
  lookupSelected.value = null
  lookupInput.value = ''
  lookupMenuItems.value = []
  lookupIsRedLink.value = false
})

// Selected pages textarea
const selectedPages = ref('')

// Table state
const rows = ref<WorklistRow[]>([])
const sort = ref<Record<string, 'asc' | 'desc' | 'none'>>({})
const lastEditedAt = ref<Date | null>(null) // kept for future use
const addPending = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

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
      // No results — show the typed text as a red link option
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

/** Check a batch of article titles against the Wikipedia API.
 *  Returns a set of lowercase titles that do NOT exist. */
async function fetchMissingTitles(titles: string[]): Promise<Set<string>> {
  const missing = new Set<string>()
  if (!titles.length) return missing
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: titles.join('|'),
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)
    const data = (await res.json()) as { query: { pages: Record<string, { title: string; missing?: string }> } }
    for (const page of Object.values(data.query.pages)) {
      if ('missing' in page) missing.add(page.title.toLowerCase())
    }
  } catch {
    // If the check fails, don't block adding — just treat as unknown
  }
  return missing
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

async function onAdd() {
  const lines = selectedPages.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const existingTitles = new Set(rows.value.map((r) => r.article.toLowerCase()))
  const newTitles = lines.filter((t) => !existingTitles.has(t.toLowerCase()))

  if (!newTitles.length) {
    showAddDialog.value = false
    return
  }

  // Check existence only for titles not already known to be red links
  addPending.value = true
  const toCheck = newTitles.filter((t) => !knownRedLinks.value.has(t.toLowerCase()))
  const missing = await fetchMissingTitles(toCheck)
  knownRedLinks.value = new Set([...knownRedLinks.value, ...missing])
  addPending.value = false

  const now = new Date()
  const added: WorklistRow[] = newTitles.map((title) => ({
    id: crypto.randomUUID(),
    article: title,
    articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    wiki: 'English Wikipedia',
    dateAdded: now,
    isRedLink: knownRedLinks.value.has(title.toLowerCase()),
  }))

  rows.value = [...rows.value, ...added]
  lastEditedAt.value = now
  showAddDialog.value = false
}

const canAdd = computed(() => selectedPages.value.trim().length > 0)

const primaryAction = computed(() => ({
  label: 'Add',
  actionType: 'progressive' as const,
  disabled: !canAdd.value || addPending.value,
}))

const tableColumns = [
  { id: 'article', label: 'Page', allowSort: true },
  { id: 'wiki', label: 'Wiki', allowSort: true },
  { id: 'dateAdded', label: 'Date added', allowSort: true },
  { id: 'actions', label: '', allowSort: false, width: '3rem', textAlign: 'end' as const },
]

const tableData = computed(() => {
  const list = rows.value.map((r) => ({
    ...r,
    dateAddedFormatted: formatWikiDate(r.dateAdded),
    _sortDate: r.dateAdded.getTime(),
  }))

  const entries = Object.entries(sort.value)
  if (!entries.length) return list

  const [col, order] = entries[0] as [string, 'asc' | 'desc' | 'none']
  if (order === 'none') return list

  return [...list].sort((a, b) => {
    let cmp = 0
    if (col === 'article') cmp = a.article.localeCompare(b.article)
    else if (col === 'wiki') cmp = a.wiki.localeCompare(b.wiki)
    else if (col === 'dateAdded') cmp = a._sortDate - b._sortDate
    return order === 'asc' ? cmp : -cmp
  })
})


// Remove confirmation dialog
const showRemoveDialog = ref(false)
const pendingRemoveId = ref<string | null>(null)

function confirmRemove(rowId: string) {
  pendingRemoveId.value = rowId
  showRemoveDialog.value = true
}

function onRemoveConfirmed() {
  if (!pendingRemoveId.value) return
  rows.value = rows.value.filter((r) => r.id !== pendingRemoveId.value)
  if (rows.value.length === 0) lastEditedAt.value = null
  else lastEditedAt.value = new Date()
  showRemoveDialog.value = false
  pendingRemoveId.value = null
}

function onRemoveCancelled() {
  showRemoveDialog.value = false
  pendingRemoveId.value = null
}
</script>

<template>
  <ChromeWrapper>
    <SpecialPageWrapper title="Wiki Loves Earth 2026">
      <CdxTabs v-model:active="activeTab" class="ew__tabs">
        <CdxTab name="details" label="Event details" :disabled="true" />
        <CdxTab name="participants" label="Participants" :disabled="true" />
        <CdxTab name="worklist" label="Worklist">
          <section class="ew__card" aria-labelledby="ew-heading">
            <div class="ew__card-header">
              <h2 id="ew-heading" class="ew__card-title">Worklist</h2>
              <div class="ew__card-header-actions">
                <CdxButton weight="normal" action="default" size="medium">
                  Visit worklist page
                </CdxButton>
                <CdxButton weight="primary" action="progressive" :icon-only="true" aria-label="Add article" @click="openAddDialog">
                  <CdxIcon :icon="cdxIconAdd" />
                </CdxButton>
              </div>
            </div>

            <div class="ew__card-body" :class="{ 'ew__card-body--filled': rows.length > 0 }">
              <template v-if="rows.length === 0">
                <p class="ew__empty-text">No articles have been added to this worklist yet.</p>
              </template>

              <div v-else class="ew__table-wrap">
                <CdxTable
                  v-model:sort="sort"
                  caption="Articles in this worklist"
                  hide-caption
                  class="ew__table"
                  :columns="tableColumns"
                  :data="tableData"
                  :show-vertical-borders="false"
                >
                  <template #item-article="{ row }">
                    <a
                      :class="['ew__article-link', { 'ew__article-link--redlink': row.isRedLink }]"
                      :href="row.articleUrl"
                      rel="noopener noreferrer"
                    >{{ row.article }}</a>
                  </template>

                  <template #item-dateAdded="{ row }">
                    {{ row.dateAddedFormatted }}
                  </template>

                  <template #item-actions="{ row }">
                    <CdxButton weight="quiet" aria-label="Remove" @click="confirmRemove(row.id)">
                      <CdxIcon :icon="cdxIconTrash" />
                    </CdxButton>
                  </template>

                </CdxTable>
              </div>
            </div>
          </section>
        </CdxTab>
        <CdxTab name="contributions" label="Contributions" :disabled="true" />
      </CdxTabs>
    </SpecialPageWrapper>
  </ChromeWrapper>

  <CdxDialog
    v-model:open="showIntroDialog"
    title="Try Worklists on Wikipedia"
    close-button-label="Close"
    :dismissable="false"
    :primary-action="{ label: 'Get started', actionType: 'progressive' }"
    @primary="showIntroDialog = false"
  >
    <div class="ew__intro-body">
      <p>Worklists let event organizers and participants build a shared list of Wikipedia articles to focus on together, so contributors know where to start.</p>
      <p>This is an early prototype. Explore the page and try adding some articles to the list. Your experience helps us shape what gets built.</p>
    </div>
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
    <p class="ew__remove-message">Are you sure you want to remove this article from the worklist?</p>
  </CdxDialog>

  <CdxDialog
    v-model:open="showAddDialog"
    title="Add to worklist"
    close-button-label="Close"
    :dismissable="true"
    :primary-action="primaryAction"
    @primary="onAdd"
  >
    <div class="ew__dialog-body">
      <CdxField>
        <template #label>Search Wikipedia</template>
        <div :class="{ 'ew__lookup--redlink': lookupIsRedLink }">
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

      <div class="ew__dialog-or">or</div>

      <CdxField>
        <template #label>List pages</template>
        <template #description>One title per line</template>
        <CdxTextArea
          v-model="selectedPages"
          :rows="5"
          :placeholder="'Earth\nMoon\nJupiter'"
          class="ew__pages-textarea"
        />
      </CdxField>
    </div>
  </CdxDialog>
</template>

<style scoped>
.ew__tabs {
  margin-bottom: var(--spacing-100);
}

.ew__card {
  margin-top: var(--spacing-100);
  padding: var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.ew__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-100) var(--spacing-100);
  margin: 0 calc(-1 * var(--spacing-100)) var(--spacing-100);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.ew__card-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ew__card-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.ew__card-body {
  text-align: center;
}

.ew__card-body--filled {
  text-align: start;
}

.ew__empty-text {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.ew__table-wrap {
  overflow-x: auto;
}

/* Keep sortable header text the same color as regular headers */
.ew__table :deep(.cdx-table__table__header--sortable) {
  color: var(--color-base);
}

.ew__table :deep(.cdx-table__table__header--sortable:hover) {
  color: var(--color-base);
}

.ew__article-link {
  color: var(--color-progressive);
}

.ew__article-link--redlink {
  color: var(--color-destructive, #d73333);
}

/* Red link option in the lookup dropdown */
.ew__lookup--redlink :deep(.cdx-menu-item__text__label) {
  color: var(--color-destructive, #d73333);
}


.ew__dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.ew__dialog-or + * {
  margin-top: calc(-1 * var(--spacing-50));
}

.ew__dialog-or {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.ew__dialog-or::before,
.ew__dialog-or::after {
  content: '';
  flex: 1;
  border-top: var(--border-width-base) solid var(--border-color-subtle);
}

.ew__pages-textarea :deep(textarea) {
  resize: vertical;
}

.ew__remove-message {
  margin: 0;
}

.ew__intro-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.ew__intro-body p {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}
</style>
