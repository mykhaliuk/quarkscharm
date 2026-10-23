<script setup lang="ts">
import { isTenant } from '~/utils/tenant';
import { normalizeToken } from '~/utils/token';

definePageMeta({ layout: false });

const session = useSession();
const tenant = ref(session.state.tenant);
const token = ref('');
const error = ref<string | null>(null);
const busy = ref(false);
const askingBridge = ref(false);

const MESSAGES = {
  noTenant: 'Enter the tenant first.',
  badTenant:
    'Enter the tenant as the part before .quarksup.net: lowercase letters, digits and hyphens.',
  malformed:
    'This is not a quarksUp token. Paste the value of the authorization header.',
  rejected: 'Token rejected. Paste a fresh one from the authorization header.',
  unavailable: 'quarksUp did not answer. Try again in a moment.',
  absent:
    'Paste a token. The token bridge extension is not installed in this browser.',
  login:
    'quarksUp asks you to sign in. Finish the login in the quarksUp tab, then press Connect.',
  timeout:
    'The extension got no token in time. Press Connect again or paste a token.',
  failed: 'The extension did not give a token. Paste a token.',
} as const;

const connectWithBridge = async (silentWhenAbsent: boolean) => {
  error.value = null;
  busy.value = true;
  askingBridge.value = true;
  const result = await session.connectWithBridge(tenant.value.trim());
  askingBridge.value = false;
  busy.value = false;
  if (result.ok) {
    await navigateTo('/');
    return;
  }
  if (silentWhenAbsent && result.reason === 'absent') return;
  error.value = MESSAGES[result.reason];
};

onMounted(() => {
  if (tenant.value.trim() !== '') void connectWithBridge(true);
});

const submit = async () => {
  error.value = null;
  const typedTenant = tenant.value.trim();
  if (!isTenant(typedTenant)) {
    error.value = typedTenant === '' ? MESSAGES.noTenant : MESSAGES.badTenant;
    return;
  }
  if (token.value.trim() === '') {
    await connectWithBridge(false);
    return;
  }
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
    <form class="card" novalidate @submit.prevent="submit">
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
        ></textarea>
      </label>
      <p class="caption">
        With the quarksCharm token bridge extension, leave the token empty and
        press Connect. Without it: open quarksUp, press F12, open the Network
        tab and pick any request to api.quarksup.net. Copy the value of its
        <code>authorization</code> header. The token lives one hour; paste a new
        one when it expires.
      </p>
      <p
        v-if="askingBridge"
        class="caption"
        role="status"
        data-testid="bridge-status"
      >
        Getting the token from the extension…
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
