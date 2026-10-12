const open = ref(false);

export const useShortcutSheet = () => {
  const toggle = () => {
    open.value = !open.value;
  };
  const close = () => {
    open.value = false;
  };
  return { open: readonly(open), toggle, close };
};
