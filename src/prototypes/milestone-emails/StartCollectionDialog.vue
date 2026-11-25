<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChipInputItem, MenuItemData } from '@wikimedia/codex'
import {
  CdxButton,
  CdxCard,
  CdxDialog,
  CdxField,
  CdxLabel,
  CdxMultiselectLookup,
} from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'

import { wikimediaApiFetchHeaders } from '@/config'

import {
  DEFAULT_COLLECTION_NAME,
  MILESTONE_RECOMMENDATIONS,
} from './recommendations'

const MAX_RELATED_ARTICLES = 5

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  create: [payload: { name: string; articles: string[] }]
}>()

type RelatedRow = {
  title: string
  thumbnailUrl: string | null
}

function milestoneChips(): ChipInputItem[] {
  return MILESTONE_RECOMMENDATIONS.map((item) => ({
    value: item.title,
    label: item.title,
  }))
}

function dedupeChips(items: ChipInputItem[]): ChipInputItem[] {
  const seen = new Set<string>()
  const out: ChipInputItem[] = []
  for (const chip of items) {
    const key = String(chip.value).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ value: String(chip.value).trim(), label: chip.label ?? String(chip.value).trim() })
  }
  return out
}

const inputChips = ref<ChipInputItem[]>(milestoneChips())
/** Milestone chips the user explicitly removed via the chip control. */
const removedTitles = ref(new Set<string>())

const lookupSelection = ref<string[]>([])
const lookupMenuItems = ref<MenuItemData[]>([])

const relatedLoading = ref(false)
const relatedArticles = ref<RelatedRow[]>([])

let lookupTimer: ReturnType<typeof setTimeout> | undefined
let relatedTimer: ReturnType<typeof setTimeout> | undefined
let relatedRequestId = 0
/** Last chip set we fetched related articles for (stops multiselect sync loops). */
let relatedSeedsKey = ''

