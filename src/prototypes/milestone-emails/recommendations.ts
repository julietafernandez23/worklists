export type MilestoneRecommendation = {
  title: string
  task: string
}

/** Same trio as the milestone email body — shared with the post-CTA dialog. */
export const MILESTONE_RECOMMENDATIONS: MilestoneRecommendation[] = [
  { title: 'Bird migration', task: 'Add citations' },
  { title: 'Atlantic Forest', task: 'Expand article' },
  { title: 'Ecosystem', task: 'Add images' },
]

export const DEFAULT_COLLECTION_NAME = 'Articles to improve'

/** Saved route after the milestone email “Add to collection” CTA. */
export const MILESTONE_COLLECTION_ID = 'articles-to-improve-3'