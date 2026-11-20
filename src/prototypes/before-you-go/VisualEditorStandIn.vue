<script setup lang="ts">
/**
 * Minimal Visual Editor stand-in (from event-promotion): Parsoid HTML in a
 * contenteditable surface plus a mobile-style toolbar. Prototype-only — not a real VE.
 */
import { ref, watch } from 'vue'
import { CdxButton, CdxDialog, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconClose,
  cdxIconEdit,
  cdxIconLink,
  cdxIconQuotes,
  cdxIconTextStyle,
  cdxIconUndo,
} from '@wikimedia/codex-icons'

import { wikimediaApiFetchHeaders } from '@/config'

const props = defineProps<{
  article: string
  host?: string
  /** Called when Close is pressed with no user edits (in addition to emit). */
  onExitWithoutEdits?: () => void
}>()

const emit = defineEmits<{
  publish: []
  /** Closed without typing — parent may file the article in Edit later. */
  exitWithoutEdits: []
  /** Confirmed discard of unsaved changes — return to read mode only. */
  discard: []
}>()

const veHtml = ref<string | null>(null)
const veLoading = ref(false)
const veHasEdits = ref(false)
const userDidEdit = ref(false)
const contentRef = ref<HTMLElement | null>(null)
const showPublishConfirm = ref(false)
const discardDialogOpen = ref(false)
const beforeYouGoDialogOpen = ref(false)

const htmlCache = new Map<string, string>()

/** VE stand-in edits body copy only — no infobox or lead hero / floated thumb in the surface. */
function prepareVeBodyHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('table.infobox').forEach((node) => node.remove())

  function stripLeadMedia(container: Element) {
    container
      .querySelectorAll('figure, .thumb, div.thumb')
      .forEach((node) => node.remove())
  }

  const leadSections = doc.querySelectorAll("section[data-mw-section-id='0']")
  if (leadSections.length) {
    leadSections.forEach((section) => stripLeadMedia(section))
  } else {
    stripLeadMedia(doc.body)
  }

  return doc.body.innerHTML
}

async function loadArticleHtml(title: string) {
  const cached = htmlCache.get(title)
  if (cached !== undefined) {
    veHtml.value = cached
    userDidEdit.value = false
    veHasEdits.value = false
    return
  }

  veLoading.value = true
  veHtml.value = null
  try {
    const wikiTitle = title.replace(/ /g, '_')
    const host = props.host ?? 'en.wikipedia.org'
    const url = `https://${host}/api/rest_v1/page/html/${encodeURIComponent(wikiTitle)}`
    const res = await fetch(url, {
      headers: { Accept: 'text/html; charset=utf-8', ...wikimediaApiFetchHeaders('page-html') },
    })
    const raw = await res.text()
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const body = prepareVeBodyHtml(bodyMatch ? bodyMatch[1] : raw)
    htmlCache.set(title, body)
    veHtml.value = body
    veHasEdits.value = false
  } catch {
    veHtml.value = '<p>Could not load article content.</p>'
  } finally {
    veLoading.value = false
  }
}

watch(
  () => props.article,
  (title) => {
    if (title) void loadArticleHtml(title)
  },
  { immediate: true },
)

watch(veHtml, (html) => {
  if (html !== null) {
    userDidEdit.value = false
    veHasEdits.value = false
  }
})

function onUserBeforeInput(event: InputEvent) {
  if (!event.isTrusted) return
  userDidEdit.value = true
  veHasEdits.value = true
}

function exitWithoutEdits() {
  showPublishConfirm.value = false
  props.onExitWithoutEdits?.()
  emit('exitWithoutEdits')
}

function onBackToRead() {
  if (userDidEdit.value) {
    discardDialogOpen.value = true
    return
  }
  beforeYouGoDialogOpen.value = true
}

function onViewSuggestions() {
  beforeYouGoDialogOpen.value = false
}

function onLeaveEditor() {
  beforeYouGoDialogOpen.value = false
  exitWithoutEdits()
}

function onContinueEditing() {
  discardDialogOpen.value = false
}

function onDiscardEdits() {
  discardDialogOpen.value = false
  userDidEdit.value = false
  veHasEdits.value = false
  emit('discard')
}

function onPublish() {
  emit('publish')
}
</script>

