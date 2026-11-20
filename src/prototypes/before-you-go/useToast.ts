import { reactive } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'notice'
  /** Light Codex message vs dark full-width snackbar (VE exit). */
  variant?: 'message' | 'snackbar'
  /** Snackbar headline, e.g. "Edits discarded". */
  title?: string
  /** Text before the optional link, e.g. "Wombat has been added to". */
  text: string
  link?: { label: string; to: string }
  /** Optional trailing action (e.g. Save / Undo). */
  actionLabel?: string
  /** Snackbar: show a close control (default true for snackbar). */
  dismissable?: boolean
  /** Stay until dismiss, link click, or action — no auto-timeout. */
  persistent?: boolean
}

const TOAST_MS = 9000

const state = reactive<{ current: Toast | null }>({ current: null })
let timer: ReturnType<typeof setTimeout> | undefined
let nextId = 1
let actionHandler: (() => void) | undefined

/** One transient confirmation at a time, shown top-right under the header. */
export function useToast() {
  function show(toast: Omit<Toast, 'id'>, onAction?: () => void) {
    clearTimeout(timer)
    actionHandler = onAction
    state.current = { ...toast, id: nextId++ }
    if (
      !toast.persistent
      && (toast.variant !== 'snackbar' || !toast.actionLabel)
    ) {
      timer = setTimeout(dismiss, TOAST_MS)
    }
  }

  function dismiss() {
    clearTimeout(timer)
    actionHandler = undefined
    state.current = null
  }

  function runAction() {
    actionHandler?.()
    dismiss()
  }

  return { state, show, dismiss, runAction }
}
