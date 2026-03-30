# E2E Testing Guide

This file applies to everything under `memos/e2e/`.

## Stack

- Use `@cucumber/cucumber` for feature files and step definitions.
- Use `@playwright/test` for browser control and assertions.
- Use `tsx` to run ESM TypeScript entrypoints.
- Keep the app-facing E2E config in `e2e/cucumber.mjs` and `e2e/tsconfig.json`.

## Commands

- Install or update dependencies with `vp add` / `vp install`, not `pnpm`.
- Run cleanup with `vp run e2e:cleanup`.
- Run a dry-run with `vp run e2e:dry-run`.
- Run tests with `vp run e2e:test`.
- For local runs, prefer:
  - `BASE_URL=http://127.0.0.1:3000`
  - `API_BASE_URL=http://127.0.0.1:2910/api/v1`

## Recommended Workflow

1. Analyze current coverage.
   - List existing feature files under `e2e/src/features/`.
   - Read `e2e/src/features/memos/README.md` first to see covered journeys and priorities.
   - Inspect the real UI and state flow in `src/components/`, `src/routes/`, and `src/lib/` before adding tests.
2. Choose one user journey to extend.
   - Prefer exactly one new journey per change unless the work is tightly coupled.
   - Follow the priority order `P0 -> P1 -> P2`.
   - Choose core product behavior first, not cosmetic routes.
3. Update the module inventory first.
   - Add or update the row in `e2e/src/features/memos/README.md`.
   - Record feature name, description, priority, status, and target `.feature` file before writing steps.
4. Design the scenario in Gherkin.
   - Write or extend one `.feature` file under `e2e/src/features/memos/`.
   - Keep scenarios in Chinese and use stable tags like `@memos @P1 @MEMOS-XYZ-001`.
   - Prefer one scenario per user outcome.
5. Implement step definitions and support code.
   - Add or extend step files under `e2e/src/steps/memos/`.
   - Reuse `CustomWorld`, selectors, API helpers, and hooks before inventing new helpers.
   - If the test needs new app anchors, add minimal `data-testid` support in app code.
6. Keep test data and cleanup correct.
   - Use `e2e-` users only.
   - Prefer API sign-up for authenticated setup.
   - If new DB relations are introduced for E2E users, update `e2e/src/support/db-cleanup.ts` in the same change.
7. Validate in the right order.
   - Run `vp run e2e:cleanup` if needed.
   - Run `vp run e2e:dry-run` first to verify feature/step wiring.
   - Run targeted tags next, for example `vp run e2e:test -- --tags "@P0"`.
   - Run the full suite before finishing if shared hooks, selectors, cleanup, or support code changed.
8. Fix failures by tightening determinism.
   - Prefer better selectors and explicit visible-state assertions over long waits.
   - If a failure reveals a real product bug, fix the product bug and keep the test.
   - If a scenario is inherently unstable, do not silently weaken it; document the issue in the README.

## Authoring Rules

- Write `.feature` files in Chinese.
- Keep scenario tags explicit and stable: `@memos`, `@P0`, `@P1`, `@P2`, plus scenario IDs like `@MEMOS-CRUD-001`.
- Put reusable browser and environment setup in `e2e/src/support/`, not in step files.
- Keep step definitions thin: orchestrate UI actions and assertions, do not duplicate app business logic.
- Add `console.log` step traces for debugging.
- Prefer `data-testid` selectors first, then role/label selectors, and use visible text only when the UI text is intentionally stable.
- When selectors are flaky, add the smallest possible `data-testid` to production UI instead of using brittle CSS traversal.

## Writing Feature Files

- Place feature files under `e2e/src/features/memos/`.
- Prefer one file per functional area, for example:
  - `auth.feature`
  - `crud.feature`
- Prefer one scenario per user outcome. Do not combine multiple unrelated outcomes into one scenario.
- Use product language in steps, not implementation language. Keep DOM details in step definitions.
- Reuse existing step sentences when the behavior is the same. Do not create near-duplicates.

## Test Data and Isolation

- All synthetic test users must use the `e2e-` prefix.
- Prefer API sign-up for authenticated scenarios.
- Keep UI login coverage only for the login journey itself.
- Do not share users across scenarios.
- The cleanup contract is part of the suite: `e2e:test` cleans `e2e-*` users, memos, tags, and default-org records before and after the run.
- If you add new server-side relations for E2E users, update `e2e/src/support/db-cleanup.ts`.

## Scenario Scope

- `P0`: login redirect, UI login, create memo.
- `P1`: edit, archive, restore, delete, tag filter.
- `P2`: richer editor or relationship flows if they become core journeys.
- Do not expand scope casually; add the next user journey only after the existing suite stays green.

## Stability Rules

- Favor deterministic assertions on visible user outcomes.
- Do not assert internal query cache state or request counts unless a test explicitly targets that contract.
- Use unique memo content per run with the existing `runId`.
- If a failure is caused by environment reachability, fail fast in hooks instead of timing out inside steps.

## Files to Update Together

- New scenarios usually require coordinated updates to:
  - `e2e/src/features/memos/*.feature`
  - `e2e/src/steps/memos/*.steps.ts`
  - `e2e/src/features/memos/README.md`
- If a new selector is added, update the app component and the selector map in `e2e/src/support/selectors.ts`.
- If DB cleanup scope changes, update both `e2e/src/support/db-cleanup.ts` and the README command/behavior notes.
