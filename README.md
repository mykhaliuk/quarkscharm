# quarksCharm

The charm flavour of quarksUp: a personal helper for absences
(congés, télétravail) on top of the quarksUp Times API.

quarksCharm is keyboard first: you can move on the year, paint days,
submit, change and cancel requests without the mouse. Press `?` in the
app to see all the shortcuts.

- Year calendar of your own absences, public holidays and non-working days
- Paint days or half days with a nature brush, review quarksUp's own
  preview, submit all runs in one action
- Change and cancel absences (cancel asks for confirmation)
- Balances (congés payés, Fulll Off, time savings account when present)
  with the projected balance after the current selection
- Who is off in your service on the cursor day

## Production

https://quarkscharm.vercel.app, deployed from `main`.

## How to connect

### With the token bridge extension (Chrome, Edge)

The extension reads the token that quarksUp keeps in its own tab and gives
it to quarksCharm only. You do not paste anything, and quarksCharm renews
the token before it expires.

1. Clone this repository.
2. Open `chrome://extensions`, turn on "Developer mode", press "Load
   unpacked" and pick the `extension/` folder.
3. Sign in to quarksUp once in this browser.
4. Open quarksCharm, type your tenant (the part before `.quarksup.net`),
   leave the token empty and press Connect.

When no quarksUp tab is open, the extension opens one in the background
and closes it when it has the token. If quarksUp asks you to sign in, the
tab stays open: sign in and press Connect again.

The extension asks for access to `*.quarksup.net` only. It keeps the token
in memory, never on disk, and answers `quarkscharm.vercel.app` only. For
local development, `bun run extension:dev` builds `extension-dev/`, a copy
that also answers `localhost:3000`; load it instead of `extension/`.

### With a pasted token

1. Open quarksUp in your browser and sign in.
2. Press F12 to open the developer tools and pick the Network tab.
3. Click any request to `api.quarksup.net` and copy the value of its
   `authorization` header. It starts with `Bearer eyJ`.
4. Open quarksCharm, type your tenant (the part before `.quarksup.net`),
   paste the token and press Connect.

The token lives one hour. When it expires, quarksCharm asks for a new one
and keeps your selection and the displayed year.

## Keyboard

The cursor is the day with the focus ring. All actions apply to it.

| Key               | Action                                      |
| ----------------- | ------------------------------------------- |
| `h` `l` / `←` `→` | one day back / forward                      |
| `k` `j` / `↑` `↓` | one week back / forward                     |
| `H` `L`           | one month back / forward                    |
| `K` `J`           | four months back / forward                  |
| `.`               | today                                       |
| `[` `]`           | previous / next year                        |
| `t` `f` `c`       | pick a brush; press again to drop it        |
| `Space`           | paint or unpaint the cursor day             |
| `a` `p`           | paint the morning / afternoon only          |
| `v`               | start or leave a range; `Space` paints it   |
| `u` `U`           | undo / redo a paint (10 steps)              |
| `Escape`          | leave the range, clear, or drop the brush   |
| `Enter`           | open the request card, or submit the review |
| `e`               | change the request under the cursor         |
| `x`               | cancel the request under the cursor         |
| `?`               | show or hide the shortcut sheet             |

The shortcuts read the physical key, so they work on all keyboard
layouts. The mouse still works: a click paints a day and moves the
cursor, Shift + click paints the half under the pointer, and a drag
paints every selectable day crossed. A click on a request opens its
card.

## Privacy

quarksCharm has no database and no accounts. The server is a stateless
relay: it forwards allow-listed quarksUp calls with your own bearer
token, caches nothing and logs no header or body. The token stays in the
session storage of the tab, so a new tab asks for it again. The tenant
and the theme stay in your browser's local storage; everything fetched
from quarksUp stays in memory and goes away with the tab. "Forget token"
removes the token.

## Development

```sh
bun install
bun run dev          # http://localhost:3000
bun run check        # lint, format, typecheck, unit tests, design tokens, specs
bun run test:e2e     # Playwright against a production preview, quarksUp mocked
bun run build
```

Node 24 or later, bun as the package manager. Every `feat` or `fix`
commit names its OpenSpec change with a `Change: <name>` trailer.

## Documentation

- [quarksUp API notes](docs/quarksup-api.md): hosts, endpoints, shapes,
  the half-day encoding and the reference data.
- [Design system](docs/design/README.md): the Claude Design artifact and
  the exported tokens.
- [OpenSpec](openspec/): the specs and the change history.
