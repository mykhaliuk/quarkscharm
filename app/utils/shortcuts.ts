export type ShortcutTarget = {
  tagName: string;
  isContentEditable: boolean;
} | null;

export type ShortcutEvent = {
  code: string;
  shiftKey?: boolean;
  target: unknown;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  preventDefault: () => void;
};

export type Bindings = Record<string, () => void>;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const ACTIVATABLE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);
const ACTIVATION_CODES = new Set(['Enter', 'NumpadEnter', 'Space']);

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

export const bindingKey = (event: ShortcutEvent): string =>
  event.shiftKey === true ? `Shift+${event.code}` : event.code;

export const createShortcutHandler =
  (bindings: Bindings, isPaused: () => boolean = () => false) =>
  (event: ShortcutEvent): boolean => {
    if (isPaused()) return false;
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (isEditableTarget(event.target)) return false;
    if (ACTIVATION_CODES.has(event.code) && isActivatable(event.target))
      return false;
    const binding = bindings[bindingKey(event)];
    if (!binding) return false;
    event.preventDefault();
    binding();
    return true;
  };
