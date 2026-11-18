<script setup lang="ts">
definePage({
  meta: {
    title: 'Before you go',
    description: 'Display editing information in your personal collections',
    platform: 'web',
  },
})

import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEllipsis,
  cdxIconStar,
} from '@wikimedia/codex-icons'

import ArticleLive from '@/components/article/ArticleLive.vue'
import { globalSkin } from '@/theme'
import CreateCollectionDialog from './CreateCollectionDialog.vue'
import InArticleSaves from './InArticleSaves.vue'
import SavedChrome from './SavedChrome.vue'
import SavePopover from './SavePopover.vue'
import StickyHeader from './StickyHeader.vue'
import VeExitChooseSavePopover from './VeExitChooseSavePopover.vue'
import VeExitEditLaterPopover from './VeExitEditLaterPopover.vue'
import VisualEditorStandIn from './VisualEditorStandIn.vue'
import {
  ARTICLE_PATH,
  keyOf,
  labelOf,
  normalizeTitle,
  SAVED_PATH,
  EDIT_LATER_COLLECTION_NAME,
  useCollections,
  type Collection,
  type SaveTarget,
} from './useCollections'
import { useToast } from './useToast'

const route = useRoute()
const router = useRouter()
const EDIT_LATER_COLLECTION = EDIT_LATER_COLLECTION_NAME

const {
  isSaved,
  save,
  unsave,
  addToCollection,
  findPassage,
  startArticle,
  onboarding,
  createCollection,
  collections,
  explorations,
} = useCollections()
const { show, dismiss } = useToast()

const article = computed(() => normalizeTitle(String(route.query.title || startArticle.value)))
const saved = computed(() => isSaved(article.value))

/** Where a Saved-page card asked to land: a section anchor or a saved passage's text. */
const focusSection = computed(() => (route.query.section ? String(route.query.section) : undefined))
const focusExcerpt = computed(() => {
  if (!route.query.passage) return undefined
  const item = findPassage(article.value, String(route.query.passage))
  return item?.kind === 'passage' ? item.excerpt : undefined
})

const parserRoot = shallowRef<HTMLElement | null>(null)

const popoverOpen = ref(false)
const popoverMode = ref<'added' | 'manage'>('added')
const popoverTarget = ref<SaveTarget>({ kind: 'article', title: article.value })
const popoverAddedTo = ref<{ id: string; name: string } | null>(null)
const dialogOpen = ref(false)
const veMode = ref(false)
const veExitPopoverOpen = ref(false)
const veExitChooseSaveOpen = ref(false)
const veExitUndoKey = ref<string | null>(null)
const veExitCollectionId = ref('')
const veExitCollectionName = ref(EDIT_LATER_COLLECTION)

watch(article, () => {
  popoverOpen.value = false
  popoverAddedTo.value = null
  veExitPopoverOpen.value = false
  veExitChooseSaveOpen.value = false
  parserRoot.value = null
  veMode.value = false
  window.scrollTo(0, 0)
})

watch(popoverOpen, (open) => {
  if (!open) popoverAddedTo.value = null
})

watch(
  () => explorations.veExitEditLater,
  (_mode, prev) => {
    if (prev === undefined) return
    dismiss()
    veExitPopoverOpen.value = false
    veExitChooseSaveOpen.value = false
    popoverOpen.value = false
    popoverAddedTo.value = null
    veMode.value = false
    veExitUndoKey.value = null
  },
)

function openVisualEditor() {
  popoverOpen.value = false
  dismiss()
  veMode.value = true
}

function closeVisualEditor() {
  veMode.value = false
}

function ensureEditLaterCollection(): Collection {
  const existing = collections.value.find(
    (c) => c.name.toLowerCase() === EDIT_LATER_COLLECTION.toLowerCase(),
  )
  return existing ?? createCollection(EDIT_LATER_COLLECTION)
}

/** Left the editor without publishing → optional Edit later toast / popover exploration. */
function onVeExitWithoutEdits() {
  veMode.value = false
  const mode = explorations.veExitEditLater
  if (mode === 'off') return

  popoverOpen.value = false
  dismiss()

  if (mode === 'choose-save-popover') {
    const collection = ensureEditLaterCollection()
    veExitCollectionId.value = collection.id
    veExitCollectionName.value = collection.name
    veExitChooseSaveOpen.value = true
    return
  }

  const collection = ensureEditLaterCollection()
  const target: SaveTarget = { kind: 'article', title: article.value }
  const key = keyOf(target)
  save(target)
  addToCollection(target, collection.id)

  if (mode === 'toast') {
    show(
      {
        type: 'notice',
        text: 'Added to ',
        link: {
          label: collection.name,
          to: `${SAVED_PATH}?collection=${collection.id}`,
        },
        actionLabel: 'Undo',
      },
      () => unsave(key),
    )
    return
  }

  veExitUndoKey.value = key
  veExitCollectionId.value = collection.id
  veExitCollectionName.value = collection.name
  veExitPopoverOpen.value = true
}

