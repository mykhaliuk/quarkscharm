<script setup lang="ts">
const school = useSchoolHolidays();

const onSelect = (event: Event) => {
  school.setArea((event.target as HTMLSelectElement).value);
};
</script>

<template>
  <div class="school-toggle">
    <button
      type="button"
      class="toggle label"
      :aria-pressed="school.shown.value"
      title="School holidays (s)"
      data-testid="school-toggle"
      @click="school.toggle"
    >
      <span class="dot" aria-hidden="true"></span>
      School holidays
    </button>
    <select
      class="zone label"
      aria-label="School holidays zone"
      data-testid="school-zone"
      :value="school.area.value ?? ''"
      :disabled="school.areas.value.length === 0"
      @change="onSelect"
    >
      <option v-for="area in school.areas.value" :key="area" :value="area">
        {{ area }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.school-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toggle,
.zone {
  height: 32px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
}

.toggle[aria-pressed='true'] {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--cell-school);
  box-shadow: 0 0 0 1px var(--surface);
}

.zone {
  padding: 0 var(--space-2);
}

.toggle:focus-visible,
.zone:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
