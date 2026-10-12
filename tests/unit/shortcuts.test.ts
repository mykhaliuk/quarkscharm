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

const event = (
  code: string,
  tagName = 'BODY',
  extra: Record<string, unknown> = {},
) => {
  const state = { prevented: false };
  return {
    state,
    value: {
      code,
      target: target(tagName),
      preventDefault: () => {
        state.prevented = true;
      },
      ...extra,
    },
  };
};

describe('createShortcutHandler', () => {
  test('calls the binding for the code and prevents the default', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      ArrowLeft: () => hits.push('left'),
      KeyT: () => hits.push('t'),
    });
    const left = event('ArrowLeft');
    const t = event('KeyT', 'BODY', { key: 't' });
    expect(handle(left.value)).toBe(true);
    expect(handle(t.value)).toBe(true);
    expect(hits).toEqual(['left', 't']);
    expect(left.state.prevented).toBe(true);
    expect(t.state.prevented).toBe(true);
  });

  test('a Russian layout reaches the binding of the physical key', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({ KeyJ: () => hits.push('j') });
    handle(event('KeyJ', 'BODY', { key: 'о' }).value);
    expect(hits).toEqual(['j']);
  });

  test('Shift selects the Shift binding and never the plain one', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      KeyJ: () => hits.push('j'),
      'Shift+KeyJ': () => hits.push('J'),
    });
    handle(event('KeyJ', 'BODY', { key: 'J', shiftKey: true }).value);
    handle(event('KeyJ', 'BODY', { key: 'j', shiftKey: false }).value);
    expect(hits).toEqual(['J', 'j']);
    const plain = createShortcutHandler({ KeyT: () => hits.push('t') });
    const shifted = event('KeyT', 'BODY', { shiftKey: true });
    expect(plain(shifted.value)).toBe(false);
    expect(shifted.state.prevented).toBe(false);
  });

  test('ignores keys while an input is focused or with a modifier', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      ArrowLeft: () => hits.push('left'),
    });
    handle(event('ArrowLeft', 'INPUT').value);
    handle(event('ArrowLeft', 'SELECT').value);
    handle(event('ArrowLeft', 'BODY', { metaKey: true }).value);
    handle(event('ArrowLeft', 'BODY', { ctrlKey: true }).value);
    handle(event('ArrowLeft', 'BODY', { altKey: true }).value);
    expect(hits).toEqual([]);
  });

  test('ignores unknown keys', () => {
    const handle = createShortcutHandler({ ArrowLeft: () => {} });
    const x = event('KeyX');
    expect(handle(x.value)).toBe(false);
    expect(x.state.prevented).toBe(false);
  });
});

describe('shortcuts and focused controls', () => {
  test('Enter or Space on a focused button or link keeps its own action', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({
      Enter: () => hits.push('enter'),
      Space: () => hits.push('space'),
    });
    for (const tag of ['BUTTON', 'A', 'SUMMARY']) {
      for (const code of ['Enter', 'Space']) {
        const e = event(code, tag);
        handle(e.value);
        expect(e.state.prevented).toBe(false);
      }
    }
    const role = event('Space', 'DIV', {
      target: {
        tagName: 'DIV',
        isContentEditable: false,
        getAttribute: () => 'button',
      },
    });
    handle(role.value);
    expect(role.state.prevented).toBe(false);
    expect(hits).toEqual([]);
  });

  test('Space on the page body reaches the binding and stops the scroll', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler({ Space: () => hits.push('space') });
    const e = event('Space');
    handle(e.value);
    expect(hits).toEqual(['space']);
    expect(e.state.prevented).toBe(true);
  });

  test('a paused handler ignores every key', () => {
    const hits: string[] = [];
    const handle = createShortcutHandler(
      { Escape: () => hits.push('escape') },
      () => true,
    );
    const e = event('Escape');
    expect(handle(e.value)).toBe(false);
    expect(e.state.prevented).toBe(false);
    expect(hits).toEqual([]);
  });
});
