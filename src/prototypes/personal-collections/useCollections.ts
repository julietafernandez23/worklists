import { computed, reactive, watch } from 'vue'

import { wikimediaApiFetchHeaders } from '@/config'

/**
 * Shared, localStorage-backed state for the saved-items + collections prototype.
 * Module-level so the article page and Special:Saved see the same data.
 *
 * A saved item is a whole article, one section of it, or a single passage
 * (paragraph). Each has a stable `key` so it can be saved, unsaved and filed
 * into collections independently of the article it came from.
 */

export interface Collection {
  id: string
  name: string
  /** Last modified: created, or an item added or removed. Lists sort by this, newest first. */
  updatedAt: number
}

export type SaveKind = 'article' | 'section' | 'passage'

/** What a save entry point hands over — enough to store, show and link back. */
export type SaveTarget =
  | { kind: 'article'; title: string }
  /** `sectionId` is the heading's anchor id (e.g. `Environmental_tolerance`). */
  | {
      kind: 'section'
      title: string
      sectionId: string
      heading: string
      /** First real image inside the section, if any — shown on its Saved card. */
      imageUrl?: string
    }
  /** `excerpt` is the paragraph's plain text; it is also how the passage is found again. */
  | { kind: 'passage'; title: string; excerpt: string; heading?: string }

export type SavedItem = SaveTarget & {
  key: string
  savedAt: number
  /** Collection id → time the item was added to it. */
  collections: Record<string, number>
}

export interface ArticleSummary {
  title: string
  description: string
  thumbnailUrl: string | null
}

interface State {
  collections: Collection[]
  items: SavedItem[]
  /** Article the prototype opens on when no `?article=` is given. */
  startArticle: string
  /**
   * First-save onboarding (only when starting from scratch, `?reset`):
   * `waiting` for the first save → `armed` while its save popover is up →
   * `showing` the "Saved" tip on the user menu → `done`. Missing = `done`.
   */
  onboarding?: 'waiting' | 'armed' | 'showing' | 'done'
}

const STORAGE_KEY = 'protowiki:personal-collections:v6'
const PIN_KEY = 'protowiki:personal-collections:pinned:v1'
const NAV_KEY = 'protowiki:personal-collections:nav:v3'
const COLLECTIONS_VIEW_KEY = 'protowiki:personal-collections:collections-view:v2'
const EDITING_INFO_KEY = 'protowiki:personal-collections:editing-info:v1'
const EDITING_INFO_INTRO_KEY = 'protowiki:personal-collections:editing-info-intro:v1'

/**
 * Saved page navigation on desktop, picked from the Prototype menu (phones
 * always use All items / Collections tabs):
 *  - `collections-page` (default, "Dedicated collection page"): All items /
 *    Collections tabs, as on phones; the Collections tab lists each collection.
 *  - `tabs` ("Side menu"): All items tab + Collections dropdown, which can
 *    move to the side.
 */
export type SavedNav = 'tabs' | 'collections-page'

/**
 * Desktop Collections tab layout: `expanded` = tiles previewing each
 * collection's items; `compact` = the phone-style list. Phones are always compact.
 */
export type CollectionsView = 'expanded' | 'compact'

/** Prototype routes (under the site base). Article pages take `?title=`. */
export const ARTICLE_PATH = '/personal-collections'
export const SAVED_PATH = '/saved'

/** Opening article per starting point: pre-filled collections vs none yet (`?reset`). */
const START_ARTICLE = { withCollections: 'Blue-gray tanager', empty: 'Resplendent quetzal' }

export function normalizeTitle(title: string): string {
  return title.replace(/_/g, ' ').trim()
}