function chipTitlesKey(titles: string[]): string {
  return [...new Set(titles.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort().join('\0')
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const left = new Set(a.map((s) => s.trim().toLowerCase()))
  return b.every((s) => left.has(s.trim().toLowerCase()))
}

const chipTitleSet = computed(
  () => new Set(inputChips.value.map((chip) => String(chip.value).trim().toLowerCase())),
)

const chipTitles = computed(() =>
  inputChips.value.map((chip) => String(chip.value).trim()).filter(Boolean),
)

const selectedCount = computed(() => chipTitles.value.length)

function cardThumbnail(row: RelatedRow) {
  if (!row.thumbnailUrl) return undefined
  return { url: row.thumbnailUrl, width: 80, height: 80 }
}

function restoreDefaultChips(chips: ChipInputItem[]): ChipInputItem[] {
  const keys = new Set(chips.map((c) => String(c.value).trim().toLowerCase()))
  const merged = [...chips]
  for (const rec of MILESTONE_RECOMMENDATIONS) {
    const key = rec.title.toLowerCase()
    if (removedTitles.value.has(key) || keys.has(key)) continue
    merged.push({ value: rec.title, label: rec.title })
  }
  return dedupeChips(merged)
}

function syncLookupSelectionFromChips() {
  const next = chipTitles.value
  if (sameStringSet(lookupSelection.value, next)) return
  lookupSelection.value = next
}

function dismissLookupMenu() {
  if (lookupTimer) clearTimeout(lookupTimer)
  lookupTimer = undefined
  lookupMenuItems.value = []
}

/**
 * CdxMultiselectLookup keeps chips in sync with `selected`; if `selected` omits
 * existing chip values, it drops them. Merge menu picks with current chips.
 */
function onLookupSelectedUpdate(selected: string[]) {
  const merged = [
    ...new Set([
      ...chipTitles.value,
      ...selected.map((value) => value.trim()).filter(Boolean),
    ]),
  ]
  const toAdd = merged.filter((title) => !chipTitleSet.value.has(title.trim().toLowerCase()))
  if (toAdd.length) {
    inputChips.value = restoreDefaultChips(
      dedupeChips([
        ...inputChips.value,
        ...toAdd.map((title) => ({ value: title, label: title })),
      ]),
    )
    syncLookupSelectionFromChips()
  }
  dismissLookupMenu()
  if (sameStringSet(lookupSelection.value, merged)) return
  lookupSelection.value = merged
}

function onInputChipsUpdate(chips: ChipInputItem[]) {
  // Ignore empty emissions while chips are still on screen (MultiselectLookup quirk).
  if (chips.length === 0 && inputChips.value.length > 0) return

  const prevKeys = new Set(chipTitles.value.map((t) => t.toLowerCase()))
  const incoming = dedupeChips(chips)
  const nextKeys = new Set(
    incoming.map((c) => String(c.value).trim().toLowerCase()).filter(Boolean),
  )
  const lostChips = [...prevKeys].filter((k) => !nextKeys.has(k))
  const hasNewChip = [...nextKeys].some((k) => !prevKeys.has(k))

  let merged = incoming
  if (hasNewChip && lostChips.length > 0) {
    merged = dedupeChips([...inputChips.value, ...incoming])
  } else if (lostChips.length > 0 && !hasNewChip) {
    for (const key of lostChips) removedTitles.value.add(key)
  }

  inputChips.value = restoreDefaultChips(merged)
  syncLookupSelectionFromChips()
}

async function resetState() {
  removedTitles.value = new Set()
  relatedSeedsKey = ''
  inputChips.value = milestoneChips()
  lookupMenuItems.value = []
  relatedArticles.value = []
  await nextTick()
  syncLookupSelectionFromChips()
  void refreshRelated()
}

watch(
  open,
  (isOpen) => {
    if (isOpen) void resetState()
  },
  { immediate: true },
)

watch(
  () => chipTitlesKey(chipTitles.value),
  (key, prevKey) => {
    if (!key || key === prevKey) return
    scheduleRelatedRefresh()
  },
)

function scheduleRelatedRefresh() {
  const key = chipTitlesKey(chipTitles.value)
  if (!key || key === relatedSeedsKey) return
  if (relatedTimer) clearTimeout(relatedTimer)
  relatedTimer = setTimeout(() => void refreshRelated(), 300)
}

async function searchArticles(query: string) {
  const q = query.trim()
  if (!q) {
    dismissLookupMenu()
    return
  }
  try {
    const params = new URLSearchParams({
      action: 'opensearch',
      search: q,
      limit: '10',
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: wikimediaApiFetchHeaders('opensearch'),
    })
    const [, titles] = (await res.json()) as [string, string[]]
    lookupMenuItems.value = titles
      .filter((title) => !chipTitleSet.value.has(title.trim().toLowerCase()))
      .map((title) => ({ value: title, label: title }))
  } catch {
    lookupMenuItems.value = []
  }
}

function onLookupInput(value: string) {
  if (!value.trim()) {
    dismissLookupMenu()
    return
  }
  if (lookupTimer) clearTimeout(lookupTimer)
  lookupTimer = setTimeout(() => searchArticles(value), 300)
}

async function morelikeTitles(seeds: string[]): Promise<string[]> {
  const unique = [...new Set(seeds.map((s) => s.trim()).filter(Boolean))]
  if (!unique.length) return []

  async function runQuery(morelike: string): Promise<string[]> {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: `morelike:${morelike}`,
      srwhat: 'text',
      srlimit: '15',
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)
    if (!res.ok) return []
    const data = (await res.json()) as {
      query?: { search?: Array<{ title: string }> }
      error?: unknown
    }
    if (data.error) return []
    return data.query?.search?.map((hit) => hit.title) ?? []
  }

  let hits = await runQuery(unique.join('|'))
  if (!hits.length && unique.length > 1) {
    const byKey = new Map<string, string>()
    for (const seed of unique) {
      for (const title of await runQuery(seed)) {
        byKey.set(title.toLowerCase(), title)
      }
    }
    hits = [...byKey.values()]
  }
  return hits
}

async function refreshRelated() {
  const requestId = ++relatedRequestId
  const seeds = chipTitles.value
  const seedsKey = chipTitlesKey(seeds)
  if (!seeds.length) {
    relatedArticles.value = []
    relatedLoading.value = false
    relatedSeedsKey = ''
    return
  }

  if (seedsKey === relatedSeedsKey) return
  relatedSeedsKey = seedsKey

  const showLoadingState = relatedArticles.value.length === 0
  if (showLoadingState) relatedLoading.value = true
  try {
    const rawTitles = await morelikeTitles(seeds)
    const titles = rawTitles
      .filter((title) => !chipTitleSet.value.has(title.toLowerCase()))
      .slice(0, MAX_RELATED_ARTICLES)

    if (requestId !== relatedRequestId) return

    relatedArticles.value = titles.map((title) => ({ title, thumbnailUrl: null }))

    for (const title of titles) {
      const wikiTitle = title.replace(/ /g, '_')
      void (async () => {
        try {
          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
            { headers: wikimediaApiFetchHeaders('page-summary') },
          )
          if (!summaryRes.ok || requestId !== relatedRequestId) return
          const summary = (await summaryRes.json()) as { thumbnail?: { source: string } }
          const thumb = summary.thumbnail?.source ?? null
          relatedArticles.value = relatedArticles.value.map((row) =>
            row.title === title ? { ...row, thumbnailUrl: thumb } : row,
          )
        } catch {
          // keep placeholder
        }
      })()
    }
  } catch {
    if (requestId !== relatedRequestId) return
    relatedArticles.value = []
  } finally {
    if (requestId === relatedRequestId) relatedLoading.value = false
  }
}

function addRelatedToChips(title: string) {
  const norm = title.trim()
  const key = norm.toLowerCase()
  if (!norm || chipTitleSet.value.has(key)) return
  inputChips.value = dedupeChips([...inputChips.value, { value: norm, label: norm }])
  syncLookupSelectionFromChips()
}

