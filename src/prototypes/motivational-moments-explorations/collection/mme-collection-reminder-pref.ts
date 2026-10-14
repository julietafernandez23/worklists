export type ReminderDelivery = 'notifications' | 'email' | 'both'

export type CollectionReminderPreferences = {
  enabled: boolean
  remindUnworkedSummary: boolean
  remindArticleChanges: boolean
  delivery: ReminderDelivery
}

const STORAGE_KEY = 'mme-collection-reminder-prompt-v1'

export function hasCompletedReminderPrompt(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function loadReminderPreferences(): CollectionReminderPreferences | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CollectionReminderPreferences
  } catch {
    return null
  }
}

export function saveReminderPromptResult(prefs: CollectionReminderPreferences): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function clearReminderPromptForDemo(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
