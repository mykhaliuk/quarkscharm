# quarksCharm

The charm flavour of quarksUp: a personal helper for absences
(congés, télétravail) on top of the quarksUp Times API.

- Year calendar of your own absences, public holidays and non-working days
- Paint days or half days with a nature brush, review quarksUp's own
  preview, submit all runs in one action
- Change and cancel absences (cancel asks for confirmation)
- Balances (congés payés, Fulll Off, time savings account when present)
  with the projected balance after the current selection
- Who is off today in your service, or on any day you click

## Production

https://quarkscharm.vercel.app, deployed from `main`.

## How to connect

1. Open quarksUp in your browser and sign in.
2. Press F12 to open the developer tools and pick the Network tab.
3. Click any request to `api.quarksup.net` and copy the value of its
   `authorization` header. It starts with `Bearer eyJ`.
4. Open quarksCharm, type your tenant (the part before `.quarksup.net`),
   paste the token and press Connect.

The token lives one hour. When it expires, quarksCharm asks for a new one
and keeps your selection and the displayed year.

## Keyboard

| Key           | Action                             |
| ------------- | ---------------------------------- |
| `←` `→`       | previous or next year              |
| `T` `F` `C`   | select the first three brushes     |
| click         | paint a whole day                  |
| Shift + click | paint the half under the pointer   |
| drag          | paint every selectable day crossed |
| Alt + click   | show who is off on that day        |
| `Enter`       | submit the review panel            |
| `Escape`      | clear the selection                |

## Privacy

quarksCharm has no database and no accounts. The server is a stateless
relay: it forwards allow-listed quarksUp calls with your own bearer
token, caches nothing and logs no header or body. The tenant, the token
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
