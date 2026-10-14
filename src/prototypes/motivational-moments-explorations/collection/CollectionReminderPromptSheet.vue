<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxCheckbox, CdxIcon, CdxRadio } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'
import type {
  CollectionReminderPreferences,
  ReminderDelivery,
} from './mme-collection-reminder-pref'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  complete: [prefs: CollectionReminderPreferences]
}>()

const remindUnworkedSummary = ref(true)
const remindArticleChanges = ref(true)
const delivery = ref<ReminderDelivery>('notifications')
const ignoreBackdropClick = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) {
    ignoreBackdropClick.value = false
    return
  }
  remindUnworkedSummary.value = true
  remindArticleChanges.value = true
  delivery.value = 'notifications'
  ignoreBackdropClick.value = true
  window.setTimeout(() => {
    ignoreBackdropClick.value = false
  }, 450)
})

function onBackdropClick() {
  if (ignoreBackdropClick.value) return
  notNow()
}

const canSave = computed(
  () => remindUnworkedSummary.value || remindArticleChanges.value,
)

function close() {
  open.value = false
}

function notNow() {
  emit('complete', {
    enabled: false,
    remindUnworkedSummary: false,
    remindArticleChanges: false,
    delivery: delivery.value,
  })
  close()
}

function save() {
  if (!canSave.value) return
  emit('complete', {
    enabled: true,
    remindUnworkedSummary: remindUnworkedSummary.value,
    remindArticleChanges: remindArticleChanges.value,
    delivery: delivery.value,
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mme-reminder-sheet">
      <div
        v-if="open"
        class="mme-reminder-sheet__backdrop"
        @click.self="onBackdropClick"
      >
      <div
        class="mme-reminder-sheet"
        role="dialog"
        aria-labelledby="mme-reminder-sheet-title"
      >
        <div class="mme-reminder-sheet__header">
          <h2 id="mme-reminder-sheet-title" class="mme-reminder-sheet__title">
            Want a reminder about this list?
          </h2>
          <CdxButton
            weight="quiet"
            :icon-only="true"
            aria-label="Close"
            @click="notNow"
          >
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </div>

        <fieldset class="mme-reminder-sheet__group">
          <legend class="mme-reminder-sheet__legend">What should we remind you about?</legend>

          <div class="mme-reminder-sheet__option">
            <CdxCheckbox v-model="remindUnworkedSummary">
              A summary of articles that are still yet to be worked on
            </CdxCheckbox>
          </div>
          <div class="mme-reminder-sheet__option">
            <CdxCheckbox v-model="remindArticleChanges">
              When an article changes (for example quality or edit suggestions)
            </CdxCheckbox>
          </div>
        </fieldset>

        <fieldset class="mme-reminder-sheet__group">
          <legend class="mme-reminder-sheet__legend">Send it to</legend>

          <div class="mme-reminder-sheet__option">
            <CdxRadio v-model="delivery" input-value="notifications">
              Notifications
            </CdxRadio>
          </div>
          <div class="mme-reminder-sheet__option">
            <CdxRadio v-model="delivery" input-value="email">
              Email
            </CdxRadio>
          </div>
          <div class="mme-reminder-sheet__option">
            <CdxRadio v-model="delivery" input-value="both">
              Both
            </CdxRadio>
          </div>
        </fieldset>

        <CdxButton
          class="mme-reminder-sheet__save"
          weight="primary"
          action="progressive"
          :disabled="!canSave"
          @click="save"
        >
          Save reminders
        </CdxButton>
        <CdxButton
          class="mme-reminder-sheet__dismiss"
          weight="quiet"
          @click="notNow"
        >
          Not now
        </CdxButton>
      </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mme-reminder-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 510;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
}

.mme-reminder-sheet {
  box-sizing: border-box;
  width: 100%;
  max-width: 32rem;
  max-height: min(90vh, 36rem);
  padding: var(--spacing-100) var(--spacing-100) var(--spacing-150);
  overflow: auto;
  border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
  background-color: var(--background-color-base);
}

.mme-reminder-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-75);
  margin-bottom: var(--spacing-50);
}

.mme-reminder-sheet__title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.mme-reminder-sheet__group {
  margin: 0 0 var(--spacing-100);
  padding: 0;
  border: none;
}

.mme-reminder-sheet__legend {
  margin: 0 0 var(--spacing-75);
  padding: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-reminder-sheet__option + .mme-reminder-sheet__option {
  margin-top: var(--spacing-75);
}

.mme-reminder-sheet__save {
  width: 100%;
  margin-bottom: var(--spacing-50);
}

.mme-reminder-sheet__dismiss {
  width: 100%;
}

.mme-reminder-sheet-enter-active,
.mme-reminder-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.mme-reminder-sheet-enter-active .mme-reminder-sheet,
.mme-reminder-sheet-leave-active .mme-reminder-sheet {
  transition: transform 0.25s ease;
}

.mme-reminder-sheet-enter-from,
.mme-reminder-sheet-leave-to {
  opacity: 0;
}

.mme-reminder-sheet-enter-from .mme-reminder-sheet,
.mme-reminder-sheet-leave-to .mme-reminder-sheet {
  transform: translateY(100%);
}
</style>
