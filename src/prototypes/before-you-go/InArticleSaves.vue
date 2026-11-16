<script setup lang="ts">
/**
 * In-article save entry points, injected into the live article body:
 *  - a bookmark at the end of each section heading (shown on hover, or always once saved)
 *  - click a paragraph to select it → a bookmark button above its top-right corner
 * Also scrolls to a section (with a brief flash) or passage opened from the Saved page.
 *
 * Mobile (Minerva): every section accordion starts closed; an open section shows
 * its edit and save icons side by side (both hidden while closed).
 * Saving itself is the parent's job: this only emits `request` with a target.
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconBookmark, cdxIconBookmarkOutline } from '@wikimedia/codex-icons'

import { keyOf, useCollections, type SaveTarget } from './useCollections'
import { globalSkin } from '@/theme'

const props = defineProps<{
  /** Parser root from `ArticleLive`'s `parserReady` — `null` while loading. */
  root: HTMLElement | null
  title: string
  /** Section anchor id to scroll to and flash (from `?section=`). */
  focusSection?: string
  /** Passage text to scroll to and flash (from `?passage=`). */
  focusExcerpt?: string
}>()

const emit = defineEmits<{ request: [target: SaveTarget] }>()

const { isSaved, items } = useCollections()

/** End-matter headings don't get a save button. */
const SKIP_SECTIONS =
  /^(See_also|Notes|References|External_links|Further_reading|Bibliography|Sources|Citations|Works_cited|Footnotes)$/

interface SectionMount {
  id: string
  heading: string
  el: HTMLElement
  imageUrl?: string
  /** Minerva accordion heading: plain icon button beside the edit icon. */
  mobile?: boolean
}

const isMobile = computed(() => globalSkin.value === 'mobile')

const sections = shallowRef<SectionMount[]>([])
const activeParagraph = shallowRef<HTMLElement | null>(null)
const passageMount = shallowRef<HTMLElement | null>(null)
const activeExcerpt = ref('')
const activeHeading = ref<string | undefined>(undefined)

function sectionTarget(s: SectionMount): SaveTarget {
  return {
    kind: 'section',
    title: props.title,
    sectionId: s.id,
    heading: s.heading,
    imageUrl: s.imageUrl,
  }
}

const passageTarget = computed<SaveTarget | null>(() =>
  activeExcerpt.value
    ? {
        kind: 'passage',
        title: props.title,
        excerpt: activeExcerpt.value,
        heading: activeHeading.value,
      }
    : null,
)

const passageSaved = computed(() => !!passageTarget.value && isSaved(keyOf(passageTarget.value)))

// --- Text helpers -------------------------------------------------------------

