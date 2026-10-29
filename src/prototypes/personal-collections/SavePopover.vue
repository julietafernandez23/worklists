<script setup lang="ts">
/**
 * Popover shown top-right after pressing the article bookmark.
 *  - `added`: the article was just saved → confirmation + collections to file it in.
 *  - `manage`: the article was already saved → Unsave + collections.
 * The target can be a whole article, a section or a passage.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconAdd, cdxIconCheck, cdxIconClose, cdxIconSuccess } from '@wikimedia/codex-icons'

import {
  keyOf,
  labelOf,
  SAVED_PATH,
  useCollections,
  type Collection,
  type SaveTarget,
} from './useCollections'
import { useToast } from './useToast'

const SAVED_PAGE = SAVED_PATH

const props = defineProps<{
  target: SaveTarget
  mode: 'added' | 'manage'
  /** Mobile (Minerva): show as a bottom sheet over a dimmed page instead of a corner popover. */
  sheet?: boolean
}>()

const key = computed(() => keyOf(props.target))
const label = computed(() => labelOf(props.target))
/** Manage heading: the article, or "Article › Section" / "Passage from Article". */
const manageHeading = computed(() => {
  const t = props.target
  if (t.kind === 'section') return `${t.title} › ${t.heading}`
  return label.value
})

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ createCollection: [] }>()

const { collections, isInCollection, addToCollection, removeFromCollection, unsave } =
  useCollections()
const { show } = useToast()

const panelRef = ref<HTMLElement | null>(null)

/**
 * Which collections showed ✓ when the popover opened. A row only flips to ✓
 * the *next* time the popover opens, not mid-interaction.
 */
const checkedOnOpen = ref(new Set<string>())

function close() {
  open.value = false
}

function onDocPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (panelRef.value?.contains(target)) return
  // The toolbar bookmark toggles the popover itself.
  if (target.closest('[data-save-trigger]')) return
  close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      checkedOnOpen.value = new Set(
        collections.value.filter((c) => isInCollection(key.value, c.id)).map((c) => c.id),
      )
      document.addEventListener('pointerdown', onDocPointerDown)
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      panelRef.value?.focus({ preventScroll: true })
    } else {
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

function collectionLink(collection: Collection) {
  return { label: collection.name, to: `${SAVED_PAGE}?collection=${collection.id}` }
}

function onRowClick(collection: Collection) {
  if (checkedOnOpen.value.has(collection.id)) {
    removeFromCollection(key.value, collection.id)
    show({
      type: 'notice',
      text: `${label.value} has been removed from`,
      link: collectionLink(collection),
    })
  } else {
    addToCollection(props.target, collection.id)
    show({
      type: 'success',
      text: `${label.value} has been added to`,
      link: collectionLink(collection),
    })
  }
  close()
}

function onUnsave() {
  unsave(key.value)
  close()
  show({
    type: 'notice',
    text: `${label.value} has been removed from`,
    link: { label: 'saved items', to: SAVED_PAGE },
  })
}

function onCreate() {
  close()
  emit('createCollection')
}
</script>

<template>
  <!-- Bottom sheet only: dims the page; tapping it closes (outside the panel). -->
  <Transition name="save-popover-fade">
    <div v-if="open && sheet" class="save-popover__backdrop" aria-hidden="true" />
  </Transition>
  <Transition name="save-popover-sheet" :css="!!sheet">
    <div
      v-if="open"
      ref="panelRef"
      class="save-popover"
      :class="{ 'save-popover--sheet': sheet }"
      role="dialog"
      :aria-label="mode === 'added' ? `${label} added to saved items` : manageHeading"
      tabindex="-1"
    >
      <div class="save-popover__head">
        <template v-if="mode === 'added'">
          <CdxIcon class="save-popover__success" :icon="cdxIconSuccess" />
          <p class="save-popover__heading">
            {{ label }} added to
            <RouterLink class="save-popover__heading-link" :to="SAVED_PAGE">saved items</RouterLink>
          </p>
        </template>
        <p v-else class="save-popover__heading">{{ manageHeading }}</p>

        <CdxButton
          v-if="sheet || mode === 'manage' || collections.length"
          class="save-popover__close"
          weight="quiet"
          aria-label="Close"
          @click="close"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>

      <p v-if="mode === 'added' && !collections.length" class="save-popover__hint">
        Organize your saved item into a collection
      </p>

      <!--
        One scroll area for everything below the heading — Unsave, Create
        collection and the collections — about 6 rows tall so it stays short.
      -->
      <div class="save-popover__scroll">
        <ul class="save-popover__list">
          <li v-if="mode === 'manage'" class="save-popover__row">
            <button
              type="button"
              class="save-popover__action save-popover__action--destructive"
              @click="onUnsave"
            >
              Unsave
            </button>
          </li>
          <li class="save-popover__row">
            <button
              type="button"
              class="save-popover__action save-popover__action--progressive"
              @click="onCreate"
            >
              Create collection
            </button>
          </li>
        </ul>

        <ul v-if="collections.length" class="save-popover__list">
          <li v-for="collection in collections" :key="collection.id" class="save-popover__row">
            <button
              type="button"
              class="save-popover__collection"
              :aria-label="
                checkedOnOpen.has(collection.id)
                  ? `Remove from ${collection.name}`
                  : `Add to ${collection.name}`
              "
              @click="onRowClick(collection)"
            >
              <span>{{ collection.name }}</span>
              <CdxIcon
                :class="{ 'save-popover__check': checkedOnOpen.has(collection.id) }"
                :icon="checkedOnOpen.has(collection.id) ? cdxIconCheck : cdxIconAdd"
                size="small"
              />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.save-popover {
  box-sizing: border-box;
  width: 316px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  padding: var(--spacing-100, 16px);
  padding-bottom: var(--spacing-50, 8px);
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.15));
  color: var(--color-base, #202122);
  font-family: var(--font-family-base);
}

