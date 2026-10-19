# 0006. Languages: English first, ready for translation

- **Status:** Planned
- **Area:** Product

## Context

The products are used worldwide. Translations must be possible without forking.

## Decision

- English is the default and the source language.
- All UI text goes through ICU message format, so plurals and genders translate correctly.
- Dates, numbers, bytes and durations use the viewer's locale (`Intl`). Layouts use logical CSS properties so right-to-left languages work.
- Translations are community-contributed files in each product's repository.

## Consequences

- Until this lands, all text is English and formatting helpers in `@openasy/ui` already centralise numbers and bytes.