<template>
  <div class="ve">
    <Transition name="ve-banner">
      <div v-if="showPublishConfirm" class="ve__confirm-banner">
        ✓ Your changes have been published.
        <CdxButton weight="quiet" size="small" @click="showPublishConfirm = false">Dismiss</CdxButton>
      </div>
    </Transition>

    <div class="ve__body">
      <CdxProgressBar v-if="veLoading" inline aria-label="Loading article" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-if="veHtml !== null"
        ref="contentRef"
        class="ve__content mw-parser-output"
        contenteditable="true"
        v-html="veHtml"
        @beforeinput="onUserBeforeInput"
      />
    </div>

    <div class="ve__toolbar">
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" :icon-only="true" aria-label="Close" class="ve__toolbar-btn" @click="onBackToRead">
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>
      <div class="ve__toolbar-divider" />
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" :icon-only="true" aria-label="Undo" class="ve__toolbar-btn">
          <CdxIcon :icon="cdxIconUndo" />
        </CdxButton>
      </div>
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" aria-label="Text style" class="ve__toolbar-btn ve__toolbar-btn--chevron">
          <CdxIcon :icon="cdxIconTextStyle" /><span class="ve__chevron">∨</span>
        </CdxButton>
      </div>
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" :icon-only="true" aria-label="Insert quote" class="ve__toolbar-btn">
          <CdxIcon :icon="cdxIconQuotes" />
        </CdxButton>
      </div>
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" :icon-only="true" aria-label="Insert link" class="ve__toolbar-btn">
          <CdxIcon :icon="cdxIconLink" />
        </CdxButton>
      </div>
      <div class="ve__toolbar-item">
        <CdxButton weight="quiet" aria-label="Edit mode" class="ve__toolbar-btn ve__toolbar-btn--chevron">
          <CdxIcon :icon="cdxIconEdit" /><span class="ve__chevron">∨</span>
        </CdxButton>
      </div>
      <CdxButton
        weight="primary"
        action="progressive"
        :icon-only="true"
        aria-label="Publish changes"
        class="ve__toolbar-publish"
        :disabled="!veHasEdits"
        @click="onPublish"
      >
        <CdxIcon :icon="cdxIconArrowNext" />
      </CdxButton>
    </div>
  </div>

  <CdxDialog
    v-model:open="beforeYouGoDialogOpen"
    class="ve-before-you-go-dialog"
    title="Before you go"
    close-button-label="Close"
    :dismissable="true"
  >
    <p class="ve-before-you-go-dialog__message">
      There are some guided tasks to improve this article. Do you want to try them?
    </p>
    <template #footer>
      <div class="ve-before-you-go-dialog__actions">
        <CdxButton
          class="ve-before-you-go-dialog__btn ve-before-you-go-dialog__btn--suggestions"
          weight="normal"
          @click="onViewSuggestions"
        >
          View suggestions
        </CdxButton>
        <CdxButton class="ve-before-you-go-dialog__btn" weight="normal" @click="onLeaveEditor">
          Leave the editor
        </CdxButton>
      </div>
    </template>
  </CdxDialog>

  <CdxDialog
    v-model:open="discardDialogOpen"
    class="ve-discard-dialog"
    title="Are you sure?"
    close-button-label="Close"
    :dismissable="true"
  >
    <p class="ve-discard-dialog__message">
      Are you sure you want to leave editing mode without publishing first?
    </p>
    <template #footer>
      <div class="ve-discard-dialog__actions">
        <CdxButton
          class="ve-discard-dialog__btn"
          action="destructive"
          weight="primary"
          @click="onDiscardEdits"
        >
          Discard edits
        </CdxButton>
        <CdxButton class="ve-discard-dialog__btn" weight="normal" @click="onContinueEditing">
          Continue editing
        </CdxButton>
      </div>
    </template>
  </CdxDialog>
</template>

<style scoped>
.ve {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: var(--background-color-base);
  font-family: var(--font-family-system-sans);
}

.ve__confirm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-75) var(--spacing-100);
  background-color: var(--background-color-success-subtle, #d5fdf4);
  color: var(--color-success, #14866d);
  font-size: var(--font-size-small);
  flex-shrink: 0;
}

.ve-banner-enter-active,
.ve-banner-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.ve-banner-enter-from,
.ve-banner-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.ve__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-100);
  padding-top: calc(52px + var(--spacing-100));
}

.ve__content {
  outline: none;
  line-height: var(--line-height-medium);
  font-size: var(--font-size-medium);
  caret-color: var(--color-progressive);
  min-height: 100%;
}

.ve__content :deep(section[data-mw-section-id='0'] figure),
.ve__content :deep(section[data-mw-section-id='0'] .thumb) {
  display: none;
}

.ve__content :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.ve__content :deep(h2) {
  margin-top: var(--spacing-200);
  margin-bottom: var(--spacing-50);
  font-family: var(--font-family-serif, 'Linux Libertine', 'Georgia', serif);
  font-size: 1.8em;
  font-weight: var(--font-weight-normal, 400);
  border-bottom: 1px solid var(--border-color-subtle);
  padding-bottom: var(--spacing-50);
}

.ve__content :deep(h3) {
  margin-top: var(--spacing-150);
  font-family: var(--font-family-system-sans);
  font-size: 1em;
  font-weight: var(--font-weight-bold, 700);
}

.ve__toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  padding: 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
  background-color: var(--background-color-base);
}

.ve__toolbar-item {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.ve__toolbar-btn {
  width: 100%;
  justify-content: center;
  border-radius: 0 !important;
}

.ve__toolbar-btn--chevron {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-inline: var(--spacing-50) !important;
}

.ve__chevron {
  font-size: 9px;
  line-height: 1;
  color: var(--color-subtle);
  margin-top: 2px;
}

.ve__toolbar-divider {
  width: 1px;
  flex-shrink: 0;
  background-color: var(--border-color-subtle);
}

.ve__toolbar-publish {
  flex-shrink: 0;
  border-radius: 0 !important;
  align-self: stretch;
  height: auto !important;
  min-width: 52px;
}

.ve__toolbar :deep(.cdx-button) {
  min-height: 52px;
}

.ve-before-you-go-dialog__message {
  margin: 0;
}

.ve-before-you-go-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  width: 100%;
}

.ve-before-you-go-dialog__btn {
  width: 100%;
  justify-content: center;
}

.ve-before-you-go-dialog__btn--suggestions:not(:disabled) {
  background-color: var(--background-color-progressive-subtle, #eaf3ff);
  color: var(--color-progressive, #36c);
}

.ve-discard-dialog__message {
  margin: 0;
}

.ve-discard-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  width: 100%;
}

.ve-discard-dialog__btn {
  width: 100%;
  justify-content: center;
}
</style>
