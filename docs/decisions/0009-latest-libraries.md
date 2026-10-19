# 0009. Use the latest libraries

- **Status:** Accepted
- **Area:** Engineering

## Context

Old dependencies are the most common source of vulnerabilities, and upgrades get harder the longer they wait.

## Decision

- We use current major versions only (today: React 19, Vite 8, Tailwind CSS 4, TypeScript 7, Storybook 10, Vitest 5, Node 26).
- An update bot opens pull requests for every new version; CI decides whether they merge.
- We do not add a dependency for something a few lines of code can do.

## Consequences

- Users on old browsers or runtimes are not supported.
