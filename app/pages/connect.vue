<script setup lang="ts">
import { normalizeToken } from '~/utils/token';

definePageMeta({ layout: false });

const session = useSession();
const tenant = ref(session.state.tenant);
const token = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

const MESSAGES = {
  malformed:
    'This is not a quarksUp token. Paste the value of the authorization header.',
  rejected: 'Token rejected. Paste a fresh one from the authorization header.',
  unavailable: 'quarksUp did not answer. Try again in a moment.',
} as const;

const submit = async () => {
  error.value = null;
  if (normalizeToken(token.value) === null) {
    error.value = MESSAGES.malformed;
    return;
  }
  busy.value = true;
  const result = await session.connect(tenant.value.trim(), token.value);
  busy.value = false;
  if (result.ok) {
    await navigateTo('/');
    return;
  }
  error.value = MESSAGES[result.reason];
  if (result.reason !== 'unavailable') token.value = '';
};
</script>

<template>
  <main class="connect">
    <form class="card" @submit.prevent="submit">
      <h1 class="title">Connect</h1>
      <p class="body">
        quarksCharm paints your absences on a year grid. It talks to quarksUp
        with your own token and keeps it only in this browser.
      </p>
      <label class="field">
        <span class="label">Tenant</span>
        <input
          id="tenant"
          v-model="tenant"
          name="tenant"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="the part before .quarksup.net"
          required
        />
      </label>
      <label class="field">
        <span class="label">Token</span>
        <textarea
          id="token"
          v-model="token"
          name="token"
          rows="5"
          spellcheck="false"
          placeholder="eyJ…"
          required
        ></textarea>
      </label>
      <p class="caption">
        Open quarksUp, press F12, open the Network tab and pick any request to
        api.quarksup.net. Copy the value of its <code>authorization</code>
        header. The token lives one hour; paste a new one when it expires.
      </p>
      <p v-if="error" class="error body" role="alert">{{ error }}</p>
      <button type="submit" class="primary label" :disabled="busy">
        Connect
      </button>
    </form>
  </main>
</template>

<style scoped>
.connect {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-6);
}

.card {
  width: min(520px, 100%);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

h1 {
  margin: 0;
}

p {
  margin: 0;
}

.field {
  display: grid;
  gap: var(--space-1);
}

input,
textarea {
  font: inherit;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--hairline-2);
  border-radius: var(--radius-btn);
  background: var(--surface-sunk);
  color: var(--ink);
  resize: vertical;
}

input:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.caption {
  color: var(--ink-2);
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

.primary:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
