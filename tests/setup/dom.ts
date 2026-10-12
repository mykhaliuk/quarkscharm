import { Window } from 'happy-dom';

const window = new Window();
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  SVGElement: window.SVGElement,
  navigator: window.navigator,
});