/** Paragraph text without citation markers or our own injected button. */
function paragraphText(p: HTMLElement): string {
  const clone = p.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll('sup.reference, .mw-ref, style, .pc-passage-save-mount')
    .forEach((n) => n.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Nearest heading above the paragraph (sub-headings included); none in the lead. */
function headingFor(p: HTMLElement): string | undefined {
  let section = p.closest('section')
  while (section) {
    const h = section.querySelector(':scope > h2, :scope > h3, :scope > h4')
    if (h) return (h.textContent ?? '').trim() || undefined
    section = section.parentElement?.closest('section') ?? null
  }
  return undefined
}

/** Scroll `el` into view (a section's heading lands near the top) and highlight it briefly. */
function flash(el: Element, align: 'center' | 'start' = 'center') {
  if (align === 'start') {
    // Honours `scroll-padding-top`, so the heading clears the sticky header.
    el.scrollIntoView({ block: 'start' })
  } else {
    el.scrollIntoView({ block: 'center' })
  }
  el.classList.add('pc-flash')
  setTimeout(() => el.classList.remove('pc-flash'), 2600)
}

// --- Paragraph selection ------------------------------------------------------

/**
 * Paragraphs run underneath floated infoboxes and images, so a background on
 * the <p> itself would paint over them. Wrapping its contents in an inline span
 * highlights only the lines of text, like a highlighter pen.
 */
function wrapText(p: HTMLElement, className: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  while (p.firstChild) span.appendChild(p.firstChild)
  p.appendChild(span)
  return span
}

function unwrapText(span: HTMLElement | null) {
  const parent = span?.parentElement
  if (!span || !parent) return
  while (span.firstChild) parent.insertBefore(span.firstChild, span)
  span.remove()
}

let highlight: HTMLElement | null = null

function clearSelection() {
  activeParagraph.value?.classList.remove('pc-passage--active')
  unwrapText(highlight)
  passageMount.value?.remove()
  highlight = null
  props.root?.classList.remove('pc-selecting')
  activeParagraph.value = null
  passageMount.value = null
  activeExcerpt.value = ''
}

function selectParagraph(p: HTMLElement) {
  clearSelection()
  highlight = wrapText(p, 'pc-passage-hl')
  // Save sits above the end of the first line, i.e. inside the text column
  // even when the paragraph wraps around a float.
  const firstLine = highlight.getClientRects()[0]
  const mount = document.createElement('span')
  mount.className = 'pc-passage-save-mount'
  // Phones have no floats beside the text, so the button sits on the column edge
  // (covering the section icons behind it) rather than at the end of the first line.
  if (firstLine && !isMobile.value) {
    mount.style.right = `${p.getBoundingClientRect().right - firstLine.right}px`
  }
  // Phones: right under a section heading, centre the button on that heading's
  // edit/save icons (a wrapped two-line heading puts them higher than usual).
  if (isMobile.value) {
    const heading = p.closest('.protowiki-mobile-section-body')?.previousElementSibling
    const icons = heading?.querySelector('.protowiki-mobile-h2__edit')
    const pTop = p.getBoundingClientRect().top
    if (heading && icons && pTop - heading.getBoundingClientRect().bottom < 24) {
      const r = icons.getBoundingClientRect()
      mount.style.top = `${r.top + r.height / 2 - 16 - pTop}px`
    }
  }
  p.prepend(mount)
  p.classList.add('pc-passage--active')
  props.root?.classList.add('pc-selecting')
  activeParagraph.value = p
  passageMount.value = mount
  activeExcerpt.value = paragraphText(p)
  activeHeading.value = headingFor(p)
}

function onRootClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  // Links, buttons and footnote markers keep their own behaviour.
  if (target.closest('a, button, sup, .pc-passage-save-mount')) return
  // Selecting text to copy shouldn't select the paragraph.
  if (!window.getSelection()?.isCollapsed) return

  const p = target.closest('p')
  if (!p || !props.root?.contains(p)) return
  if (p.closest('table, figure, .infobox, .mw-references, .reflist, .hatnote')) return
  if (paragraphText(p).length < 40) return

  if (p === activeParagraph.value) clearSelection()
  else selectParagraph(p)
}

function onDocPointerDown(event: PointerEvent) {
  if (!activeParagraph.value) return
  const target = event.target as HTMLElement
  if (activeParagraph.value.contains(target)) return
  // Keep the selection while the save popover / create dialog is in use.
  if (target.closest('.save-popover, .cdx-dialog, .cdx-dialog-backdrop, [data-save-trigger]'))
    return
  clearSelection()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !document.querySelector('.save-popover')) clearSelection()
}

document.addEventListener('pointerdown', onDocPointerDown)
document.addEventListener('keydown', onKeydown)

/**
 * First proper image in a heading's section (thumbnails, galleries), skipping
 * icons and flags by size, and infobox images (those belong to the article).
 */
function sectionImage(heading: HTMLElement): string | undefined {
  const section = heading.closest('section')
  if (!section) return undefined
  const img = [...section.querySelectorAll<HTMLImageElement>('figure img, .gallery img')].find(
    (el) => Number(el.getAttribute('width') ?? el.width) >= 100 && !el.closest('.infobox'),
  )
  const src = img?.getAttribute('src')
  if (!src) return undefined
  // Parsoid thumbnails are protocol-relative (//upload.wikimedia.org/...).
  return src.startsWith('//') ? `https:${src}` : src
}

// --- Injection ------------------------------------------------------------------

/** Open the collapsed Minerva section that contains `el`, if any. */
function openSectionFor(el: Element) {
  const body = el.closest('.protowiki-mobile-section-body--collapsed')
  const heading = body?.previousElementSibling as HTMLElement | null
  if (heading?.classList.contains('protowiki-mobile-h2')) heading.click()
}

