# 0003. Every story is an accessibility test

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `.storybook/`, `vitest` story project, CI
- **Area:** Quality

## Context

Platform decision 0005 requires WCAG 2.2 AA and tests in CI. The library is where most of a product's markup comes from, so it is where checks pay off most.

## Decision

- Every story runs in a real browser through Vitest and fails on any axe violation, in both themes.
- Full-page stories also fail on horizontal overflow at their viewport, and on navigation items that open pages not designed yet.
- Interactive components have `play` tests that drive them with the keyboard or pointer and check roles and states.
- A new component ships with a story, or it does not ship.

## Consequences

- Products built from the library start accessible; product teams test only what they add.