.save-popover:focus {
  outline: none;
}

.save-popover__head {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}

.save-popover__success {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-icon-success, #099979);
}

.save-popover__heading {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.625);
}

.save-popover__heading-link {
  display: inline;
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.save-popover__heading-link:hover {
  text-decoration: underline;
}

.save-popover__close {
  flex-shrink: 0;
  margin: -6px -8px 0 0;
}

.save-popover__hint {
  margin: var(--spacing-100, 16px) 0 0;
  padding-bottom: var(--spacing-75, 12px);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.save-popover__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.save-popover__row {
  margin: 0;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}

.save-popover__head + .save-popover__scroll {
  margin-top: var(--spacing-75, 12px);
}

.save-popover__action,
.save-popover__collection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
  width: 100%;
  min-height: 46px;
  margin: 0;
  padding: var(--spacing-50, 8px) 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
  text-align: start;
  cursor: pointer;
}

.save-popover__action--progressive {
  color: var(--color-progressive, #36c);
}

.save-popover__action--destructive {
  font-size: var(--font-size-small, 14px);
  color: var(--color-destructive, #bf3c2c);
}

.save-popover__action:hover {
  text-decoration: underline;
}

.save-popover__collection {
  color: var(--color-base, #202122);
}

.save-popover__collection:hover {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.save-popover__action:focus-visible,
.save-popover__collection:focus-visible {
  outline: 2px solid var(--outline-color-progressive--focus, #36c);
  outline-offset: -2px;
}

/*
 * Scroll area: ~6 rows (46px + 1px divider each) before it scrolls. The
 * scrollbar is styled so it's always visible (macOS hides overlay scrollbars),
 * signalling that there's more below.
 */
.save-popover__scroll {
  max-height: calc(6 * 47px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Keep the +/✓ icons clear of the scrollbar. */
.save-popover__scroll .save-popover__collection {
  padding-inline-end: var(--spacing-75, 12px);
}

.save-popover__scroll::-webkit-scrollbar {
  width: 8px;
}

.save-popover__scroll::-webkit-scrollbar-track {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
  border-radius: 4px;
}

.save-popover__scroll::-webkit-scrollbar-thumb {
  background-color: var(--border-color-base, #a2a9b1);
  border-radius: 4px;
}

.save-popover__check {
  color: var(--color-progressive, #36c);
}

/* ---- Mobile bottom sheet ---- */
.save-popover__backdrop {
  position: fixed;
  inset: 0;
  background-color: var(--background-color-backdrop-light, rgba(255, 255, 255, 0.65));
}

.save-popover--sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  max-height: 85vh;
  padding-top: var(--spacing-150, 24px);
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
  border: 0;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
}

/* Grab handle, as on native sheets. */
.save-popover--sheet::before {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background-color: var(--border-color-base, #a2a9b1);
  content: '';
  transform: translateX(-50%);
}

.save-popover-sheet-enter-active,
.save-popover-sheet-leave-active {
  transition: transform var(--transition-duration-medium, 250ms) ease;
}

.save-popover-sheet-enter-from,
.save-popover-sheet-leave-to {
  transform: translateY(100%);
}

.save-popover-fade-enter-active,
.save-popover-fade-leave-active {
  transition: opacity var(--transition-duration-medium, 250ms) ease;
}

.save-popover-fade-enter-from,
.save-popover-fade-leave-to {
  opacity: 0;
}
</style>
