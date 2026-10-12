import { createShortcutHandler, type Bindings } from '~/utils/shortcuts';

export const useShortcuts = (bindings: Bindings): void => {
  const session = useSession();
  const handle = createShortcutHandler(
    bindings,
    () => session.state.status === 'expired',
  );
  const listener = (event: KeyboardEvent) => handle(event);
  onMounted(() => window.addEventListener('keydown', listener));
  onBeforeUnmount(() => window.removeEventListener('keydown', listener));
};