function onVeExitChooseSave() {
  const collection = ensureEditLaterCollection()
  const target: SaveTarget = { kind: 'article', title: article.value }
  save(target)
  addToCollection(target, collection.id)
  show({
    variant: 'snackbar',
    type: 'notice',
    text: `${article.value} added to `,
    link: {
      label: collection.name,
      to: `${SAVED_PATH}?collection=${collection.id}`,
    },
    dismissable: false,
  })
}

function onVeExitPopoverUndo() {
  if (veExitUndoKey.value) unsave(veExitUndoKey.value)
  veExitUndoKey.value = null
}

function onVeDiscardEdits() {
  veMode.value = false
}

/** Non-article namespaces — these open on Wikipedia instead of in the prototype. */
const NAMESPACE =
  /^(file|image|media|special|help|wikipedia|wp|template|category|portal|talk|user|draft|module|mediawiki|timedtext|book|wikt|wiktionary|commons|[a-z ]+ talk):/i

/**
 * Article bodies link with Parsoid-relative hrefs (`./Title`). Keep readers
 * inside the prototype: wiki links open here, same-page anchors scroll, and
 * everything else (files, help pages…) opens on Wikipedia in a new tab.
 */
function onArticleClick(event: MouseEvent) {
  const anchor = (event.target as HTMLElement).closest('a')
  const href = anchor?.getAttribute('href')
  if (!anchor || !href?.startsWith('./')) return
  event.preventDefault()

  const [path, fragment] = href.slice(2).split('#')
  const title = normalizeTitle(decodeURIComponent(path.split('?')[0]))

  if (fragment && title === article.value) {
    document.getElementById(decodeURIComponent(fragment))?.scrollIntoView()
    return
  }
  if (NAMESPACE.test(title) || !anchor.getAttribute('rel')?.includes('mw:WikiLink')) {
    window.open(`https://en.wikipedia.org/wiki/${href.slice(2)}`, '_blank', 'noopener')
    return
  }

  const to = { path: ARTICLE_PATH, query: { title } }
  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    window.open(router.resolve(to).href, '_blank')
  } else {
    void router.push(to)
  }
}

/**
 * Every entry point (article bookmark, section bookmark, paragraph Save) lands
 * here: first press saves and offers collections; pressing a saved item manages it.
 */
async function requestSave(target: SaveTarget) {
  const key = keyOf(target)
  if (popoverOpen.value) {
    popoverOpen.value = false
    // Same item pressed again just closes; a different one reopens fresh.
    if (keyOf(popoverTarget.value) === key) return
    await nextTick()
  }
  dismiss()
  popoverAddedTo.value = null
  popoverTarget.value = target
  if (isSaved(key)) {
    popoverMode.value = 'manage'
  } else {
    save(target)
    popoverMode.value = 'added'
    if (onboarding.value === 'waiting') onboarding.value = 'armed'
  }
  popoverOpen.value = true
}

/**
 * First save from scratch: once its popover (and any Create collection dialog
 * opened from it) is dismissed, show the "Saved" tip on the user menu. It takes
 * the place of that save's confirmation message, so only one thing shows.
 */
watch(
  [popoverOpen, dialogOpen, onboarding],
  ([popover, dialog, step]) => {
    if (step !== 'armed' || popover || dialog) return
    dismiss()
    onboarding.value = 'showing'
  },
  { flush: 'post', immediate: true },
)

function onBookmarkClick() {
  requestSave({ kind: 'article', title: article.value })
}

function onCollectionCreated(collection: Collection) {
  addToCollection(popoverTarget.value, collection.id)
  if (onboarding.value === 'armed') return
  show({
    type: 'success',
    text: `${labelOf(popoverTarget.value)} has been added to`,
    link: { label: collection.name, to: `${SAVED_PATH}?collection=${collection.id}` },
  })
}
</script>

