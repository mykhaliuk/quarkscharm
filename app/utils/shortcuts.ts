export type ShortcutTarget = {
  tagName: string;
  isContentEditable: boolean;
} | null;

export type ShortcutEvent = {
  key: string;
  target: unknown;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  preventDefault: () => void;
};

export type Bindings = Record<string, () => void>;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const isEditableTarget = (target: unknown): boolean => {
  if (typeof target !== 'object' || target === null) return false;
  const { tagName, isContentEditable } = target as {
    tagName?: string;
    isContentEditable?: boolean;
  };
  if (isContentEditable === true) return true;
  return typeof tagName === 'string' && EDITABLE_TAGS.has(tagName);
};

export const createShortcutHandler =
  (bindings: Bindings) =>
  (event: ShortcutEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;
    const binding = bindings[event.key] ?? bindings[event.key.toLowerCase()];
    if (!binding) return;
    event.preventDefault();
    binding();
  };
