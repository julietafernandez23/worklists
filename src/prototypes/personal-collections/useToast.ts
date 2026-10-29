import { reactive } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'notice'
  /** Text before the optional link, e.g. "Wombat has been added to". */
  text: string
  link?: { label: string; to: string }
}

const TOAST_MS = 5000

const state = reactive<{ current: Toast | null }>({ current: null })
let timer: ReturnType<typeof setTimeout> | undefined
let nextId = 1

/** One transient confirmation at a time, shown top-right under the header. */
export function useToast() {
  function show(toast: Omit<Toast, 'id'>) {
    clearTimeout(timer)
    state.current = { ...toast, id: nextId++ }
    timer = setTimeout(dismiss, TOAST_MS)
  }

  function dismiss() {
    clearTimeout(timer)
    state.current = null
  }

  return { state, show, dismiss }
}