/** Short, stable hash of a passage's opening text — keeps passage keys compact. */
function hashText(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim().slice(0, 160)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function keyOf(target: SaveTarget): string {
  const title = normalizeTitle(target.title)
  if (target.kind === 'section') return `${title}#${target.sectionId}`
  if (target.kind === 'passage') return `${title}¶${hashText(target.excerpt)}`
  return title
}

/** Human label used in the popover heading and confirmations. */
export function labelOf(target: SaveTarget): string {
  if (target.kind === 'section') return `“${target.heading}” section`
  if (target.kind === 'passage') return `Passage from ${normalizeTitle(target.title)}`
  return normalizeTitle(target.title)
}

/** Where a saved item opens in the prototype. */
export function linkOf(item: SavedItem) {
  const query: Record<string, string> = { title: item.title }
  if (item.kind === 'section') query.section = item.sectionId
  if (item.kind === 'passage') query.passage = item.key.split('¶')[1]
  return { path: ARTICLE_PATH, query }
}

// --- Seed data ------------------------------------------------------------------

/**
 * Most recent first. Articles only: sections and passages appear on the Saved
 * page once they're saved during the demo. Two birds lead, then a mix of topics
 * with birds sprinkled through, so All items doesn't open as a wall of birds.
 */
const SEED_TARGETS: SaveTarget[] = [
  { kind: 'article', title: 'Clay-colored thrush' },
  { kind: 'article', title: 'Black-bellied whistling duck' },
  { kind: 'article', title: 'Wombat' },
  { kind: 'article', title: 'Earthset' },
  { kind: 'article', title: 'Amanita muscaria' },
  { kind: 'article', title: 'Pine siskin' },
  { kind: 'article', title: 'Voyager Golden Record' },
  { kind: 'article', title: 'Tardigrade' },
  { kind: 'article', title: 'Old-growth forest' },
  { kind: 'article', title: 'Superb fairywren' },
  { kind: 'article', title: 'Ursa Major' },
  { kind: 'article', title: 'Laika' },
  { kind: 'article', title: 'Sea otter' },
  { kind: 'article', title: 'Canada goose' },
  { kind: 'article', title: 'Trans-Neptunian object' },
  { kind: 'article', title: 'Mycorrhizal network' },
  { kind: 'article', title: 'Hachikō' },
  { kind: 'article', title: 'Keel-billed toucan' },
  { kind: 'article', title: 'World Turtle' },
  { kind: 'article', title: 'Fennec fox' },
  { kind: 'article', title: 'Voynich manuscript' },
  { kind: 'article', title: 'Hoatzin' },
  { kind: 'article', title: 'Cassiopeia (constellation)' },
  { kind: 'article', title: 'Canopy (botany)' },
  { kind: 'article', title: 'Oryctolagus' },
  { kind: 'article', title: 'Harpy eagle' },
  { kind: 'article', title: 'Radio telescope' },
  { kind: 'article', title: 'Mycelium' },
  { kind: 'article', title: 'Dolly (sheep)' },
  { kind: 'article', title: 'Andean cock-of-the-rock' },
  { kind: 'article', title: 'Forest floor' },
  { kind: 'article', title: 'Voyager program' },
  { kind: 'article', title: 'Quokka' },
  { kind: 'article', title: 'Toco toucan' },
  { kind: 'article', title: 'Crux' },
  { kind: 'article', title: 'Mpemba effect' },
  { kind: 'article', title: 'Hericium erinaceus' },
  { kind: 'article', title: 'Hyacinth macaw' },
  { kind: 'article', title: 'Temperate rainforest' },
  { kind: 'article', title: 'Interstellar communication' },
  { kind: 'article', title: 'Pygmy marmoset' },
  { kind: 'article', title: 'European herring gull' },
  { kind: 'article', title: 'Koko (gorilla)' },
  { kind: 'article', title: 'Scorpius' },
  { kind: 'article', title: 'Paul the Octopus' },
  { kind: 'article', title: 'Scarlet macaw' },
  { kind: 'article', title: 'Cantharellus cibarius' },
  { kind: 'article', title: 'Common myna' },
  { kind: 'article', title: 'Violet sabrewing' },
]

/** Pre-filled collections; entries are saved-item keys (an article key is its title). */
const SEED_COLLECTIONS: (Omit<Collection, 'updatedAt'> & { keys: string[] })[] = [
  {
    id: 'my-nemesis-birds-list',
    name: 'My nemesis birds list',
    keys: ['Canada goose', 'European herring gull', 'Common myna', 'Pine siskin'],
  },
  {
    id: 'forest-ecology',
    // Deliberately long, to show how long collection names wrap and truncate.
    name: 'Forest Ecology, Biodiversity, Woodland Ecosystems, Seasonal Changes, Native Flora and Fauna, Fungal Networks, and the Intricate Relationships Between Trees, Soil and Wildlife',
    keys: [
      'Old-growth forest',
      'Mycorrhizal network',
      'Canopy (botany)',
      'Forest floor',
      'Temperate rainforest',
      'Mycelium',
    ],
  },
  {
    id: 'birds-costa-rica',
    name: 'Neotropical birds',
    keys: [
      'Keel-billed toucan',
      'Scarlet macaw',
      'Violet sabrewing',
      'Clay-colored thrush',
      'Hoatzin',
      'Harpy eagle',
      'Andean cock-of-the-rock',
      'Toco toucan',
      'Hyacinth macaw',
    ],
  },
  {
    id: 'animals-who-made-history',
    name: 'Animals who made history',
    keys: ['Laika', 'Hachikō', 'Dolly (sheep)', 'Koko (gorilla)', 'Paul the Octopus'],
  },
  {
    id: 'stargazing',
    name: 'Stargazing',
    keys: ['Ursa Major', 'Cassiopeia (constellation)', 'Crux', 'Scorpius'],
  },
  {
    id: 'hello-from-earth',
    name: 'Hello from Earth',
    keys: [
      'Voyager Golden Record',
      'Voyager program',
      'Interstellar communication',
      'Radio telescope',
      'Earthset',
      'Trans-Neptunian object',
    ],
  },
  {
    id: 'fungi-school-project',
    name: 'Fungi project',
    keys: ['Amanita muscaria', 'Mycelium', 'Hericium erinaceus', 'Cantharellus cibarius'],
  },
]

/**
 * Starting point: plenty already saved. `withCollections: false` starts from
 * scratch — nothing saved, no collections — with the first-save onboarding.
 */
function seedState(withCollections = true): State {
  if (!withCollections) {
    return { startArticle: START_ARTICLE.empty, collections: [], items: [], onboarding: 'waiting' }
  }
  const now = Date.now()
  const collections = SEED_COLLECTIONS
  return {
    startArticle: START_ARTICLE.withCollections,
    onboarding: 'done',
    // No real history for the samples: keep their listed order as "last modified".
    collections: collections.map(({ id, name }, i) => ({ id, name, updatedAt: now - i * 60_000 })),
    items: SEED_TARGETS.map((target, i) => {
      const key = keyOf(target)
      const savedAt = now - (i + 1) * 3_600_000
      return {
        ...target,
        key,
        savedAt,
        collections: Object.fromEntries(
          collections.filter((c) => c.keys.includes(key)).map((c) => [c.id, savedAt]),
        ),
      }
    }),
  }
}

// --- Persistence ------------------------------------------------------------------

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode / quota — in-memory state still works.
  }
}

