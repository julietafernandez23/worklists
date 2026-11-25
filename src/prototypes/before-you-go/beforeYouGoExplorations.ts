/**
 * Before you go — prototype behavior toggles (hamburger → Prototype settings).
 * Add each exploration here with label + hint for the settings panel.
 */
export type VeExitEditLaterMode =
  | 'toast'
  | 'popover'
  | 'choose-save-popover'
  | 'invite-collection-ui'
  | 'off'

export interface BeforeYouGoExplorations {
  /**
   * Close the visual editor without publishing → add to Edit later and show
   * feedback (toast or dialog popover), with Undo.
   */
  veExitEditLater: VeExitEditLaterMode
}

export const DEFAULT_EXPLORATIONS: BeforeYouGoExplorations = {
  veExitEditLater: 'toast',
}

export const VE_EXIT_EDIT_LATER_OPTIONS = [
  {
    value: 'toast' as const,
    label: 'Auto-add toast (with Undo)',
    hint: 'On close without publishing: notice toast with Undo, article added to Edit later.',
  },
  {
    value: 'popover' as const,
    label: 'Popover (with Undo)',
    hint: 'On close without publishing: confirmation popover with Undo, article added to Edit later.',
  },
  {
    value: 'choose-save-popover' as const,
    label: 'Choose to save (popover)',
    hint: 'On close without publishing: popover to save to Edit later or dismiss.',
  },
  {
    value: 'invite-collection-ui' as const,
    label: 'Invitation to save + existing collection UI',
    hint: 'On close without publishing: invite popover, then the bookmark save popover to pick a Collection.',
  },
] as const

/** @deprecated Use VE_EXIT_EDIT_LATER_OPTIONS */
export const VE_EXIT_EDIT_LATER_TOAST = VE_EXIT_EDIT_LATER_OPTIONS[0]