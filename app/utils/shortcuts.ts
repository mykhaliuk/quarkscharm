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
const ACTIVATABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

export const isEditableTarget = (target: unknown): boolean => {
  if (typeof target !== 'object' || target === null) return false;
  const { tagName, isContentEditable } = target as {
    tagName?: string;
    isContentEditable?: boolean;
  };
  if (isContentEditable === true) return true;
  return typeof tagName === 'string' && EDITABLE_TAGS.has(tagName);
};

const isActivatable = (target: unknown): boolean => {
  if (typeof target !== 'object' || target === null) return false;
  const { tagName, getAttribute } = target as {
    tagName?: string;
    getAttribute?: (name: string) => string | null;
  };
  if (typeof tagName === 'string' && ACTIVATABLE_TAGS.has(tagName)) return true;
  return getAttribute?.call(target, 'role') === 'button';
};

export const createShortcutHandler =
  (bindings: Bindings, isPaused: () => boolean = () => false) =>
  (event: ShortcutEvent): void => {
    if (isPaused()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;
    if (event.key === 'Enter' && isActivatable(event.target)) return;
    const binding = bindings[event.key] ?? bindings[event.key.toLowerCase()];
    if (!binding) return;
    event.preventDefault();
    binding();
  };
