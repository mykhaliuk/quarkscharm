import { createShortcutHandler, type Bindings } from '~/utils/shortcuts';

export const useShortcuts = (bindings: Bindings): void => {
  const handle = createShortcutHandler(bindings);
  const listener = (event: KeyboardEvent) => handle(event);
  onMounted(() => window.addEventListener('keydown', listener));
  onBeforeUnmount(() => window.removeEventListener('keydown', listener));
};
