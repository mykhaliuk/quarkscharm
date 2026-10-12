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

const event = (key: string, tagName: string) => {
  const state = { prevented: false };
  return {
    state,
    value: {
      key,
      target: target(tagName),
      preventDefault: () => {
        state.prevented = true;
      },
    },
  };
};

describe('shortcuts and focused controls', () => {
  test('Enter on a focused button or link keeps its own action', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({ Enter: () => hits.push('enter') });
    for (const tag of ['BUTTON', 'A', 'SUMMARY']) {
      const e = event('Enter', tag);
      handle(e.value);
      expect(e.state.prevented).toBe(false);
    }
    expect(hits).toEqual([]);
  });

  test('a paused handler ignores every key', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler(
      { Escape: () => hits.push('escape') },
      () => true,
    );
    handle(event('Escape', 'BODY').value);
    expect(hits).toEqual([]);
  });
});
