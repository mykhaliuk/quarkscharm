<script setup lang="ts">
import { formatTime } from '~/utils/format';

const session = useSession();
const { year, previous, next } = useYear();

const me = computed(() => session.state.me);
const fullName = computed(() =>
  me.value ? `${me.value.firstName} ${me.value.lastName}` : '',
);
const initials = computed(() =>
  me.value ? `${me.value.firstName[0] ?? ''}${me.value.lastName[0] ?? ''}` : '',
);
const until = computed(() =>
  session.state.expiresAt === null
    ? ''
    : formatTime(session.state.expiresAt, me.value?.timeZone ?? 'Europe/Paris'),
);

const forget = () => {
  session.forget();
  window.location.assign('/connect');
};
</script>

<template>
  <header class="header">
    <img
      v-if="me?.pictureUrl"
      class="avatar"
      :src="me.pictureUrl"
      :alt="fullName"
    />
    <span v-else class="avatar initials label">{{ initials }}</span>
    <span class="name" data-testid="user-name">{{ fullName }}</span>
    <div class="year">
      <button
        type="button"
        class="iconbtn"
        aria-label="Previous year"
        @click="previous"
      >
        ‹
      </button>
      <span class="display" data-testid="year">{{ year }}</span>
      <button
        type="button"
        class="iconbtn"
        aria-label="Next year"
        @click="next"
      >
        ›
      </button>
    </div>
    <div class="counters"><Counters /></div>
    <div class="token caption">
      <span data-testid="token-until">token until {{ until }}</span>
      <button type="button" class="link" @click="forget">Forget token</button>
    </div>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  object-fit: cover;
}

.initials {
  display: grid;
  place-items: center;
  background: var(--surface-sunk);
  color: var(--ink-2);
}

.name {
  font-weight: 600;
}

.year {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-4);
}

.year .display {
  min-width: 76px;
  text-align: center;
}

.iconbtn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  font-size: 18px;
}

.iconbtn:focus-visible,
.link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.counters {
  display: flex;
  gap: var(--space-3);
  margin-left: auto;
}

.token {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--ink-2);
}

.link {
  border: 0;
  padding: 0;
  background: none;
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}
</style>
