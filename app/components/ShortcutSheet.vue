<script setup lang="ts">
const GROUPS = [
  {
    title: 'Move the cursor',
    rows: [
      { keys: ['h', 'l', '←', '→'], action: 'One day back / forward' },
      { keys: ['k', 'j', '↑', '↓'], action: 'One week back / forward' },
      { keys: ['H', 'L'], action: 'One month back / forward' },
      { keys: ['K', 'J'], action: 'Four months back / forward' },
      { keys: ['.'], action: 'Today' },
    ],
  },
  {
    title: 'Paint',
    rows: [
      { keys: ['t', 'f', 'c'], action: 'Pick a brush; again drops it' },
      { keys: ['Space'], action: 'Paint or unpaint the cursor day' },
      { keys: ['a', 'p'], action: 'Paint the morning / afternoon only' },
      { keys: ['v'], action: 'Start or leave a range; Space paints it' },
      { keys: ['u'], action: 'Undo the last paint (10 steps)' },
      { keys: ['U'], action: 'Redo what u took back' },
      { keys: ['Esc'], action: 'Leave the range, clear, or drop the brush' },
    ],
  },
  {
    title: 'Requests',
    rows: [
      { keys: ['Enter'], action: 'Open the request card, or submit' },
      { keys: ['e'], action: 'Change the request under the cursor' },
      { keys: ['x'], action: 'Cancel the request under the cursor' },
    ],
  },
  {
    title: 'Year and help',
    rows: [
      { keys: ['[', ']'], action: 'Previous / next leave year' },
      { keys: ['s'], action: 'Show or hide the school holidays' },
      { keys: ['?'], action: 'Show or hide this sheet' },
    ],
  },
];

const sheet = useShortcutSheet();
const always = () => true;

useShortcuts(
  { 'Shift+Slash': sheet.toggle },
  { capture: true, isActive: always },
);
useShortcuts(
  { Escape: sheet.close },
  { capture: true, isActive: () => sheet.open.value },
);
</script>

<template>
  <div
    v-if="sheet.open.value"
    class="scrim"
    data-testid="shortcut-sheet"
    @click.self="sheet.close"
  >
    <section
      class="card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-title"
    >
      <h2 id="shortcut-title" class="title">Keyboard shortcuts</h2>
      <div class="groups">
        <div v-for="group in GROUPS" :key="group.title" class="group">
          <h3 class="label">{{ group.title }}</h3>
          <dl>
            <template v-for="row in group.rows" :key="row.action">
              <dt>
                <kbd v-for="key in row.keys" :key="key" class="caption">{{
                  key
                }}</kbd>
              </dt>
              <dd class="caption">{{ row.action }}</dd>
            </template>
          </dl>
        </div>
      </div>
      <p class="caption note">
        Keys follow their place on a US keyboard, on any layout.
      </p>
    </section>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--scrim);
  z-index: 9;
}

.card {
  width: min(720px, calc(100% - 32px));
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-pop);
}

h2,
h3,
p {
  margin: 0;
}

.groups {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4) var(--space-6);
}

.group {
  display: grid;
  gap: var(--space-2);
  align-content: start;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-3);
  margin: 0;
}

dt {
  display: flex;
  gap: 4px;
}

dd {
  margin: 0;
  color: var(--ink-2);
}

kbd {
  min-width: 20px;
  padding: 0 6px;
  border: 1px solid var(--hairline-2);
  border-radius: 6px;
  background: var(--surface-sunk);
  color: var(--ink);
  text-align: center;
  font-family: inherit;
}

.note {
  color: var(--ink-2);
}
</style>
