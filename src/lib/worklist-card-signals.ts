export type QualityBand = 'low' | 'medium' | 'high'

export const RECOMMENDED_TASKS = [
  'Add citations',
  'Add links',
  'Improve headings',
  'Add images',
  'Add an infobox',
  'Add categories',
  'Expand article',
  'Check maintenance message',
] as const

export const RECOMMENDED_TASK_TOOLTIPS: Record<(typeof RECOMMENDED_TASKS)[number], string> = {
  'Add citations': 'Help readers understand where this information is coming from',
  'Add links': 'Connect this article to related topics on Wikipedia',
  'Improve headings': 'Give the article clearer structure with section headings',
  'Add images': 'Illustrate the article with photos or other media',
  'Add an infobox': 'Help readers scan key facts with an infobox',
  'Add categories': 'Help readers discover this article through categories',
  'Expand article': 'Add more detail so the article better covers its topic',
  'Check maintenance message': 'Resolve the issue flagged by the maintenance message on this article',
}

/** Highest-priority task first — used to pick one label per card. */
export const RECOMMENDED_TASK_PRIORITY: readonly string[] = [
  'Check maintenance message',
  'Add citations',
  'Expand article',
  'Add an infobox',
  'Improve headings',
  'Add images',
  'Add links',
  'Add categories',
]

export const VIEW_COUNTS = [20, 45, 12, 8, 35, 15, 120, 9]

const HIGH_QUALITY_THRESHOLD = 75
const MEDIUM_QUALITY_THRESHOLD = 50

export const IMPACT_OPPORTUNITY_LABEL: Record<QualityBand, string> = {
  low: 'High impact opportunity',
  medium: 'Medium impact opportunity',
  high: 'Low impact opportunity',
}

export function uniqueSuggestions(suggestions: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const suggestion of suggestions) {
    if (seen.has(suggestion)) continue
    seen.add(suggestion)
    unique.push(suggestion)
  }
  return unique
}

/** Demo tasks per card — lead task cycles all eight types; optional lower-priority extras. */
export function fakeSuggestions(index: number): string[] {
  const lead = RECOMMENDED_TASKS[index % RECOMMENDED_TASKS.length]
  const leadRank = RECOMMENDED_TASK_PRIORITY.indexOf(lead)
  const lowerPriority = RECOMMENDED_TASK_PRIORITY.slice(leadRank + 1)
  if (!lowerPriority.length) return [lead]
  if (index % 4 === 0) {
    const extras = lowerPriority.slice(0, 5)
    return uniqueSuggestions([lead, ...extras])
  }
  const extra = lowerPriority[(index + 1) % lowerPriority.length]
  return extra === lead ? [lead] : [lead, extra]
}

export function primaryRecommendedTask(suggestions: string[]): string | null {
  const unique = uniqueSuggestions(suggestions)
  if (!unique.length) return null
  for (const task of RECOMMENDED_TASK_PRIORITY) {
    if (unique.includes(task)) return task
  }
  return unique[0]
}

/** Count of suggested tasks besides the primary (for “and N other tasks”). */
export function otherSuggestedTaskCount(suggestions: string[]): number {
  const unique = uniqueSuggestions(suggestions)
  if (unique.length <= 1) return 0
  return unique.length - 1
}

export function otherSuggestedTasksSuffix(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return ' and 1 other task'
  return ` and ${count} other tasks`
}

export function recommendedTaskTooltip(task: string): string {
  return RECOMMENDED_TASK_TOOLTIPS[task as (typeof RECOMMENDED_TASKS)[number]]
    ?? task
}

export function qualityBand(score: number): QualityBand {
  if (score >= HIGH_QUALITY_THRESHOLD) return 'high'
  if (score >= MEDIUM_QUALITY_THRESHOLD) return 'medium'
  return 'low'
}

export function impactOpportunityLabel(score: number): string {
  return IMPACT_OPPORTUNITY_LABEL[qualityBand(score)]
}

export function fakeViews(index: number): string {
  const count = VIEW_COUNTS[index % VIEW_COUNTS.length]
  return `${count}k views last month`
}

export function viewsCountForIndex(index: number): number {
  return VIEW_COUNTS[index % VIEW_COUNTS.length]
}

export function shortViewsLabel(viewsCount: number): string {
  return `${viewsCount}k`
}

/** Fixed demo scores so each quality band is visible in short lists. */
const DEMO_QUALITY_SCORES: Record<number, number> = {
  0: 62,
  1: 82,
  2: 38,
  3: 71,
}

export function demoQualityScore(index: number): number {
  if (index in DEMO_QUALITY_SCORES) return DEMO_QUALITY_SCORES[index]
  const bands: number[] = [62, 82, 38, 71, 55, 88, 42]
  return bands[index % bands.length]
}