/**
 * Minerva articles open with text: lead paragraph, then infobox, then images.
 * ArticleRenderer already moves the infobox below the first paragraph; images
 * placed above the text in the source still sit on top, so move them below the
 * infobox (or below the first paragraph when there's no infobox).
 */
function moveLeadImagesBelowInfobox(root: HTMLElement, attempt = 0) {
  const lead = root.querySelector<HTMLElement>("section[data-mw-section-id='0']")
  if (!lead) return
  const kids = [...lead.children] as HTMLElement[]
  const firstParagraph = kids.find(
    (el) =>
      el.tagName === 'P' &&
      (el.textContent ?? '').trim().length > 0 &&
      !el.classList.contains('mw-empty-elt'),
  )
  if (!firstParagraph) return
  const infobox = kids.find((el) => el.matches('table.infobox'))
  // ArticleRenderer moves the infobox below the first paragraph; wait for that
  // so the two reorders don't fight.
  if (infobox && kids.indexOf(infobox) < kids.indexOf(firstParagraph)) {
    if (attempt < 40) setTimeout(() => moveLeadImagesBelowInfobox(root, attempt + 1), 50)
    return
  }
  const leadingImages = kids
    .slice(0, kids.indexOf(firstParagraph))
    .filter((el) => el.tagName === 'FIGURE')
  let anchor: Element = infobox ?? firstParagraph
  for (const img of leadingImages) {
    anchor.insertAdjacentElement('afterend', img)
    anchor = img
  }
}

/**
 * Minerva: ArticleRenderer rebuilds each h2 into an accordion row (chevron,
 * label, edit) just after render. Wait for that, close every section, and put
 * the save icon after the edit icon.
 */
function injectMobile(root: HTMLElement, attempt = 0) {
  const pending = root.querySelector('section > h2:not(.protowiki-mobile-h2--ready)')
  if (pending && attempt < 40) {
    setTimeout(() => injectMobile(root, attempt + 1), 50)
    return
  }
  moveLeadImagesBelowInfobox(root)
  const found: SectionMount[] = []
  root.querySelectorAll<HTMLElement>('section > h2.protowiki-mobile-h2').forEach((h) => {
    if (h.getAttribute('aria-expanded') === 'true') h.click()
    if (!h.id || SKIP_SECTIONS.test(h.id)) return
    const heading = (h.querySelector('.protowiki-mobile-h2__label')?.textContent ?? '').trim()
    const el = document.createElement('span')
    el.className = 'pc-section-save-mount--mobile'
    const editBtn = h.querySelector('.protowiki-mobile-h2__edit')
    if (editBtn) editBtn.after(el)
    else h.append(el)
    found.push({ id: h.id, heading, el, imageUrl: sectionImage(h), mobile: true })
  })
  sections.value = found
  markSavedPassages()
  focusFromRoute(root)
}

function inject(root: HTMLElement) {
  root.addEventListener('click', onRootClick)
  if (isMobile.value) {
    injectMobile(root)
    return
  }
  const found: SectionMount[] = []
  // Sub-sections (h3/h4) are nested <section>s in Parsoid output — they get one too.
  root.querySelectorAll<HTMLElement>('section > :is(h2, h3, h4)[id]').forEach((h) => {
    if (SKIP_SECTIONS.test(h.id)) return
    const heading = (h.textContent ?? '').trim()
    const el = document.createElement('span')
    el.className = 'pc-section-save-mount'
    h.classList.add('pc-section-heading')
    h.append(el)
    found.push({ id: h.id, heading, el, imageUrl: sectionImage(h) })
  })
  sections.value = found
  markSavedPassages()
  focusFromRoute(root)
}

// --- Saved passages: a faint highlight so readers can find and unsave them ------

/** Opening text of every passage saved from this article, normalized for matching. */
const savedNeedles = computed(() =>
  items.value
    .filter((i) => i.kind === 'passage' && i.title === props.title)
    .map((i) => (i.kind === 'passage' ? normalize(i.excerpt).slice(0, 80) : '')),
)

