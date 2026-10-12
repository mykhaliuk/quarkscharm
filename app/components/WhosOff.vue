<script setup lang="ts">
import { formatDay } from '~/utils/format';

const whosOff = useWhosOff();
const cursor = useCursor();

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2);
</script>

<template>
  <aside class="column" data-testid="whos-off">
    <h2 class="title">
      Who is off
      <button type="button" class="btn label" @click="cursor.today">
        Today
      </button>
    </h2>
    <div class="day caption" data-testid="focus-date">
      {{ formatDay(whosOff.focusDate.value) }}
    </div>
    <p v-if="whosOff.status.value === 'failed'" class="caption note">
      The service planner did not load.
      <button type="button" class="btn label" @click="whosOff.load">
        Retry
      </button>
    </p>
    <p v-else-if="whosOff.status.value === 'loading'" class="caption muted">
      Loading…
    </p>
    <p v-else-if="whosOff.focused.value.length === 0" class="caption muted">
      Everyone is in
    </p>
    <div
      v-for="person in whosOff.focused.value"
      :key="person.employeeId"
      class="person"
      data-testid="person"
    >
      <img
        v-if="person.avatarUrl"
        class="avatar"
        :src="person.avatarUrl"
        :alt="person.name"
      />
      <span v-else class="avatar initials">{{ initials(person.name) }}</span>
      <div class="meta">
        <b>{{ person.name }}</b>
        <span class="caption">{{
          [person.entity, person.job].filter(Boolean).join(' · ')
        }}</span>
      </div>
      <span
        v-if="!(person.am && person.pm)"
        class="mark caption"
        data-testid="mark"
      >
        {{ person.am ? 'am' : 'pm' }}
      </span>
    </div>
  </aside>
</template>

<style scoped>
.column {
  display: grid;
  gap: var(--space-2);
  align-content: start;
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

h2 {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day,
.muted {
  color: var(--ink-2);
  margin: 0;
}

.note {
  margin: 0;
  padding: 4px var(--space-2);
  border-radius: 6px;
  background: var(--warn-soft);
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 0;
  border-top: 1px solid var(--hairline);
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-pill);
  object-fit: cover;
}

.initials {
  display: grid;
  place-items: center;
  font-size: 11px;
  background: var(--surface-sunk);
  color: var(--ink-2);
}

.meta {
  display: flex;
  flex-direction: column;
}

.meta .caption {
  color: var(--ink-2);
}

.mark {
  margin-left: auto;
  border: 1px solid var(--hairline-2);
  border-radius: var(--radius-pill);
  padding: 1px 6px;
  color: var(--ink-2);
}

.btn {
  padding: 2px var(--space-2);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
</style>
