const STORAGE_KEY = 'ces:saved-items'

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
