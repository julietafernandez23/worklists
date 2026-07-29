<script setup lang="ts">
definePage({
  meta: {
    title: 'ProtoWiki',
    description: 'Prototype index',
  },
})

import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import UserSettingsPopover from '@/components/settings/UserSettingsPopover.vue'

const router = useRouter()

interface PrototypeMeta {
  title?: string
  description?: string
  /** Optional gallery section override (worklists, events, templates, examples, other). */
  group?: string
}

interface PrototypeEntry {
  path: string
  title: string
  description?: string
  bucket: 'regular' | 'template' | 'example'
  group: GalleryGroup
}

type GalleryGroup = 'worklists' | 'events' | 'other' | 'templates' | 'examples'

interface GallerySection {
  id: GalleryGroup
  label: string
  description?: string
  entries: PrototypeEntry[]
}

const SECTIONS: { id: GalleryGroup; label: string; description?: string }[] = [
  {
    id: 'worklists',
    label: 'Worklists',
    description:
      'Worklists let event organizers and participants build a shared list of Wikipedia pages to work on during an event.',
  },
  { id: 'events', label: 'Events' },
  { id: 'other', label: 'Other prototypes' },
  { id: 'templates', label: 'Templates' },
  { id: 'examples', label: 'Examples' },
]

/** Nested under “Worklist views” on the gallery. */
const WORKLIST_VIEWS_PATHS = new Set([
  '/configurator',
  '/worklist-cards-v2',
  '/worklist-cards-v3',
  '/worklist-cards-v4',
])

const WORKLIST_VIEWS_CLUSTER = {
  label: 'Worklist views',
  description: 'Playground of different layouts for browsing and working with worklists',
}

/** Preferred order within the worklists section. */
const WORKLIST_ORDER = [
  '/worklist-event',
  '/configurator',
  '/worklist-cards-v2',
  '/worklist-cards-v3',
  '/worklist-cards-v4',
]

function humanize(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Top-level prototype only (src/prototypes/name/index.vue), not nested subfolder indexes. */
function isTopLevelPrototypePath(path: string): boolean {
  const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
  return segments.length === 1
}

/** Bucket from `definePage` title — `Template:` / `Example:` prefixes (case-insensitive). */
function prototypeBucket(title: string): 'regular' | 'template' | 'example' {
  const t = title.trim()
  if (/^template\s*:/i.test(t)) return 'template'
  if (/^example\s*:/i.test(t)) return 'example'
  return 'regular'
}

function resolveGroup(
  entry: Pick<PrototypeEntry, 'path' | 'title' | 'bucket'>,
  metaGroup?: string,
): GalleryGroup {
  const normalized = metaGroup?.trim().toLowerCase()
  if (normalized === 'worklists') return 'worklists'
  if (normalized === 'events') return 'events'
  if (normalized === 'templates') return 'templates'
  if (normalized === 'examples') return 'examples'
  if (normalized === 'other') return 'other'

  const key = `${entry.path} ${entry.title}`.toLowerCase()
  if (/worklist|configurator/.test(key)) return 'worklists'
  if (/event/.test(key)) return 'events'

  if (entry.bucket === 'template') return 'templates'
  if (entry.bucket === 'example') return 'examples'
  return 'other'
}

function sortEntries(a: PrototypeEntry, b: PrototypeEntry): number {
  if (a.group === 'worklists' && b.group === 'worklists') {
    const ia = WORKLIST_ORDER.indexOf(a.path)
    const ib = WORKLIST_ORDER.indexOf(b.path)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
  }
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

const prototypes = computed<PrototypeEntry[]>(() => {
  return router
    .getRoutes()
    .filter((route) => route.path !== '/' && route.path !== '/:catchAll(.*)')
    .filter((route) => isTopLevelPrototypePath(route.path))
    .map((route) => {
      const meta = (route.meta ?? {}) as PrototypeMeta
      const description =
        typeof meta.description === 'string' && meta.description.length > 0
          ? meta.description
          : undefined
      const title = meta.title ?? humanize(route.path)
      const bucket = prototypeBucket(title)
      const entry: PrototypeEntry = {
        path: route.path,
        title,
        description,
        bucket,
        group: resolveGroup({ path: route.path, title, bucket }, meta.group),
      }
      return entry
    })
    .sort(sortEntries)
})

const gallerySections = computed<GallerySection[]>(() => {
  const byGroup = new Map<GalleryGroup, PrototypeEntry[]>()
  for (const section of SECTIONS) {
    byGroup.set(section.id, [])
  }
  for (const entry of prototypes.value) {
    byGroup.get(entry.group)?.push(entry)
  }
  return SECTIONS
    .map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      entries: byGroup.get(section.id) ?? [],
    }))
    .filter((section) => section.entries.length > 0)
})

