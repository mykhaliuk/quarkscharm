# Module-private helpers stay in their module

A helper used by only one class or module (row mappers, query fragments,
error predicates of a repository) lives in the same file as non-exported
functions, declared right below the class. Do not put it in a separate
`helpers/` file and do not export it.

**Why:** The user asked for this explicitly (2026-10-07, benchmark PR #1583,
`infra/db/benchmark/helpers/taskStatusRows.ts`) as a global rule for all
sessions: such functions are the private methods of the repository. A
separate exported file opens them to other layers and modules, so the
isolation of the repository leaks.

**How to apply:**
- Before you create a helper file, check who imports it. One consumer means
  the helper goes into the consumer's file as a non-exported function.
- Order inside the file (newspaper order): imports, constants, exported
  types, the class, then the private functions below it. Use hoisted
  `function` declarations so the class can call them before their position.
- Export only what another module really needs, for example a row type for
  the knex table typings. Export a type, never the private functions.
- Move a helper to its own file only when a second real consumer appears.
- A pure mapper per [[js-layering]] keeps its role; this rule only decides
  where it lives. Composes with [[metaskills-js-conventions]] and the
  newspaper member order the user prefers.
