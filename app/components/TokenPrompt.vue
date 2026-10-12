<script setup lang="ts">
import { normalizeToken } from '~/utils/token';

const session = useSession();
const token = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

const open = computed(() => session.state.status === 'expired' || busy.value);

const submit = async () => {
  error.value = null;
  if (normalizeToken(token.value) === null) {
    error.value = 'This is not a quarksUp token.';
    return;
  }
  busy.value = true;
  const result = await session.connect(session.state.tenant, token.value);
  busy.value = false;
  if (result.ok) {
    token.value = '';
    return;
  }
  error.value =
    result.reason === 'unavailable'
      ? 'quarksUp did not answer. Try again.'
      : 'Token rejected. Paste a fresh one.';
  token.value = '';
};
</script>

<template>
  <div v-if="open" class="scrim" data-testid="token-prompt">
    <form class="card" @submit.prevent="submit">
      <h2 class="title">Token expired</h2>
      <p class="body">
        Paste a fresh token from the <code>authorization</code> header. Your
        selection and the current year stay as they are.
      </p>
      <label class="field">
        <span class="label">Token</span>
        <textarea
          id="prompt-token"
          v-model="token"
          rows="4"
          spellcheck="false"
          required
        ></textarea>
      </label>
      <p v-if="error" class="error body" role="alert">{{ error }}</p>
      <button type="submit" class="primary label" :disabled="busy">
        Connect
      </button>
    </form>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--scrim);
  z-index: 10;
}

.card {
  width: min(480px, calc(100% - 32px));
  display: grid;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-pop);
}

h2,
p {
  margin: 0;
}

.field {
  display: grid;
  gap: var(--space-1);
}

textarea {
  font: inherit;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--hairline-2);
  border-radius: var(--radius-btn);
  background: var(--surface-sunk);
  color: var(--ink);
}

textarea:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.error {
  color: var(--error);
}

.primary {
  justify-self: start;
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-btn);
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
}
</style>
