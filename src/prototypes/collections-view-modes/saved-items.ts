const STORAGE_KEY = 'cvm:saved-items'
const VISIBILITY_STORAGE_KEY = 'cvm:collection-visibility'

export type CollectionVisibility = 'private' | 'public'

/** Collections shown in the article save menu (demo). */
export const DEMO_COLLECTION_NAMES = [
  'My nemesis birds list',
  'Forest Ecology, Biodiversity, Woodland Ecosystems, Seasonal Changes, Native Flora and Fauna, Fungal Networks, and the Intricate Relationships Between Trees, Soil and Wildlife',
  'Neotropical birds',
  'Animals who made history',
  'Stargazing',
  'Music stuff',
  'Articles on bands I want to edit',
]

/** Demo seed — pre-populated articles for specific collections. */
const DEFAULT_COLLECTION_ARTICLES: Record<string, string[]> = {
  'Articles on bands I want to edit': ['The Strokes', 'Boygenius'],
  'My nemesis birds list': [
    'Blue-gray tanager',
    'Canada goose',
    'Common myna',
    'House sparrow',
    'Red-winged blackbird',
  ],
}

const DEFAULT_COLLECTION_OWNERS: Record<string, string> = {
  'Articles on bands I want to edit': 'LittleBird',
}

const DEFAULT_COLLECTION_VISIBILITY: Record<string, CollectionVisibility> = {
  'Articles on bands I want to edit': 'public',
}

type SavedItemsMap = Record<string, string[]>

function loadSavedItems(): SavedItemsMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SavedItemsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function addArticleToCollection(collection: string, articleTitle: string) {
  const data = loadSavedItems()
  const titles = data[collection] ? [...data[collection]] : []
  if (!titles.includes(articleTitle)) {
    titles.unshift(articleTitle)
  }
  data[collection] = titles
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** Demo: register an empty saved collection (no articles yet). */
export function registerCollection(collection: string): void {
  const name = collection.trim()
  if (!name) return
  const data = loadSavedItems()
  if (!data[name]) {
    data[name] = []
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export function getAllCollectionNames(): string[] {
  const stored = loadSavedItems()
  const seen = new Set<string>()
  const result: string[] = []

  for (const name of [
    ...DEMO_COLLECTION_NAMES,
    ...Object.keys(DEFAULT_COLLECTION_ARTICLES),
    ...Object.keys(stored),
  ]) {
    if (!seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }

  return result
}

export function getAllSavedArticleTitles(): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const name of getAllCollectionNames()) {
    for (const title of getCollectionArticles(name)) {
      if (!seen.has(title)) {
        seen.add(title)
        result.push(title)
      }
    }
  }

  return result
}

export function getCollectionArticles(collection: string): string[] {
  const stored = loadSavedItems()[collection] ?? []
  const defaults = DEFAULT_COLLECTION_ARTICLES[collection] ?? []
  const seen = new Set<string>()
  const result: string[] = []

  for (const title of [...stored, ...defaults]) {
    if (!seen.has(title)) {
      seen.add(title)
      result.push(title)
    }
  }

  return result
}

type VisibilityMap = Record<string, CollectionVisibility>

function loadVisibilityMap(): VisibilityMap {
  try {
    const raw = sessionStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as VisibilityMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getCollectionVisibility(collection: string): CollectionVisibility {
  return loadVisibilityMap()[collection] ?? DEFAULT_COLLECTION_VISIBILITY[collection] ?? 'private'
}

export function getCollectionOwner(collection: string): string {
  return DEFAULT_COLLECTION_OWNERS[collection] ?? 'LittleBird'
}

export async function saveCollectionVisibility(
  collection: string,
  visibility: CollectionVisibility,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const map = loadVisibilityMap()
  map[collection] = visibility
  sessionStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(map))
}
