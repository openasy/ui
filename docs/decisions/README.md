# UI design decisions

Decisions about how `@openasy/ui` is built: tokens, theming, testing and distribution.

The decisions every OpenAsy product follows (running alone or together, security, licences, versions, backups and
more) are kept with the site, in [openasy.github.io `docs/decisions`](https://github.com/openasy/openasy.github.io/tree/main/docs/decisions),
and shown at [openasy.github.io/principles](https://openasy.github.io/principles). They are referred to here as
"platform decision NNNN". Records 0001 to 0020 used to live in this folder; they kept their numbers when they moved.

Each record has a **Decision** status (`Proposed`, `Accepted`, `Superseded by NNNN`) and an **Implementation** status
(`Not started`, `In progress`, `Implemented`) with **Where** naming what ships it.

| # | Decision | Area | Decision status | Implementation |
| --- | --- | --- | --- | --- |
| 0001 | [Design tokens are CSS variables](./0001-tokens-as-css-variables.md) | Styling | Accepted | Implemented |
| 0002 | [How the theme is chosen and applied](./0002-theme-switching.md) | Behaviour | Accepted | Implemented |
| 0003 | [Every story is an accessibility test](./0003-accessibility-in-every-story.md) | Quality | Accepted | Implemented |
| 0004 | [Distributed as a GitHub release asset](./0004-distribution.md) | Engineering | Accepted | Implemented |
| 0005 | [The shell is laid out like a cloud portal](./0005-portal-shell.md) | Layout | Accepted | Implemented |
| 0006 | [The library's own words are translated](./0006-translated-library-words.md) | Behaviour | Accepted | Implemented |

To propose a change, open a pull request that adds a record or changes the status of an existing one.