function isState(value: unknown): value is State {
  const v = value as State
  return (
    !!v &&
    Array.isArray(v.collections) &&
    Array.isArray(v.items) &&
    typeof v.startArticle === 'string'
  )
}

/**
 * Starting point for this page load, decided before anything renders so the
 * right article loads first time:
 *  - `?reset` → nothing saved, no collections, opens on Resplendent quetzal
 *  - bare `/personal-collections` → pre-filled collections, opens on Blue-gray tanager
 *  - anything else → carry on with what's stored
 * (`SavedChrome` then tidies `?reset` out of the URL.)
 */
function initialState(): State {
  const params = new URLSearchParams(window.location.search)
  if (params.has('reset')) return seedState(false)
  const bare =
    window.location.pathname.replace(/\/$/, '').endsWith(ARTICLE_PATH) && !window.location.search
  if (bare) return seedState(true)
  const stored = readStorage<State>(STORAGE_KEY)
  if (!isState(stored)) return seedState()
  // Saved before collections tracked "last modified": keep their current order.
  const now = Date.now()
  stored.collections.forEach((c, i) => (c.updatedAt ??= now - i * 60_000))
  return stored
}

const state = reactive<State>(initialState())
const ui = reactive({
  pinned: readStorage<boolean>(PIN_KEY) === true,
  nav: (readStorage<SavedNav>(NAV_KEY) === 'tabs' ? 'tabs' : 'collections-page') as SavedNav,
  /** Desktop Collections tab layout, from its Expanded / Compact toggle (expanded by default). */
  collectionsView: (readStorage<CollectionsView>(COLLECTIONS_VIEW_KEY) === 'compact'
    ? 'compact'
    : 'expanded') as CollectionsView,
  showEditingInfo: readStorage<boolean>(EDITING_INFO_KEY) === true,
  /** Settings-menu beacon for “Display editing information” — cleared after opt-in. */
  editingInfoIntroComplete:
    readStorage<boolean>(EDITING_INFO_INTRO_KEY) === true
    || readStorage<boolean>(EDITING_INFO_KEY) === true,
})

// Persist straight away too, so a fresh starting point survives a refresh
// even before anything is saved.
writeStorage(STORAGE_KEY, state)
watch(state, () => writeStorage(STORAGE_KEY, state), { deep: true })
watch(
  () => ui.pinned,
  (pinned) => writeStorage(PIN_KEY, pinned),
)
watch(
  () => ui.nav,
  (nav) => writeStorage(NAV_KEY, nav),
)
watch(
  () => ui.collectionsView,
  (view) => writeStorage(COLLECTIONS_VIEW_KEY, view),
)
watch(
  () => ui.showEditingInfo,
  (on) => {
    writeStorage(EDITING_INFO_KEY, on)
    if (on) ui.editingInfoIntroComplete = true
  },
)
watch(
  () => ui.editingInfoIntroComplete,
  (done) => writeStorage(EDITING_INFO_INTRO_KEY, done),
)

function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'collection'
  let slug = base
  let n = 2
  while (state.collections.some((c) => c.id === slug)) slug = `${base}-${n++}`
  return slug
}

// --- Article summaries (live REST, cached) -----------------------------------

const summaries = reactive<Record<string, ArticleSummary | null>>({})
const inflight = new Map<string, Promise<void>>()

