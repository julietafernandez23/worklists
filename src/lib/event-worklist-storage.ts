export interface EventWorklistOption {
  id: string
  label: string
  /** Prototype route when a worklist page exists in ProtoWiki. */
  route: string | null
  /** Whether the current user is registered for the event (demo flag). */
  isRegistered: boolean
}

export const DEFAULT_EVENT_WORKLIST_ID = 'wiki-loves-earth-2026'

/** @deprecated Use getEventWorklistOption(DEFAULT_EVENT_WORKLIST_ID) instead. */
export const EVENT_WORKLIST_LABEL = 'Wiki Loves Earth 2026'

/** @deprecated Use getEventWorklistRoute(DEFAULT_EVENT_WORKLIST_ID) instead. */
export const EVENT_WORKLIST_ROUTE = '/worklist-cards-v2'

export const EVENT_WORKLIST_OPTIONS: EventWorklistOption[] = [
  {
    id: DEFAULT_EVENT_WORKLIST_ID,
    label: 'Wiki Loves Earth 2026',
    route: '/worklist-cards-v2',
    isRegistered: true,
  },
  {
    id: 'art-and-feminism-2026',
    label: 'Art and Feminism 2026',
    route: null,
    isRegistered: false,
  },
  {
    id: 'wiki-loves-monuments-2026',
    label: 'Wiki Loves Monuments 2026',
    route: null,
    isRegistered: false,
  },
  {
    id: 'librarians-editathon-2026',
    label: 'Librarians Editathon 2026',
    route: null,
    isRegistered: true,
  },
  {
    id: 'women-in-red',
    label: 'Women in Red',
    route: null,
    isRegistered: false,
  },
]

const LEGACY_STORAGE_KEY = 'protowiki:wiki-loves-earth-2026-worklist'

export const DEFAULT_WORKLIST_ARTICLES = [
  'Coral bleaching',
  'Endangered species',
  'Climate variability and change',
  'Ozone layer',
  'Politics of climate change',
  'Amazon rainforest',
  'Biodiversity',
]

function storageKey(eventId: string): string {
  return `protowiki:event-worklist:${eventId}`
}

function loadStoredTitles(eventId: string): string[] | null {
  try {
    const key = storageKey(eventId)
    let raw = sessionStorage.getItem(key)

    if (!raw && eventId === DEFAULT_EVENT_WORKLIST_ID) {
      raw = sessionStorage.getItem(LEGACY_STORAGE_KEY)
    }

    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((title): title is string => typeof title === 'string')
  } catch {
    return null
  }
}

export function getEventWorklistOption(eventId: string): EventWorklistOption | undefined {
  return EVENT_WORKLIST_OPTIONS.find((event) => event.id === eventId)
}

export function getEventWorklistRoute(eventId: string): string | null {
  return getEventWorklistOption(eventId)?.route ?? null
}

export function searchEventWorklists(query: string): EventWorklistOption[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...EVENT_WORKLIST_OPTIONS]

  return EVENT_WORKLIST_OPTIONS.filter((event) =>
    event.label.toLowerCase().includes(normalized),
  )
}

export function getWorklistArticleTitles(
  eventId: string = DEFAULT_EVENT_WORKLIST_ID,
): string[] {
  return loadStoredTitles(eventId) ?? [...DEFAULT_WORKLIST_ARTICLES]
}

export function saveWorklistArticleTitles(
  titles: string[],
  eventId: string = DEFAULT_EVENT_WORKLIST_ID,
): void {
  sessionStorage.setItem(storageKey(eventId), JSON.stringify(titles))
  if (eventId === DEFAULT_EVENT_WORKLIST_ID) {
    sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(titles))
  }
}

export function addArticlesToWorklist(
  titles: string[],
  eventId: string = DEFAULT_EVENT_WORKLIST_ID,
): {
  added: string[]
  skipped: string[]
} {
  const current = getWorklistArticleTitles(eventId)
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
    saveWorklistArticleTitles([...added, ...current], eventId)
  }

  return { added, skipped }
}
