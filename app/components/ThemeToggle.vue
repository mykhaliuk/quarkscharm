<script setup lang="ts">
const { theme, cycle } = useTheme();
const label = computed(() => `Theme: ${theme.value}`);
</script>

<template>
  <button
    type="button"
    class="theme-toggle label"
    :aria-label="label"
    :title="label"
    data-testid="theme-toggle"
    @click="cycle"
  >
    <span v-if="theme === 'dark'" aria-hidden="true">☾</span>
    <span v-else-if="theme === 'light'" aria-hidden="true">☀</span>
    <span v-else aria-hidden="true">◐</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
