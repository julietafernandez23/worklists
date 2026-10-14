<script setup lang="ts">
import { ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxRadio } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

export type CollectionTaskStatus = 'not-started' | 'working-on-it' | 'done'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  articleTitle: string
  status: CollectionTaskStatus
}>()

const emit = defineEmits<{
  save: [status: CollectionTaskStatus]
}>()

const draftStatus = ref<CollectionTaskStatus>(props.status)

watch(
  () => [open.value, props.status] as const,
  ([isOpen, status]) => {
    if (isOpen) draftStatus.value = status
  },
)

function close() {
  open.value = false
}

function save() {
  emit('save', draftStatus.value)
  close()
}
</script>

<template>
  <Transition name="mme-status-sheet">
    <div
      v-if="open"
      class="mme-status-sheet__backdrop"
      @click.self="close"
    >
      <div
        class="mme-status-sheet"
        role="dialog"
        aria-labelledby="mme-status-sheet-title"
      >
        <div class="mme-status-sheet__header">
          <h2 id="mme-status-sheet-title" class="mme-status-sheet__title">
            Set status
          </h2>
          <CdxButton
            weight="quiet"
            :icon-only="true"
            aria-label="Close"
            @click="close"
          >
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </div>

        <p class="mme-status-sheet__subtitle">{{ props.articleTitle }}</p>

        <fieldset class="mme-status-sheet__options">
          <legend class="mme-status-sheet__legend">Task status</legend>

          <div class="mme-status-sheet__option">
            <CdxRadio v-model="draftStatus" input-value="not-started">
              Not started
            </CdxRadio>
          </div>
          <div class="mme-status-sheet__option">
            <CdxRadio v-model="draftStatus" input-value="working-on-it">
              Working on it
            </CdxRadio>
          </div>
          <div class="mme-status-sheet__option">
            <CdxRadio v-model="draftStatus" input-value="done">
              Done
            </CdxRadio>
          </div>
        </fieldset>

        <CdxButton
          class="mme-status-sheet__save"
          weight="primary"
          action="progressive"
          @click="save"
        >
          Save
        </CdxButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mme-status-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
}

.mme-status-sheet {
  box-sizing: border-box;
  width: 100%;
  max-width: 32rem;
  max-height: min(85vh, 28rem);
  padding: var(--spacing-100) var(--spacing-100) var(--spacing-150);
  overflow: auto;
  border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
  background-color: var(--background-color-base);
}

.mme-status-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-75);
  margin-bottom: var(--spacing-50);
}

.mme-status-sheet__title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.mme-status-sheet__subtitle {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.mme-status-sheet__options {
  margin: 0 0 var(--spacing-125);
  padding: 0;
  border: none;
}

.mme-status-sheet__legend {
  margin: 0 0 var(--spacing-75);
  padding: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-status-sheet__option + .mme-status-sheet__option {
  margin-top: var(--spacing-75);
}

.mme-status-sheet__save {
  width: 100%;
}

.mme-status-sheet-enter-active,
.mme-status-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.mme-status-sheet-enter-active .mme-status-sheet,
.mme-status-sheet-leave-active .mme-status-sheet {
  transition: transform 0.25s ease;
}

.mme-status-sheet-enter-from,
.mme-status-sheet-leave-to {
  opacity: 0;
}

.mme-status-sheet-enter-from .mme-status-sheet,
.mme-status-sheet-leave-to .mme-status-sheet {
  transform: translateY(100%);
}
</style>
