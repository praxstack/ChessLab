## Purpose

Allow one server instance to run safely behind an HTTPS reverse proxy for a small invited group, while local use keeps its current defaults.

## ADDED Requirements

### Requirement: HB-001 Canonical origin and trusted proxy hops
`APP_ORIGIN` SHALL accept only a canonical HTTPS origin, or HTTP on loopback, with no path. When set, every state-changing request MUST carry a matching `Origin` header. `TRUST_PROXY` SHALL accept a hop count or explicit proxy addresses and MUST reject `true`. Without it, forwarded-address headers MUST be ignored.

#### Scenario: Forged forwarding header
- **WHEN** no proxy is trusted and a client varies `X-Forwarded-For` across sign-in attempts
- **THEN** the attempts share one rate limit

#### Scenario: Cross-site request
- **WHEN** a hosted server receives a state change without an `Origin`, from another origin, or marked cross-site
- **THEN** it is refused with 403 and nothing changes

### Requirement: HB-002 Session and response security
With an HTTPS origin the session cookie SHALL be HttpOnly, Secure, SameSite=Strict and host-only. Responses SHALL send HSTS, a content security policy restricted to the app's own origin, frame denial, `nosniff`, a same-origin referrer policy and a restrictive permissions policy. JSON bodies SHALL remain limited in size, and mutations SHALL remain JSON-only.

#### Scenario: Hosted sign-up
- **WHEN** an account is created on a hosted origin
- **THEN** the session cookie carries the Secure, HttpOnly and SameSite=Strict attributes and the response carries the security headers

### Requirement: HB-003 Sign-in throttling
Sign-in and sign-up SHALL be throttled per client address. Sign-in SHALL also be throttled per account name across all addresses.

#### Scenario: Distributed guessing
- **WHEN** one account receives more than ten sign-in attempts from different addresses within fifteen minutes
- **THEN** further attempts for that account are refused for the window while other accounts still sign in

### Requirement: HB-004 Invite-gated sign-up
When `BETA_INVITE_CODES` is set, new accounts SHALL require one of the configured codes, compared in constant time. Existing accounts SHALL sign in without a code. When unset, sign-up SHALL behave as before.

#### Scenario: Uninvited sign-up
- **WHEN** a visitor registers without a valid code on a gated server
- **THEN** registration is refused with an explanation and no account is created

### Requirement: HB-005 Health check and container
`/healthz` SHALL report healthy only when the database answers, without authentication or caching. The production image SHALL run as a non-root user and store SQLite data on a mounted volume. It SHALL include a verified native Stockfish binary and declare a container health check.

#### Scenario: Restart with a volume
- **WHEN** the container is restarted with the same data volume
- **THEN** accounts and sessions persist and the health check returns healthy

### Requirement: HB-006 Reference archives stay local
The research and design archives SHALL not be served when `APP_ORIGIN` is set, unless explicitly re-enabled. The interface SHALL hide links to them when they are not served.

#### Scenario: Hosted archive request
- **WHEN** a hosted visitor requests `/design/`
- **THEN** no archive content is served

### Requirement: HB-007 Deployment guide and honest status
The repository SHALL document settings, single-instance operation, backup and restore, proxy setup and later domain cut-over for the beta. It SHALL state which steps were verified and which were not. It MUST NOT claim a deployment, live model call or measured capacity that has not occurred.

#### Scenario: Operator follows the guide
- **WHEN** an operator prepares a host from `docs/deploy-beta.md`
- **THEN** the guide identifies required settings, backup steps and the unverified parts before testers are invited
