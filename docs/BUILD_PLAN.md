# SubRadar Build Plan

## Build Strategy

SubRadar is implemented as a full monorepo from day one, with security and local data ownership built before the richer product intelligence layers.

The first working app is mobile-first and uses Expo SDK 56 development builds. Expo Go is not the primary target because SQLCipher, secure native configuration, biometrics, and production notifications require native config plugins and development builds.

## Monorepo Layout

- `apps/mobile`: Expo React Native app with Expo Router.
- `apps/api`: Fastify API skeleton for account, auth, service catalog, and sync contracts.
- `apps/web`: Next.js App Router scaffold for landing and SEO cancellation guide pages.
- `packages/shared`: API envelope, domain types, schemas, constants, and data helpers.
- `packages/service-catalog`: seed service database and search helpers.
- `WORKLOG.md`: mandatory implementation log updated every chunk.

## Phase 0: Repo + Worklog

- Initialize npm workspaces and Git.
- Add root TypeScript, test, lint, and environment files.
- Add build plan and PRD traceability docs.
- Keep `WORKLOG.md` updated before and after each chunk.

## Phase 1: Full Monorepo Scaffold

- Scaffold mobile, API, web, shared types, and service catalog.
- Use TypeScript across all workspaces.
- Keep provider integrations behind adapters with mock/dev implementations.

## Phase 2: Security Core First

- Store secrets in SecureStore, not AsyncStorage.
- Use SQLCipher-capable `expo-sqlite` config for local financial data.
- Implement biometric/PIN lock architecture.
- Keep subscription and transaction data local by default.
- Add API auth skeleton without sending financial records to the server.

## Phase 3: Local Data + Import Foundation

- Create local entities for subscriptions, services, renewal events, notification preferences, user profile, imports, sync outbox, and audit events.
- Implement manual CRUD.
- Add recurring charge detection for CSV imports using merchant normalization, amount tolerance, and cadence detection.
- Discard raw CSV contents after parsing.

## Phase 4: MVP UX

- Build the Clarity theme first.
- Add onboarding, dashboard, add subscription, detail, renewal calendar, settings/security, and paywall skeleton.
- Prepare theme architecture for Pulse and Command.
- Add day-of reminder scheduling logic.

## Later Phases

- Phase 5 adds Pulse and Command themes, 7-day/3-day alerts, cancellation links/guides, Gmail scanning prototype, and basic AI coaching.
- Phase 6 adds Plaid/MX, full AI coaching, Spend Twin, Family Vault, widgets, SEO pages, and public API.

## Verification Gates

- `npm.cmd install`
- `npm.cmd run typecheck`
- `npm.cmd test`
- Mobile dev-build launch check when Android/iOS runtime is available.
- API `/health` and `/api/v1/health` response check.

