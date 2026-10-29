import { reactive } from 'vue'

/** Height of the Vector-style sticky header, in px. */
export const STICKY_HEADER_HEIGHT = 50

/**
 * Whether the article sticky header is currently showing. Shared so the
 * popover/toast layer (in `SavedChrome`) can sit just below it.
 */
export const stickyHeader = reactive({ visible: false })