function loadSummary(title: string): void {
  if (title in summaries || inflight.has(title)) return
  const p = fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { headers: wikimediaApiFetchHeaders('personal-collections') },
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      summaries[title] = data
        ? {
            title: data.title ?? title,
            description: data.description ?? '',
            thumbnailUrl: data.thumbnail?.source ?? null,
          }
        : { title, description: '', thumbnailUrl: null }
    })
    .catch(() => {
      summaries[title] = { title, description: '', thumbnailUrl: null }
    })
    .finally(() => inflight.delete(title))
  inflight.set(title, p)
}

// --- Public API ---------------------------------------------------------------

export function useCollections() {
  /** Last modified first. */
  const collections = computed(() =>
    [...state.collections].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  /** Mark collections as just modified (moves them to the top of every list). */
  function touch(...collectionIds: string[]): void {
    const now = Date.now()
    for (const c of state.collections) if (collectionIds.includes(c.id)) c.updatedAt = now
  }
  const items = computed(() => [...state.items].sort((a, b) => b.savedAt - a.savedAt))

  function getItem(key: string): SavedItem | undefined {
    return state.items.find((i) => i.key === key)
  }

  function isSaved(key: string): boolean {
    return !!getItem(key)
  }

  function save(target: SaveTarget): SavedItem {
    const key = keyOf(target)
    const existing = getItem(key)
    if (existing) return existing
    const item = {
      ...target,
      title: normalizeTitle(target.title),
      key,
      savedAt: Date.now(),
      collections: {},
    } as SavedItem
    state.items.push(item)
    return getItem(key)!
  }

  function unsave(key: string): void {
    // Unsaving also takes the item out of every collection it was in.
    touch(...Object.keys(getItem(key)?.collections ?? {}))
    state.items = state.items.filter((i) => i.key !== key)
  }

  function isInCollection(key: string, collectionId: string): boolean {
    return !!getItem(key)?.collections[collectionId]
  }

  function addToCollection(target: SaveTarget, collectionId: string): void {
    save(target).collections[collectionId] = Date.now()
    touch(collectionId)
  }

  function removeFromCollection(key: string, collectionId: string): void {
    const item = getItem(key)
    if (!item?.collections[collectionId]) return
    delete item.collections[collectionId]
    touch(collectionId)
  }

  function findCollection(id: string | null | undefined): Collection | undefined {
    return id ? state.collections.find((c) => c.id === id) : undefined
  }

  function nameTaken(name: string, exceptId?: string): boolean {
    const n = name.trim().toLowerCase()
    return state.collections.some(
      (c) => c.id !== exceptId && c.name.toLowerCase() === n,
    )
  }

  function renameCollection(id: string, newName: string): boolean {
    const trimmed = newName.trim()
    if (!trimmed || nameTaken(trimmed, id)) return false
    const collection = findCollection(id)
    if (!collection) return false
    collection.name = trimmed
    touch(id)
    return true
  }

  function deleteCollection(id: string): void {
    for (const item of state.items) {
      delete item.collections[id]
    }
    state.collections = state.collections.filter((c) => c.id !== id)
  }

  function createCollection(name: string): Collection {
    // Just modified, so a new collection shows at the top of every list.
    const collection = { id: slugify(name), name: name.trim(), updatedAt: Date.now() }
    state.collections.unshift(collection)
    return collection
  }

  /** Items in a collection, most recently added first; all items when `collectionId` is empty. */
  function itemsIn(collectionId?: string | null): SavedItem[] {
    if (!collectionId) return items.value
    return state.items
      .filter((i) => i.collections[collectionId])
      .sort((a, b) => b.collections[collectionId] - a.collections[collectionId])
  }

  /** Saved passage on an article whose key ends in `hash` (from a `?passage=` link). */
  function findPassage(title: string, hash: string): SavedItem | undefined {
    return getItem(`${normalizeTitle(title)}¶${hash}`)
  }

  const startArticle = computed(() => state.startArticle)

  /** First-save onboarding step (see `State.onboarding`). */
  const onboarding = computed({
    get: () => state.onboarding ?? 'done',
    set: (step) => (state.onboarding = step),
  })

  function summary(title: string): ArticleSummary | null | undefined {
    loadSummary(title)
    return summaries[title]
  }

  /** Back to a starting point — pre-filled (bare URL) or from scratch (`?reset`). */
  function resetDemo(withCollections = true): void {
    Object.assign(state, seedState(withCollections))
  }

  return {
    collections,
    items,
    ui,
    getItem,
    isSaved,
    save,
    unsave,
    isInCollection,
    addToCollection,
    removeFromCollection,
    findCollection,
    nameTaken,
    renameCollection,
    deleteCollection,
    createCollection,
    itemsIn,
    findPassage,
    summary,
    resetDemo,
    startArticle,
    onboarding,
  }
}
