/* Reads the Claude Design export (docs/design/tokens.json) into the three
   maps ds-check compares against the production CSS: light, dark, shared. */

const ALIAS_RE = /^\{([A-Za-z0-9_.-]+)\}$/;

const toCss = (value) => {
  const alias = ALIAS_RE.exec(value);
  return alias ? `var(--${alias[1]})` : value;
};

const themed = (token, themeId, firstId) => {
  const { value } = token;
  if (typeof value === 'string') return value;
  return value[themeId] ?? value[firstId];
};

export const loadTokens = (tokens) => {
  const light = new Map();
  const dark = new Map();
  const shared = new Map();
  const firstId = tokens.color.themes[0].id;
  const darkId = tokens.color.themes[1]?.id ?? firstId;
  const themedFamilies = [tokens.color.tokens, tokens.shadow?.tokens ?? []];
  for (const family of themedFamilies) {
    for (const token of family) {
      light.set(`--${token.name}`, toCss(themed(token, firstId, firstId)));
      dark.set(`--${token.name}`, toCss(themed(token, darkId, firstId)));
    }
  }
  const sharedFamilies = [
    tokens.spacing?.tokens ?? [],
    tokens.radius?.tokens ?? [],
  ];
  for (const family of sharedFamilies) {
    for (const token of family) shared.set(`--${token.name}`, token.value);
  }
  for (const [key, stack] of Object.entries(tokens.type?.families ?? {})) {
    shared.set(`--font-${key}`, stack);
  }
  return { light, dark, shared };
};
