# Conventional Commits (strict)

Every commit message must follow Conventional Commits: `<type>(<scope>): <subject>`. Acceptable types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`. Scope is required when it adds context (module / area / feature). Subject in imperative mood, lowercase, no trailing period, <= 72 chars.

**Why:** User confirmed this is a strict, global convention across all their projects. Bare-prefix messages like `compute: ...` or `synth-table: ...` are NOT compliant — they look conventional but lack the type. WIP / "feedbacks" / similar placeholder messages must be reworded before merge.

**How to apply:**
- Every `git commit` I make: format `<type>(<scope>): <subject>`. Verify before invoking.
- When renaming/rewording commits during rebase: apply the same format to each commit being touched, including the user's own pre-existing commits if they're being touched.
- When `git log` shows non-conformant messages on a branch (e.g. `WIP`, bare prefixes, "feedbacks"), flag them and propose conventional rewrites — don't wait for the user to ask.
- Body (after the blank line) is free-form prose. Body language follows the per-repo source-code language rule (English for JS/TS repos per metaskills-js-conventions).
- PR titles follow the same format and 70-char cap.
- Choosing the type:
  - `feat`: new user-facing capability
  - `fix`: bug fix (runtime correctness or regression)
  - `refactor`: structural change with no behavior change
  - `chore`: tooling, deps, config — no source code semantic change
  - `test`: tests-only change
  - `docs`: docs/comments only
  - `perf`: performance optimization
  - `style`: formatting only
- Choosing the scope: the module, area, or feature touched. Match existing repo style. Examples from observed history: `fix(frontend-drilldown): ...`, `feat(synth-table): ...`.
- **Ticket-number scope**: some repos (e.g. fulll/benchmark) use the linked issue/ticket number as the scope instead of a descriptive area name — observed as `feat(1359): ...`, `fix(1356): ...` in `git log`. Before picking a descriptive scope, check `git log --oneline` on the target repo for this numeric-scope pattern, and check whether the user has already given a ticket/issue number for the change (in chat, the branch name, or a linked PR/issue) — if either is true, use the ticket number as the scope, not a descriptive name.