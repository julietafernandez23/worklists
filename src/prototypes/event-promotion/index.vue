<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxDialog, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconClose,
  cdxIconDownTriangle,
  cdxIconEdit,
  cdxIconLink,
  cdxIconQuotes,
  cdxIconTextStyle,
  cdxIconUndo,
} from '@wikimedia/codex-icons'

import { useRouter } from 'vue-router'
import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { wikimediaApiFetchHeaders } from '@/config'

const router = useRouter()

definePage({
  meta: {
    title: 'Event promotion',
    description: 'Prototype for event promotion.',
  },
})

const ARTICLE = 'Wet Leg'
const HOST = 'en.wikipedia.org'

const veMode = ref(false)
const veHtml = ref<string | null>(null)
const veLoading = ref(false)
const showPublishConfirm = ref(false)
const veHasEdits = ref(false)
const showBottomSheet = ref(false)
const showIntroDialog = ref(true)

async function openVE() {
  veMode.value = true
  veHasEdits.value = false
  showPublishConfirm.value = false

  if (veHtml.value !== null) return

  veLoading.value = true
  try {
    const url = `https://${HOST}/api/rest_v1/page/html/${encodeURIComponent(ARTICLE.replace(/ /g, '_'))}`
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

function onPublish() {
  veMode.value = false
  showPublishConfirm.value = false
  showBottomSheet.value = true
}

function onBackToRead() {
  veMode.value = false
  showPublishConfirm.value = false
}
</script>

<template>
  <!-- Reading mode -->
  <ChromeWrapper v-if="!veMode">
    <main class="ep__article">
      <ArticleLive :article="ARTICLE" @edit-click="openVE" />
    </main>

    <!-- Bottom sheet -->
    <Transition name="ep-sheet">
      <div v-if="showBottomSheet" class="ep__sheet-backdrop" @click.self="showBottomSheet = false">
        <div class="ep__sheet">
          <div class="ep__sheet-header">
            <p class="ep__sheet-title">Your edit connects to a larger effort</p>
            <CdxButton weight="quiet" :icon-only="true" aria-label="Close" @click="showBottomSheet = false">
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>
          <p class="ep__sheet-body">
            This article will be improved as part of the <strong>Women in Rock Editathon</strong>. Join this event to help make an impact and connect with other editors.
          </p>
          <p class="ep__sheet-note">To stop seeing this message, update your <a href="#" class="ep__sheet-link">preferences</a>.</p>
          <CdxButton weight="primary" action="progressive" class="ep__sheet-cta" @click="router.push('/event-promotion/event-page')">
            Visit event page
          </CdxButton>
        </div>
      </div>
    </Transition>
  </ChromeWrapper>

  <!-- Visual Editor mode -->
  <div v-else class="ve">
    <!-- Publish confirmation banner -->
    <Transition name="ve-banner">
      <div v-if="showPublishConfirm" class="ve__confirm-banner">
        ✓ Your changes have been published.
        <CdxButton weight="quiet" size="small" @click="showPublishConfirm = false">Dismiss</CdxButton>
      </div>
    </Transition>

    <!-- Editable article content -->
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

    <!-- VE toolbar (matches Wikipedia mobile VE) -->
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
      <CdxButton weight="primary" action="progressive" :icon-only="true" aria-label="Publish changes" class="ve__toolbar-publish" :disabled="!veHasEdits" @click="onPublish">
        <CdxIcon :icon="cdxIconArrowNext" />
      </CdxButton>
    </div>
  </div>

  <CdxDialog
    v-model:open="showIntroDialog"
    title="Try Event Promotion on Wikipedia"
    close-button-label="Close"
    :dismissable="false"
    :primary-action="{ label: 'Get started', actionType: 'progressive' }"
    @primary="showIntroDialog = false"
  >
    <div class="ep__intro-body">
      <p>Some editors are already working on relevant articles without knowing an event exists. This feature shows them a one-time invite when they edit an article on an event's worklist.</p>
      <p>This is an early prototype. Read the article, try making an edit, and see what happens when you publish. Your experience helps us shape what gets built.</p>
    </div>
  </CdxDialog>
</template>

<style scoped>
.ep__article {
  padding: 0 var(--spacing-100);
}

/* ── VE shell ── */
.ve {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: var(--background-color-base);
  font-family: var(--font-family-system-sans);
}

/* Publish confirmation */
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

/* Editable body */
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

/* Toolbar */
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

/* ── Bottom sheet ── */
.ep__sheet-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.ep__sheet {
  width: 100%;
  background-color: var(--background-color-base);
  border-radius: 0;
  padding: var(--spacing-100);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ep__sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-75);
}

.ep__sheet-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ep__sheet-body {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.ep__sheet-note {
  margin: 0;
  margin-top: 12px;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-x-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.ep__sheet-link {
  color: var(--color-progressive);
}

.ep__sheet-cta {
  width: 100%;
  justify-content: center;
  margin-top: var(--spacing-75);
}

.ep-sheet-enter-active {
  transition: opacity 0.3s ease;
}
.ep-sheet-leave-active {
  transition: opacity 0.25s ease;
}
.ep-sheet-enter-active .ep__sheet {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.ep-sheet-leave-active .ep__sheet {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}
.ep-sheet-enter-from,
.ep-sheet-leave-to {
  opacity: 0;
}
.ep-sheet-enter-from .ep__sheet {
  transform: translateY(100%);
}
.ep-sheet-leave-to .ep__sheet {
  transform: translateY(100%);
}
.ep__intro-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.ep__intro-body p {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}
</style>
