<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxField, CdxIcon, CdxProgressBar, CdxSelect } from '@wikimedia/codex'
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
import { addArticleToCollection } from '@/prototypes/collections-view-modes/saved-items'
import PublishMarkDoneSheet from './PublishMarkDoneSheet.vue'

const MARK_DONE_SHEET_OPEN_DELAY_MS = 400

const props = withDefaults(
  defineProps<{
    article: string
    markDoneOnPublish?: boolean
    collectionName?: string
  }>(),
  {
    markDoneOnPublish: false,
    collectionName: 'Animals who made history',
  },
)

const emit = defineEmits<{
  close: []
  publish: []
}>()

const HOST = 'en.wikipedia.org'

const veHtml = ref<string | null>(null)
const veLoading = ref(false)
const showPublishConfirm = ref(false)
const veHasEdits = ref(false)
const publishedThisSession = ref(false)

const COLLECTIONS = [
  'Fav film actresses',
  'Odd and interesting articles',
  'Birds I want to see in Costa Rica',
  'Articles on bands I want to edit',
]

const collectionMenuItems = COLLECTIONS.map((name) => ({ value: name, label: name }))
const selectedCollection = ref<string | null>(null)
const showSaveToCollection = ref(false)
const showMarkDoneSheet = ref(false)

const canSaveToCollection = computed(() => Boolean(selectedCollection.value))

async function loadArticleHtml() {
  veHasEdits.value = false
  showPublishConfirm.value = false
  veHtml.value = null
  veLoading.value = true
  try {
    const slug = props.article.replace(/ /g, '_')
    const url = `https://${HOST}/api/rest_v1/page/html/${encodeURIComponent(slug)}`
    const res = await fetch(url, {
      headers: { Accept: 'text/html; charset=utf-8', ...wikimediaApiFetchHeaders('page-html') },
    })
    const raw = await res.text()
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    veHtml.value = bodyMatch ? bodyMatch[1] : raw
  } catch {
    veHtml.value = '<p>Could not load article content.</p>'
  } finally {
    veLoading.value = false
  }
}

watch(() => props.article, loadArticleHtml, { immediate: true })

function onPublish() {
  publishedThisSession.value = true
  showPublishConfirm.value = true
  emit('publish')
  if (props.markDoneOnPublish) {
    window.setTimeout(() => {
      showMarkDoneSheet.value = true
    }, MARK_DONE_SHEET_OPEN_DELAY_MS)
  }
}

function finishAfterPublishChoice() {
  showMarkDoneSheet.value = false
  emit('close')
}

function onCloseClick() {
  if (publishedThisSession.value) {
    showMarkDoneSheet.value = false
    emit('close')
    return
  }
  selectedCollection.value = null
  showSaveToCollection.value = true
}

function dismissSaveSheet() {
  showSaveToCollection.value = false
}

function leaveEditor() {
  showSaveToCollection.value = false
  emit('close')
}

function onSaveToCollection() {
  if (!selectedCollection.value) return
  addArticleToCollection(selectedCollection.value, props.article)
  leaveEditor()
}

function onNotNow() {
  leaveEditor()
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
        class="ve__content mw-parser-output"
        contenteditable="true"
        v-html="veHtml"
        @input="veHasEdits = true"
      />
    </div>

    <div class="ve__toolbar">
      <div class="ve__toolbar-item">
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          class="ve__toolbar-btn"
          @click="onCloseClick"
        >
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

    <Transition name="ve-sheet">
      <div
        v-if="showSaveToCollection"
        class="ve__sheet-backdrop"
        @click.self="dismissSaveSheet"
      >
        <div class="ve__sheet">
          <div class="ve__sheet-header">
            <p class="ve__sheet-title">Save for later</p>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Close"
              @click="dismissSaveSheet"
            >
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>
          <p class="ve__sheet-body">
            Want to work on this article later? Save it to a collection so you can come back to it.
          </p>
          <CdxField class="ve__sheet-field">
            <template #label>Save to a collection</template>
            <CdxSelect
              :selected="selectedCollection"
              :menu-items="collectionMenuItems"
              default-label="Choose a collection"
              @update:selected="(value) => { selectedCollection = value as string | null }"
            />
          </CdxField>
          <CdxButton
            weight="primary"
            action="progressive"
            class="ve__sheet-cta"
            :disabled="!canSaveToCollection"
            @click="onSaveToCollection"
          >
            Save to collection
          </CdxButton>
          <CdxButton weight="quiet" class="ve__sheet-dismiss" @click="onNotNow">
            Not now
          </CdxButton>
        </div>
      </div>
    </Transition>

    <PublishMarkDoneSheet
      v-if="markDoneOnPublish"
      v-model:open="showMarkDoneSheet"
      :collection-name="collectionName"
      @mark-done="finishAfterPublishChoice"
      @keep-working="finishAfterPublishChoice"
    />
  </div>
</template>

<style scoped>
.ve {
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

/* Bottom sheet (matches event-promotion pattern) */
.ve__sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background-color: rgba(0, 0, 0, 0.4);
}

.ve__sheet {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: var(--spacing-100);
  background-color: var(--background-color-base);
  border-radius: 0;
}

.ve__sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-75);
}

.ve__sheet-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ve__sheet-body {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.ve__sheet-field {
  margin-top: var(--spacing-100);
  width: 100%;
  min-width: 0;
}

.ve__sheet-field:deep(.cdx-select-vue) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.ve__sheet-field:deep(.cdx-select-vue__handle) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ve__sheet-cta {
  width: 100%;
  justify-content: center;
  margin-top: var(--spacing-100);
}

.ve__sheet-dismiss {
  width: 100%;
  justify-content: center;
  margin-top: var(--spacing-50);
}

.ve-sheet-enter-active {
  transition: opacity 0.3s ease;
}

.ve-sheet-leave-active {
  transition: opacity 0.25s ease;
}

.ve-sheet-enter-active .ve__sheet {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.ve-sheet-leave-active .ve__sheet {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}

.ve-sheet-enter-from,
.ve-sheet-leave-to {
  opacity: 0;
}

.ve-sheet-enter-from .ve__sheet {
  transform: translateY(100%);
}

.ve-sheet-leave-to .ve__sheet {
  transform: translateY(100%);
}
</style>
