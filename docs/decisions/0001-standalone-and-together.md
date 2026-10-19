# 0001. Every product runs alone, with the others and with third-party tools

- **Status:** Accepted
- **Area:** Architecture

## Context

People adopt one tool at a time. Someone who only needs a VPN should not have to run 38 services, and someone who already runs Grafana, Keycloak or Splunk should not have to replace them.

## Decision

- Each product is a complete application: its own container, database, users, settings and API.
- Products that are linked share entities (hosts, users, IPs, repositories) so a host in Logs opens in Infrastructure. Linking uses a token; nothing is shared until you link.
- Every integration uses an open standard in both directions: OIDC and SAML for sign-in, SCIM for users, OpenTelemetry and Prometheus for telemetry, Syslog for logs, Sigma for detections, STIX/TAXII for threat intel, and signed webhooks for events.

## Consequences

- A product never assumes another one is installed; missing data is shown as "connect X to see this", not as an error.
- Shared UI (shell, product switcher, entity chips) lives in `@openasy/ui` so linked products feel like one system.

## Where you can see it

- [Integrations page (any product)](https://openasy.github.io/ui/?path=/story/products-vpn--integrations)
- [Breach coverage across products](https://openasy.github.io/ui/?path=/story/platform-breach-coverage--coverage)
