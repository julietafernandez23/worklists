const STORAGE_KEY = 'cvm:saved-items'
const VISIBILITY_STORAGE_KEY = 'cvm:collection-visibility'

export type CollectionVisibility = 'private' | 'public'

/** Demo seed — pre-populated articles for specific collections. */
const DEFAULT_COLLECTION_ARTICLES: Record<string, string[]> = {
  'Articles on bands I want to edit': ['The Strokes', 'Boygenius'],
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
  return loadVisibilityMap()[collection] ?? 'private'
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
