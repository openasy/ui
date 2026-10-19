# 0002. Authentication: local accounts, MFA and single sign-on

- **Status:** Accepted
- **Area:** Security

## Context

Small teams want to start without an identity provider; larger ones require their own IdP and MFA everywhere.

## Decision

- Every product supports local accounts with MFA (TOTP and passkeys/WebAuthn). MFA is required for owners and admins.
- Every product can instead use OIDC, SAML 2.0 or LDAP. The Identity product is one such provider and gives single sign-on across all OpenAsy products.
- Sessions are short-lived, bound to the device, and can be revoked from the product or from Identity.

## Consequences

- The sign-in screen is shared by all products and adapts to the configured methods.

## Where you can see it

- [Sign-in](https://openasy.github.io/ui/?path=/story/identity-sign-in--default)
- [MFA step](https://openasy.github.io/ui/?path=/story/identity-sign-in--mfa-step)
- [Identity providers](https://openasy.github.io/ui/?path=/story/products-identity--providers)
