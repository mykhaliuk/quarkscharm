<script setup lang="ts">
import { isPending } from '~~/shared/utils/status';
import { today } from '~~/shared/utils/ymd';

const session = useSession();
const { store, year } = useYear();
const natures = useNatures();

const todayYmd = computed(() =>
  today(session.state.me?.timeZone ?? 'Europe/Paris'),
);
const pendingIds = computed(
  () =>
    new Set(
      store.state.requests
        .filter((r) => isPending(r.statusId))
        .map((r) => r.id),
    ),
);
const selection = ref(new Map());

onMounted(() => {
  natures.load();
  if (store.state.status.requests === 'idle') store.load(year.value);
});
</script>

<template>
  <main class="planner">
    <YearGrid
      :year="year"
      :slots="store.slots.value"
      :selection="selection"
      :is-selectable="store.isSelectable"
      :holidays="store.state.holidays"
      :today="todayYmd"
      :pending-ids="pendingIds"
      :color-token="natures.colorToken"
    />
  </main>
</template>
