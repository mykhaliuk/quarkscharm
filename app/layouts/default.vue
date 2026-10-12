<template>
  <div class="app">
    <AppHeader>
      <template #counters><slot name="counters" /></template>
    </AppHeader>
    <slot />
    <TokenPrompt />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-8);
  min-height: 100vh;
}
</style>
