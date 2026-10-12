import { describe, expect, test } from 'bun:test';
import { createShortcutHandler, isEditableTarget } from '~/utils/shortcuts';

const target = (tagName: string, extra: Record<string, unknown> = {}) => ({
  tagName,
  isContentEditable: false,
  ...extra,
});

describe('isEditableTarget', () => {
  test('inputs, textareas, selects and contenteditable are editable', () => {
    expect(isEditableTarget(target('INPUT'))).toBe(true);
    expect(isEditableTarget(target('TEXTAREA'))).toBe(true);
    expect(isEditableTarget(target('SELECT'))).toBe(true);
    expect(isEditableTarget(target('DIV', { isContentEditable: true }))).toBe(
      true,
    );
  });

  test('buttons, the body and null are not', () => {
    expect(isEditableTarget(target('BUTTON'))).toBe(false);
    expect(isEditableTarget(target('BODY'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('createShortcutHandler', () => {
  test('calls the binding for the key and prevents the default', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      ArrowLeft: () => hits.push('left'),
      t: () => hits.push('t'),
    });
    let prevented = 0;
    handle({
      key: 'ArrowLeft',
      target: target('BODY'),
      preventDefault: () => prevented++,
    });
    handle({
      key: 'T',
      target: target('BODY'),
      preventDefault: () => prevented++,
    });
    expect(hits).toEqual(['left', 't']);
    expect(prevented).toBe(2);
  });

  test('ignores keys while an input is focused or with a modifier', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      ArrowLeft: () => hits.push('left'),
    });
    handle({
      key: 'ArrowLeft',
      target: target('INPUT'),
      preventDefault: () => {},
    });
    handle({
      key: 'ArrowLeft',
      target: target('BODY'),
      metaKey: true,
      preventDefault: () => {},
    });
    handle({
      key: 'ArrowLeft',
      target: target('BODY'),
      ctrlKey: true,
      preventDefault: () => {},
    });
    expect(hits).toEqual([]);
  });

  test('ignores unknown keys', () => {
    const handle = createShortcutHandler({ ArrowLeft: () => {} });
    let prevented = 0;
    handle({
      key: 'x',
      target: target('BODY'),
      preventDefault: () => prevented++,
    });
    expect(prevented).toBe(0);
  });
});
