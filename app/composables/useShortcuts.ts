import { createShortcutHandler, type Bindings } from '~/utils/shortcuts';

type Options = {
  capture?: boolean;
  isActive?: () => boolean;
};

export const useShortcuts = (
  bindings: Bindings,
  { capture = false, isActive }: Options = {},
): void => {
  const session = useSession();
  const sheet = useShortcutSheet();
  const active = isActive ?? (() => !sheet.open.value);
  const handle = createShortcutHandler(
    bindings,
    () => session.state.status === 'expired' || !active(),
  );
  const listener = (event: KeyboardEvent) => {
    if (handle(event) && capture) event.stopPropagation();
  };
  onMounted(() => window.addEventListener('keydown', listener, { capture }));
  onBeforeUnmount(() =>
    window.removeEventListener('keydown', listener, { capture }),
  );
};
