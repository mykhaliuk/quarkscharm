/* CSS parsing primitives for the design-system check. */

// Compare CSS values by meaning, not by spelling: case-, space- and
// quote-insensitive, with trailing zeros trimmed so `0.50` === `.5`.
export const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/"/g, "'")
    .replace(/\s+/g, '')
    .replace(/(\.\d*?)0+(?=\D|$)/g, '$1')
    .replace(/\.(?=\D|$)/g, '');

export const eq = (a, b) => normalize(a) === normalize(b);

// Strip comments before parsing so prose mentioning `--token:` is never read
// as a declaration.
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

export const parseDeclarations = (css) => {
  const map = new Map();
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  const stripped = stripComments(css);
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    // Last write wins — mirrors the CSS cascade within a file set.
    map.set(name, value);
  }
  return map;
};