function orderByPath(paths: string[], entries: PrototypeEntry[]): PrototypeEntry[] {
  return [...entries].sort((a, b) => {
    const ia = paths.indexOf(a.path)
    const ib = paths.indexOf(b.path)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })
}

const worklistSection = computed(() => gallerySections.value.find((section) => section.id === 'worklists'))

const worklistStandaloneEntries = computed(() => {
  const entries = worklistSection.value?.entries.filter((entry) => !WORKLIST_VIEWS_PATHS.has(entry.path)) ?? []
  return orderByPath(WORKLIST_ORDER, entries)
})

const worklistViewsEntries = computed(() => {
  const entries = worklistSection.value?.entries.filter((entry) => WORKLIST_VIEWS_PATHS.has(entry.path)) ?? []
  return orderByPath(WORKLIST_ORDER, entries)
})

function prototypeHref(path: string): string {
  return router.resolve({ path }).href
}

</script>

<template>
  <!--  -->
  <PlainWrapper heading="ProtoWiki">
    <template #actions>
      <UserSettingsPopover v-slot="{ toggle, open }">
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Settings"
          :aria-expanded="open"
          @click="toggle"
        >
          <CdxIcon :icon="cdxIconConfigure" />
        </CdxButton>
      </UserSettingsPopover>
    </template>
    <div class="prototype-index">
      <section
        v-for="section in gallerySections"
        :key="section.id"
        class="prototype-index__section"
      >
        <h2 class="prototype-index__section-heading">{{ section.label }}</h2>
        <p v-if="section.description" class="prototype-index__section-description">
          {{ section.description }}
        </p>

        <div v-if="section.id === 'worklists'" class="prototype-index__list">
          <div
            v-for="entry in worklistStandaloneEntries"
            :key="entry.path"
            class="prototype-index__card"
          >
            <CdxCard :url="prototypeHref(entry.path)">
              <template #title>{{ entry.title }}</template>
              <template v-if="entry.description" #description>{{ entry.description }}</template>
            </CdxCard>
          </div>

          <div v-if="worklistViewsEntries.length" class="prototype-cluster">
            <div class="prototype-cluster__header cdx-card__text">
              <div class="cdx-card__text__title">{{ WORKLIST_VIEWS_CLUSTER.label }}</div>
              <div class="cdx-card__text__description">{{ WORKLIST_VIEWS_CLUSTER.description }}</div>
            </div>

            <div class="prototype-cluster__items">
              <div
                v-for="entry in worklistViewsEntries"
                :key="entry.path"
                class="prototype-cluster__card"
              >
                <CdxCard :url="prototypeHref(entry.path)">
                  <template #title>{{ entry.title }}</template>
                  <template v-if="entry.description" #description>{{ entry.description }}</template>
                </CdxCard>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="prototype-index__list">
          <div v-for="entry in section.entries" :key="entry.path" class="prototype-index__card">
            <CdxCard :url="prototypeHref(entry.path)">
              <template #title>{{ entry.title }}</template>
              <template v-if="entry.description" #description>{{ entry.description }}</template>
            </CdxCard>
          </div>
        </div>
      </section>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.prototype-index__section + .prototype-index__section {
  margin-top: var(--spacing-200);
}

.prototype-index__section-heading {
  margin: 0 0 var(--spacing-50);
}

.prototype-index__section-description {
  margin: 0 0 var(--spacing-100);
  color: var(--color-subtle);
}

.prototype-index__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.prototype-index__card {
  min-width: 0;
}

.prototype-cluster {
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  padding: var(--spacing-100);
}

.prototype-cluster__header {
  margin-bottom: var(--spacing-100);
}

.prototype-cluster__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.prototype-cluster__card {
  min-width: 0;
}
</style>
