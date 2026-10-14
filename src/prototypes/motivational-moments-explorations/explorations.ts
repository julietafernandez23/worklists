export type MmeExplorationId =
  | 'save-for-later'
  | 'inside-collection'
  | 'collection-reminders'
  | 'mark-done-on-publish'
  | 'since-last-visit'
  | 'collection-complete'

export type MmeExploration = {
  id: MmeExplorationId
  label: string
  path: string
}

export const MME_EXPLORATIONS: MmeExploration[] = [
  {
    id: 'save-for-later',
    label: 'Save for later',
    path: '/motivational-moments-explorations',
  },
  {
    id: 'inside-collection',
    label: 'Inside a collection',
    path: '/motivational-moments-explorations/collection',
  },
  {
    id: 'collection-reminders',
    label: 'Collection reminders',
    path: '/motivational-moments-explorations/collection-reminders',
  },
  {
    id: 'mark-done-on-publish',
    label: 'Mark as done on publish',
    path: '/motivational-moments-explorations/mark-done-on-publish',
  },
  {
    id: 'since-last-visit',
    label: 'Since your last visit',
    path: '/motivational-moments-explorations/since-last-visit',
  },
  {
    id: 'collection-complete',
    label: 'Collection complete',
    path: '/motivational-moments-explorations/collection-complete',
  },
]

export const MME_HOME_PATH = '/motivational-moments-explorations'
export const MME_MARK_DONE_HOME_PATH = '/motivational-moments-explorations/mark-done-on-publish'
