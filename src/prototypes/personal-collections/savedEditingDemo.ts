/** Stable demo editing signals for saved list rows (prototype only). */
import {
  fakeSuggestions,
  primaryRecommendedTask,
  viewsCountForIndex,
} from '@/lib/worklist-card-signals'

export interface SavedEditingSignals {
  viewsLabel: string
  suggestionLabel: string
  impactLabel: string | null
}

function indexForKey(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function savedEditingSignalsForKey(key: string): SavedEditingSignals {
  const index = indexForKey(key)
  const suggestions = fakeSuggestions(index)
  const primary = primaryRecommendedTask(suggestions)
  const views = viewsCountForIndex(index)
  const impactEvery = index % 3 === 0

  return {
    viewsLabel: `${views}k views (30 days)`,
    suggestionLabel: primary ?? 'Add citations',
    impactLabel: impactEvery ? 'High impact opportunity' : null,
  }
}
