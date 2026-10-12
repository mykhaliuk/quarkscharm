# quarksCharm

The charm flavour of quarksUp: a personal helper for absences
(congés, télétravail) on top of the quarksUp Times API.

- Year calendar of your own absences, public holidays and non-working days
- Add, change and cancel absences (cancel asks for confirmation)
- Balances (congés payés, Fulll Off)
- Who is off today in your service

Stateless: no database, no accounts. You paste your own quarksUp bearer
token; it stays in your browser.

## Stack

Nuxt 4 (Vue 3), Nitro server routes as the CORS proxy, Vercel, bun.
