# Comments only when load-bearing

A comment is tolerated **if and only if** its absence would lead to a bug or a
regression. Even then it must be extremely concise — one line where possible,
never a paragraph.

**Why:** The user has stated this repeatedly and a weaker phrasing in
[[metaskills-js-conventions]] ("do not add obvious comments") kept failing to
enforce it: it let through comments that were merely *non-obvious* rather than
*load-bearing*. Confirmed again 2026-09-03 (forecast, parallel e2e PR #2579),
where the user had to reject a comment justifying a design decision. The
reasoning behind a change belongs in the commit message and the PR, where it is
versioned alongside the diff and cannot rot; a comment restating it duplicates
the argument in the one place that will drift out of date.

**How to apply:**

Before writing any comment, answer: *what breaks if this line is deleted?* If
the answer is "nothing, the reader just knows less", delete it.

- **Passes** — removing it invites a real defect:
  - A trap that reads as a bug when correct: `// "0" is a valid worker id`
    above a `!== undefined` check someone would otherwise "simplify" to a
    truthiness test.
  - Why an empty `catch` is empty (composes with
    [[metaskills-error-handling]]'s "never swallow errors silently").
  - A non-obvious ordering or timing constraint another edit would violate:
    `// must run before config is imported`.
  - A workaround for an external bug, with the reference.
- **Fails** — delete, regardless of how well written:
  - Restating the code (`// increment the counter`).
  - Explaining or defending a design decision → commit message / PR body.
  - Describing what a well-named field or function already says.
  - Narrating architecture or history of the module → commit message, ADR, or
    `documentation/`.

Applies to line, block and JSDoc comments in every language, in new code and in
code being touched: when editing a region, drop the non-load-bearing comments
already there. Public API JSDoc that feeds type hints or generated docs is
exempt. English only, per [[metaskills-js-conventions]].