<template>
  <!-- SavedChrome stays mounted so save toasts work while the VE overlay is open. -->
  <SavedChrome>
    <div v-show="!veMode" class="pc-article" @click="onArticleClick">
      <ArticleLive :article="article" @edit-click="openVisualEditor" @parser-ready="parserRoot = $event">
        <!-- Mobile (Minerva) icon toolbar: the star becomes the save bookmark. -->
        <template #header-mobile-watch>
          <button
            type="button"
            class="pc-mobile-bookmark"
            data-save-trigger
            :aria-label="saved ? 'Saved — manage' : 'Save this article'"
            :aria-pressed="saved"
            :aria-expanded="popoverOpen"
            @click="onBookmarkClick"
          >
            <CdxIcon :icon="saved ? cdxIconBookmark : cdxIconBookmarkOutline" />
          </button>
        </template>
        <template #header-actions>
          <a href="#" class="pc-action pc-action--active" aria-current="true" @click.prevent
            >Read</a
          >
          <a href="#" class="pc-action" @click.prevent="openVisualEditor">Edit</a>
          <a href="#" class="pc-action" @click.prevent>Edit source</a>
          <a href="#" class="pc-action" @click.prevent>View history</a>
          <a href="#" class="pc-action pc-action--watch" @click.prevent>
            <CdxIcon :icon="cdxIconStar" size="x-small" />Watch
          </a>
          <CdxButton
            class="pc-bookmark"
            weight="quiet"
            data-save-trigger
            :aria-label="saved ? 'Saved — manage' : 'Save this article'"
            :aria-pressed="saved"
            :aria-expanded="popoverOpen"
            @click="onBookmarkClick"
          >
            <CdxIcon :icon="saved ? cdxIconBookmark : cdxIconBookmarkOutline" />
          </CdxButton>
          <CdxButton class="pc-more" weight="quiet" aria-label="More options">
            <CdxIcon class="pc-more__icon" :icon="cdxIconEllipsis" />
          </CdxButton>
        </template>
      </ArticleLive>
      <InArticleSaves
        :root="parserRoot"
        :title="article"
        :focus-section="focusSection"
        :focus-excerpt="focusExcerpt"
        @request="requestSave"
      />
    </div>

    <!-- Desktop only, like Vector 2022's own sticky header. -->
    <StickyHeader
      v-if="globalSkin === 'desktop' && !veMode"
      :title="article"
      :saved="saved"
      :popover-open="popoverOpen"
      @bookmark-click="onBookmarkClick"
      @edit-click="openVisualEditor"
    />

    <template #panel>
      <SavePopover
        v-model:open="popoverOpen"
        :target="popoverTarget"
        :mode="popoverMode"
        :added-to-collection="popoverAddedTo"
        :sheet="globalSkin === 'mobile'"
        @create-collection="dialogOpen = true"
      />
      <VeExitEditLaterPopover
        v-model:open="veExitPopoverOpen"
        :article-title="article"
        :collection-id="veExitCollectionId"
        :collection-name="veExitCollectionName"
        :sheet="globalSkin === 'mobile'"
        @undo="onVeExitPopoverUndo"
      />
      <VeExitChooseSavePopover
        v-model:open="veExitChooseSaveOpen"
        :collection-id="veExitCollectionId"
        :collection-name="veExitCollectionName"
        :sheet="globalSkin === 'mobile'"
        @save="onVeExitChooseSave"
      />
    </template>
  </SavedChrome>

  <VisualEditorStandIn
    v-if="veMode"
    :article="article"
    :on-exit-without-edits="onVeExitWithoutEdits"
    @publish="closeVisualEditor"
    @discard="onVeDiscardEdits"
  />

  <CreateCollectionDialog v-model:open="dialogOpen" @created="onCollectionCreated" />
</template>

<style scoped>
/* Mirrors ArticleHeader's own action styles (slot content isn't covered by its scoped CSS). */
.pc-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0 0 -1px;
  padding: var(--spacing-50, 8px) 1px;
  border-bottom: 2px solid transparent;
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.pc-action:hover {
  text-decoration: underline;
}

.pc-action--active {
  border-bottom-color: var(--color-base, #202122);
  color: var(--color-base, #202122);
  font-weight: var(--font-weight-bold, 700);
}

.pc-action--active:hover {
  text-decoration: none;
}

.pc-action--watch :deep(.cdx-icon) {
  color: var(--color-progressive, #36c);
}

/*
 * Icon buttons are 32px wide around a 20px glyph (6px inset per side). Pull
 * them in so the visible gap matches the row's 12px gap between text links.
 */
.pc-bookmark,
.pc-more {
  color: var(--color-base, #202122);
}

.pc-bookmark {
  margin-inline-start: -6px;
}

.pc-more {
  margin-inline: -12px -6px;
}

/* Codex only ships a horizontal ellipsis — rotate it into a vertical "⋮". */
.pc-more__icon {
  transform: rotate(90deg);
}

/* Matches ArticleHeader's mobile `.article-header__icon-tool` buttons. */
.pc-mobile-bookmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base, 2px);
  background: transparent;
  cursor: pointer;
}

.pc-mobile-bookmark :deep(.cdx-icon) {
  color: var(--color-subtle, #54595d);
}

.pc-mobile-bookmark[aria-pressed='true'] :deep(.cdx-icon) {
  color: var(--color-base, #202122);
}

/*
 * Hide the full-width lead figure Parsoid places above the opening paragraph
 * (mobile hero image). Infobox lead media stays in the infobox on read mode.
 */
.pc-article :deep(section[data-mw-section-id='0'] > figure),
.pc-article :deep(section[data-mw-section-id='0'] > .thumb) {
  display: none;
}

.pc-article :deep(table.infobox tr.infobox-image),
.pc-article :deep(table.infobox .infobox-image) {
  display: none;
}
</style>
