export const EVENT_WORKLIST_LABEL = 'Wiki Loves Earth 2026'
export const EVENT_WORKLIST_ROUTE = '/worklist-cards-v2'

const STORAGE_KEY = 'protowiki:wiki-loves-earth-2026-worklist'

export const DEFAULT_WORKLIST_ARTICLES = [
  'Coral bleaching',
  'Endangered species',
  'Climate variability and change',
  'Ozone layer',
  'Politics of climate change',
  'Amazon rainforest',
  'Biodiversity',
]

function loadStoredTitles(): string[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((title): title is string => typeof title === 'string')
  } catch {
    return null
  }
}

export function getWorklistArticleTitles(): string[] {
  return loadStoredTitles() ?? [...DEFAULT_WORKLIST_ARTICLES]
}

export function saveWorklistArticleTitles(titles: string[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(titles))
}

export function addArticlesToWorklist(titles: string[]): {
  added: string[]
  skipped: string[]
} {
  const current = getWorklistArticleTitles()
  const seen = new Set(current.map((title) => title.toLowerCase()))
  const added: string[] = []
  const skipped: string[] = []

  for (const title of titles) {
    if (seen.has(title.toLowerCase())) {
      skipped.push(title)
      continue
    }
    seen.add(title.toLowerCase())
    added.push(title)
  }

  if (added.length) {
    saveWorklistArticleTitles([...added, ...current])
  }

  return { added, skipped }
}