function markSavedPassages() {
  const root = props.root
  if (!root) return
  root.querySelectorAll<HTMLElement>('.pc-passage-saved').forEach((span) => unwrapText(span))
  if (!savedNeedles.value.length) return
  root.querySelectorAll<HTMLElement>('p').forEach((p) => {
    const text = normalize(paragraphText(p))
    if (!savedNeedles.value.some((needle) => text.startsWith(needle))) return
    const span = wrapText(p, 'pc-passage-saved')
    span.title = 'Saved passage — click to manage'
  })
}

watch(savedNeedles, markSavedPassages)

function focusFromRoute(root: HTMLElement) {
  if (props.focusSection) {
    const h = root.querySelector<HTMLElement>(
      `:is(h2, h3, h4)[id="${CSS.escape(props.focusSection)}"]`,
    )
    if (h) {
      // Mobile: open its accordion first (or the one around a sub-section).
      if (h.classList.contains('protowiki-mobile-h2--collapsed')) h.click()
      else openSectionFor(h)
      flash(h.closest('section') ?? h, 'start')
    }
  } else if (props.focusExcerpt) {
    const needle = normalize(props.focusExcerpt).slice(0, 80)
    const p = [...root.querySelectorAll<HTMLElement>('p')].find((el) =>
      normalize(paragraphText(el)).startsWith(needle),
    )
    // A saved passage already carries its faint highlight — just bring it into view.
    if (p) {
      openSectionFor(p)
      p.scrollIntoView({ block: 'center' })
    }
  }
}

watch(
  () => props.root,
  (root, previous) => {
    previous?.removeEventListener('click', onRootClick)
    clearSelection()
    sections.value = []
    if (root) inject(root)
  },
  { immediate: true },
)

// Switching between desktop and mobile re-renders the article body: re-inject.
watch(isMobile, () => {
  clearSelection()
  sections.value = []
  setTimeout(() => {
    if (props.root) inject(props.root)
  }, 100)
})

// A new article reuses the same root element; drop stale mounts straight away.
watch(
  () => props.title,
  () => {
    clearSelection()
    sections.value = []
  },
)

onBeforeUnmount(() => {
  props.root?.removeEventListener('click', onRootClick)
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
  clearSelection()
})

defineExpose({ clearSelection })
</script>

<template>
  <Teleport v-for="s in sections" :key="s.id" :to="s.el">
    <!-- Mobile: same look and size as the accordion's edit icon. -->
    <button
      v-if="s.mobile"
      type="button"
      class="pc-mobile-section-save"
      data-save-trigger
      :aria-label="
        isSaved(keyOf(sectionTarget(s)))
          ? `Saved section: ${s.heading} — manage`
          : `Save section: ${s.heading}`
      "
      :aria-pressed="isSaved(keyOf(sectionTarget(s)))"
      @click.stop="emit('request', sectionTarget(s))"
    >
      <CdxIcon
        :icon="isSaved(keyOf(sectionTarget(s))) ? cdxIconBookmark : cdxIconBookmarkOutline"
        size="small"
      />
    </button>
    <CdxButton
      v-else
      class="pc-section-save"
      :class="{ 'pc-section-save--saved': isSaved(keyOf(sectionTarget(s))) }"
      weight="quiet"
      size="small"
      data-save-trigger
      :aria-label="
        isSaved(keyOf(sectionTarget(s)))
          ? `Saved section: ${s.heading} — manage`
          : `Save section: ${s.heading}`
      "
      @click.stop="emit('request', sectionTarget(s))"
    >
      <CdxIcon
        :icon="isSaved(keyOf(sectionTarget(s))) ? cdxIconBookmark : cdxIconBookmarkOutline"
        size="small"
      />
    </CdxButton>
  </Teleport>

  <Teleport v-if="passageMount && passageTarget" :to="passageMount">
    <CdxButton
      class="pc-passage-save"
      :class="{ 'pc-passage-save--labelled': isMobile }"
      :size="isMobile ? 'medium' : 'small'"
      data-save-trigger
      :aria-label="passageSaved ? 'Saved passage — manage' : 'Save passage'"
      :aria-pressed="passageSaved"
      @click.stop="emit('request', passageTarget)"
    >
      <CdxIcon :icon="passageSaved ? cdxIconBookmark : cdxIconBookmarkOutline" size="small" />
      <!-- Phones: a bigger labelled button that simply covers anything behind it. -->
      <template v-if="isMobile">{{ passageSaved ? 'Saved' : 'Save' }}</template>
    </CdxButton>
  </Teleport>
