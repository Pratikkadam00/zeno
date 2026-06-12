# PRD Traceability

This file maps the PRD v1.0 requirements into implementation phases so nothing is lost.

## P0 Foundation

| PRD Area | Requirement | Implementation Location | Status |
| --- | --- | --- | --- |
| Tech stack | React Native + Expo | `apps/mobile` | Started |
| Tech stack | Fastify API | `apps/api` | Started |
| Tech stack | Next.js web | `apps/web` | Started |
| API principles | `/api/v1`, `{ data, error, meta }` envelope | `packages/shared`, `apps/api` | Started |
| Security | Local encrypted SQLite | `apps/mobile/src/security`, app config | Started |
| Security | Secure token storage | `apps/mobile/src/security/secure-store.ts` | Started |
| Security | Biometric/PIN lock | `apps/mobile/src/security/app-lock.ts` | Started |
| Manual entry | Smart suggestions from services database | `packages/service-catalog`, mobile add flow | Started |
| Renewal radar | Day-of local reminders | `apps/mobile/src/notifications` | Started |
| Theme | Clarity first | `apps/mobile/src/theme` | Started |
| Worklog | Always update worklog | `WORKLOG.md` | Active |

## P1 Differentiation

| PRD Area | Requirement | Planned Location | Status |
| --- | --- | --- | --- |
| Email scanning | Gmail/Outlook/Apple/Yahoo/Proton read-only scan | `apps/mobile/src/discovery/email` | Planned |
| CSV import | Bank CSV recurring charge parser | `packages/shared/src/csv` | Started |
| Renewal radar | 7-day and 3-day notifications | `apps/mobile/src/notifications` | Planned |
| Themes | Pulse and Command | `apps/mobile/src/theme` | Planned |
| Cancellation | Top 50 service guides and deep-links | `packages/service-catalog` | Planned |
| AI coach | Basic categorization and spend summary | `apps/mobile/src/coach` | Planned |

## Phase 5 Differentiation Progress

| PRD Area | Requirement | Implementation Location | Status |
| --- | --- | --- | --- |
| Subscription DB | Top-50 launch catalog | `packages/service-catalog` | Started |
| Renewal radar | 7-day, 3-day, day-of reminder plan | `packages/shared/src/notifications`, `apps/mobile/src/notifications` | Started |
| Email scanning | On-device receipt candidate parser | `packages/shared/src/discovery`, `apps/mobile/src/discovery` | Started |
| AI coach | Categorization, benchmarks, annual savings, spend twin | `packages/shared/src/spend`, `apps/mobile/app/coach.tsx` | Started |
| Web SEO | Static cancellation guide pages for launch catalog | `apps/web/app/cancel/[slug]` | Started |
| API | Service detail and capability endpoints | `apps/api/src/app.ts` | Started |

## P2 Intelligence + Scale

| PRD Area | Requirement | Planned Location | Status |
| --- | --- | --- | --- |
| Open banking | Plaid/MX read-only OAuth | `apps/api/src/providers`, mobile connect flow | Planned |
| AI coach | Unused, duplicate, annual-vs-monthly insights | `apps/api/src/coach`, mobile coach UI | Planned |
| Spend Twin | Lifestyle comparisons | `apps/mobile/src/spend-twin` | Planned |
| Family Vault | Family subscriptions | `apps/mobile/src/family`, API account contracts | Planned |
| SEO | Cancellation guide pages | `apps/web/app/cancel/[slug]` | Planned |
| Widgets | Android/iOS widgets, Watch | Native app extensions | Planned |

## Phase 6 Intelligence + Scale Progress

| PRD Area | Requirement | Implementation Location | Status |
| --- | --- | --- | --- |
| Open banking | Plaid/MX read-only OAuth | `packages/shared/src/finance`, `apps/api/src/app.ts`, `apps/mobile/app/open-banking.tsx` | Started |
| Spend Twin | Lifestyle comparisons | `packages/shared/src/spend/twin.ts`, `apps/mobile/app/spend-twin.tsx` | Started |
| Family Vault | Family subscriptions | `packages/shared/src/family/vault.ts`, `apps/mobile/app/family.tsx` | Started |
| Analytics | Full analytics dashboard foundation | `packages/shared/src/insights/analytics.ts`, `apps/mobile/app/analytics.tsx` | Started |
| Web SEO | Feature pages for Phase 6 hooks | `apps/web/app/features/*` | Started |

## Scale Foundation Progress

| PRD Area | Requirement | Implementation Location | Status |
| --- | --- | --- | --- |
| Widgets | Android widget + iOS widget data model | `packages/shared/src/widgets`, `apps/mobile/app/widgets.tsx` | Started |
| Watch | Apple Watch complication payload | `packages/shared/src/widgets/snapshot.ts` | Started |
| Business tier | Team subscriptions and seats | `packages/shared/src/scale/business.ts`, `apps/mobile/app/business.tsx` | Started |
| Public API | Power-user scoped API key model | `packages/shared/src/public-api/keys.ts`, `apps/web/app/developers` | Started |
| Partners | Partner integration manifests | `packages/shared/src/integrations/partners.ts`, `apps/web/app/partners` | Started |
| API | Scale foundation endpoints | `apps/api/src/app.ts` | Started |

## Non-Negotiable Security Constraints

- Financial data is stored locally by default.
- Raw CSV contents are not persisted after import.
- OAuth tokens live in platform secure storage.
- API contracts must not accept subscription transaction payloads until sync encryption is implemented.
- Provider secrets are never committed.
