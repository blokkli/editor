<template>
  <Teleport v-if="showDialog" to="body">
    <transition appear name="bk-slide-up">
      <DialogModal
        :title="$t('systemRequirementsDialogTitle', 'System Requirements')"
        :width="700"
        :submit-label="$t('systemRequirementsDialogButton', 'Continue anyway')"
        :lead="
          $t(
            'systemRequirementsDialogLead',
            'blökkli has detected that your browser does not meet one or more system requirements. For the best experience, please use a browser that supports all the listed requirements.',
          )
        "
        icon="sad"
        @submit="dismiss"
        @cancel="dismiss"
      >
        <ul class="bk-system-requirements">
          <li
            v-for="requirement in requirements"
            :key="requirement.id"
            :class="{
              'bk-is-success': requirement.supported === true,
              'bk-is-error': requirement.supported === false,
              'bk-is-warning': requirement.supported === null,
            }"
          >
            <div>
              <h3>
                <span>{{ requirement.title }}</span>
                <div class="bk-system-requirements-icon">
                  <Icon :name="requirement.supported ? 'check' : 'close'" />
                </div>
              </h3>
              <p>{{ requirement.description }}</p>
            </div>
          </li>
        </ul>

        <p>
          {{
            $t(
              'systemRequirementsDialogText',
              'blökkli has been tested and optimized for the latest versions of Chrome, Firefox, Edge, and Safari. Features like WebGL are well supported, but they may sometimes be disabled for performance or security reasons.',
            )
          }}
        </p>
      </DialogModal>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import { DialogModal, Icon } from '#blokkli/components'

const { $t, storage, animation } = useBlokkli()

const hasDismissed = storage.use('system_requirements_dismissed', false)

type SystemRequirement = {
  id: string
  title: string
  description: string
  supported: boolean | null
}

const requirements = computed<SystemRequirement[]>(() => {
  return [
    {
      id: 'webgl',
      title: 'WebGL',
      description: $t(
        'systemRequirementsWebglText',
        'blökkli uses WebGL for fast rendering of UI elements such as selected blocks and drag-and-drop indicators. If WebGL is not supported, Blökkli will resort to fallback rendering, which is slower and lacks full feature support.',
      ),
      supported: animation.webglSupported.value,
    },
  ]
})

const showDialog = computed(
  () =>
    !hasDismissed.value &&
    requirements.value.some((v) => v.supported === false),
)

function dismiss() {
  hasDismissed.value = true
}
</script>
