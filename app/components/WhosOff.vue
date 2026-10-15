<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { formatDay } from '~/utils/format';
import { today } from '~~/shared/utils/ymd';

const whosOff = useWhosOff();
const cursor = useCursor();
const natures = useNatures();
const session = useSession();

const isToday = computed(
  () =>
    whosOff.focusDate.value ===
    today(session.state.me?.timeZone ?? 'Europe/Paris'),
);
const sections = computed(() => {
  const suffix = isToday.value ? ' today' : '';
  return [
    {
      key: 'remote',
      title: `On remote${suffix}`,
      people: whosOff.remote.value,
      showsNature: false,
    },
    {
      key: 'away',
      title: `Off${suffix}`,
      people: whosOff.away.value,
      showsNature: true,
    },
  ];
});

const column = ref<HTMLElement | null>(null);
const columnTop = ref(0);
const measure = () => {
  if (column.value === null) return;
  columnTop.value = column.value.getBoundingClientRect().top + window.scrollY;
};
let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(measure);
  observer.observe(document.body);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2);
</script>

<template>
  <aside
    ref="column"
    class="column"
    :style="`--column-top: ${columnTop}px`"
    data-testid="whos-off"
  >
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
    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="section"
        :data-testid="`whos-off-${section.key}`"
      >
        <h3 class="label section-title">
          {{ section.title }}
          <span class="caption count">{{ section.people.length }}</span>
        </h3>
        <div class="list">
          <p v-if="section.people.length === 0" class="caption muted">Nobody</p>
          <div
            v-for="person in section.people"
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
            <span v-else class="avatar initials">{{
              initials(person.name)
            }}</span>
            <div class="meta">
              <b>{{ person.name }}</b>
              <span class="caption">{{
                [person.entity, person.job].filter(Boolean).join(' · ')
              }}</span>
              <span
                v-if="section.showsNature"
                class="nature caption"
                data-testid="nature"
              >
                <span
                  class="sw"
                  :style="`background: var(${natures.colorToken(person.natureId)})`"
                ></span>
                {{ natures.label(person.natureId) }}
              </span>
            </div>
            <span
              v-if="!(person.am && person.pm)"
              class="mark caption"
              data-testid="mark"
            >
              {{ person.am ? 'am' : 'pm' }}
            </span>
          </div>
        </div>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.column {
  display: grid;
  grid-template-rows: auto auto minmax(0, auto) minmax(0, auto);
  align-content: start;
  gap: var(--space-2);
  height: calc(100dvh - var(--column-top) - var(--space-4));
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

.section {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.section-title {
  display: flex;
  justify-content: space-between;
  margin: var(--space-2) 0 var(--space-1);
}

.count {
  color: var(--ink-2);
}

.list {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--hairline-2) transparent;
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 0;
  border-top: 1px solid var(--hairline);
}

.avatar {
  flex: none;
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

.nature {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px var(--hairline-2);
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