</template>

<style>
/*
 * Unscoped on purpose: these classes land on parser-rendered article markup.
 * Everything is prefixed `pc-` to stay out of the way of skin styles.
 */

/* Section headings: bookmark at the far end of the heading row, on hover. */
/* Specific enough to beat the skin's own h3/h4 `display: flow-root`. */
.pc-article section > :is(h2, h3, h4).pc-section-heading {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-50, 8px);
}

.pc-article .pc-section-save-mount {
  margin-inline-start: auto;
  align-self: center;
}

.pc-section-save.cdx-button {
  color: var(--color-base, #202122);
  opacity: 0;
  transition: opacity var(--transition-duration-base, 100ms);
}

/* Hovering anywhere in a section shows its bookmark (innermost section only). */
.pc-article section:hover:not(:has(section:hover)) > .pc-section-heading .pc-section-save,
.pc-section-save:focus-visible,
.pc-section-save--saved.cdx-button {
  opacity: 1;
}

/* Desktop: a selected paragraph's Save button is the only save control on screen. */
/* `!important` so it also beats the (more specific) section-hover and saved rules. */
.pc-selecting .pc-section-save.cdx-button {
  opacity: 0 !important;
  pointer-events: none;
}

/* Paragraphs: clickable, highlighted when selected, Save button above top-right. */
.pc-article section p {
  cursor: pointer;
}

.pc-passage--active {
  position: relative;
}

/* Saved passages: a much fainter tint than the blue selection highlight. */
.pc-passage-saved {
  padding-block: 3px;
  background-color: color-mix(
    in srgb,
    var(--background-color-progressive-subtle, #eaf3ff) 60%,
    transparent
  );
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.pc-passage-hl {
  padding-block: 3px;
  background-color: var(--background-color-progressive-subtle, #eaf3ff);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

/* `right` is set inline to the end of the paragraph's first line. */
.pc-passage-save-mount {
  position: absolute;
  top: -40px;
  right: 0;
  z-index: 5;
}

/* Phones: labelled "Save"/"Saved" button, a little higher to fit its height. */
.pc-passage-save-mount:has(.pc-passage-save--labelled) {
  top: -46px;
}

.pc-passage-save--labelled.cdx-button {
  gap: var(--spacing-50, 8px);
  font-weight: var(--font-weight-bold, 700);
}

.pc-passage-save.cdx-button {
  gap: var(--spacing-25, 4px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-small, 0 1px 2px rgba(0, 0, 0, 0.1));
}

/* Arriving from the Saved page: briefly highlight the section or passage. */
.pc-flash {
  animation: pc-flash 2.6s ease-out;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

@keyframes pc-flash {
  0%,
  40% {
    background-color: var(--background-color-warning-subtle, #fdf2d5);
    box-shadow: 0 0 0 6px var(--background-color-warning-subtle, #fdf2d5);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 6px transparent;
  }
}

/* ---- Mobile (Minerva) accordion headings ---- */

/* Closed sections show neither edit nor save (specific enough to beat the skin's edit rule). */
.pc-article
  .article[data-skin='mobile']
  .mw-parser-output
  .protowiki-mobile-h2--collapsed
  .protowiki-mobile-h2__edit,
.pc-article .protowiki-mobile-h2--collapsed .pc-section-save-mount--mobile {
  display: none;
}

/* Edit and save side by side, same size: 32px targets around 16px icons. */
.pc-article .article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__edit {
  width: 32px;
  height: 32px;
  margin-inline-start: 0;
}

.pc-article .article[data-skin='mobile'] .mw-parser-output .protowiki-mobile-h2__edit svg {
  width: 16px;
  height: 16px;
}

.pc-section-save-mount--mobile {
  display: inline-flex;
  flex-shrink: 0;
}

.pc-mobile-section-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base, 2px);
  background: transparent;
  color: var(--color-base, #202122);
  opacity: 0.7;
  cursor: pointer;
}

.pc-mobile-section-save .cdx-icon {
  color: inherit;
}

.pc-mobile-section-save[aria-pressed='true'] {
  opacity: 1;
}
</style>
