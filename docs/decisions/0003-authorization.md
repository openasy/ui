# 0003. Authorization: per-product roles and scoped tokens

- **Status:** Accepted
- **Area:** Security

## Context

Being an admin in Logs must not make you an admin in Access or Secrets.

## Decision

- Roles are per product: Owner, Admin, Editor and Viewer, plus custom roles built from named permissions.
- Groups from the identity provider can be mapped to roles, so access follows HR changes.
- API tokens are scoped to a product, a set of permissions and an expiry date. There are no all-powerful tokens.
- Least privilege is the default: new members are Viewers.

## Consequences

- Every action in the UI and API checks a permission, and every denied action is logged.

## Where you can see it

- [Settings → Members (any product)](https://openasy.github.io/ui/?path=/story/products-vpn--settings)
