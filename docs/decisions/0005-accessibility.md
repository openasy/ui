# 0005. Accessibility: WCAG 2.2 AA, tested in CI

- **Status:** Accepted
- **Area:** Quality

## Context

Operations and security tools are used for hours a day, often under stress, by people with different abilities.

## Decision

- Every screen meets WCAG 2.2 AA: full keyboard use, visible focus, named controls, sufficient contrast.
- Severity and log levels have a shape as well as a colour, so they read without colour.
- Every story runs axe in CI and fails the build on any violation. Full-page stories also fail on horizontal overflow.

## Consequences

- New components ship with a story and an accessibility test, or they do not ship.

## Where you can see it

- [Test results](https://openasy.github.io/ui/?path=/story/quality-test-results--latest)
- [Standard levels with shapes](https://openasy.github.io/ui/?path=/story/foundations-overview--standard-levels)