function create() {
  if (!chipTitles.value.length) return
  emit('create', { name: DEFAULT_COLLECTION_NAME, articles: [...chipTitles.value] })
  // Parent closes after navigation — closing here races with Saved URL handling.
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    class="me-start-collection-dialog"
    title="Start your Collection"
    close-button-label="Close"
    :dismissable="true"
    :fixed-height="true"
    :stacked-actions="true"
  >
    <CdxField class="me-start-collection-dialog__lookup-field" hide-label>
      <template #label>Articles for this Collection</template>
      <CdxMultiselectLookup
        :input-chips="inputChips"
        :selected="lookupSelection"
        class="me-start-collection-dialog__multiselect"
        :menu-items="lookupMenuItems"
        :menu-config="{ visibleItemLimit: 6, boldLabel: true }"
        separate-input
        placeholder="Search articles"
        aria-label="Search articles to add to your Collection"
        @update:selected="onLookupSelectedUpdate"
        @update:input-chips="onInputChipsUpdate"
        @input="onLookupInput"
      />
    </CdxField>

    <CdxLabel class="me-start-collection-dialog__related-label"> Related articles </CdxLabel>

    <p v-if="relatedLoading" class="me-start-collection-dialog__status">Loading related articles…</p>
    <p v-else-if="!chipTitles.length" class="me-start-collection-dialog__status">
      Add a topic above to see related articles.
    </p>
    <p v-else-if="!relatedArticles.length" class="me-start-collection-dialog__status">
      No related articles found.
    </p>

    <ul v-else class="me-start-collection-dialog__related" role="list">
      <li
        v-for="row in relatedArticles"
        :key="row.title"
        class="me-start-collection-dialog__related-item"
        role="button"
        tabindex="0"
        :aria-label="`Add ${row.title} to your Collection`"
        @click="addRelatedToChips(row.title)"
        @keydown.enter.prevent="addRelatedToChips(row.title)"
        @keydown.space.prevent="addRelatedToChips(row.title)"
      >
        <CdxCard
          class="me-start-collection-dialog__related-card"
          :thumbnail="cardThumbnail(row)"
          :icon="row.thumbnailUrl ? undefined : cdxIconImage"
          :force-thumbnail="!row.thumbnailUrl"
          thumbnail-position="inline-start"
          separation="outline"
        >
          <template #title>{{ row.title }}</template>
        </CdxCard>
      </li>
    </ul>

    <template #footer>
      <CdxButton
        class="me-start-collection-dialog__create"
        weight="primary"
        action="progressive"
        :disabled="selectedCount === 0"
        @click="create"
      >
        Add to collection ({{ selectedCount }})
      </CdxButton>
    </template>
  </CdxDialog>
</template>

<style scoped>
/* `class` is merged onto the root `.cdx-dialog` element. */
.me-start-collection-dialog {
  width: calc(100vw - 2 * var(--spacing-100, 16px));
  max-width: calc(100vw - 2 * var(--spacing-100, 16px));
}

.me-start-collection-dialog.cdx-dialog--fixed-height {
  height: calc(100dvh - 2 * var(--spacing-100, 16px));
  max-height: calc(100dvh - 2 * var(--spacing-100, 16px));
}

.me-start-collection-dialog :deep(.cdx-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.me-start-collection-dialog__lookup-field {
  margin-bottom: var(--spacing-150, 24px);
}

.me-start-collection-dialog__multiselect {
  width: 100%;
}

.me-start-collection-dialog__related-label {
  display: block;
  margin-bottom: var(--spacing-25, 4px);
}

.me-start-collection-dialog__related-label:deep(.cdx-label__label__text) {
  color: var(--color-subtle, #54595d);
}

.me-start-collection-dialog__status {
  margin: 0 0 var(--spacing-100, 16px);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.me-start-collection-dialog__related {
  margin: 0 0 var(--spacing-100, 16px);
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
  min-width: 0;
}

.me-start-collection-dialog__related-item {
  cursor: pointer;
}

.me-start-collection-dialog__related-item:focus {
  outline: none;
}

.me-start-collection-dialog__related-item:focus-visible .me-start-collection-dialog__related-card:deep(.cdx-card) {
  box-shadow: inset 0 0 0 2px var(--border-color-progressive, #36c);
}

.me-start-collection-dialog__related-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  pointer-events: none;
}

.me-start-collection-dialog__related-card:deep(.cdx-card) {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.me-start-collection-dialog__related-card:deep(.cdx-card__text__title) {
  overflow-wrap: anywhere;
}

.me-start-collection-dialog__related-item:hover .me-start-collection-dialog__related-card:deep(.cdx-card),
.me-start-collection-dialog__related-item:focus-visible .me-start-collection-dialog__related-card:deep(.cdx-card) {
  background-color: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.me-start-collection-dialog__create {
  width: 100%;
  justify-content: center;
}

.me-start-collection-dialog :deep(.cdx-dialog__footer) {
  flex-direction: column;
  align-items: stretch;
}

.me-start-collection-dialog :deep(.cdx-dialog__footer__actions) {
  width: 100%;
}
</style>

<style>
/* CdxDialog teleports to `body`, so scoped selectors never match the root. */
.me-start-collection-dialog.cdx-dialog .cdx-dialog__header {
  border-bottom: none;
}
</style>