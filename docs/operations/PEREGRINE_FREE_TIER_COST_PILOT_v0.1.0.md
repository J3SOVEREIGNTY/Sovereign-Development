# Peregrine Free-Tier Cost Pilot v0.1.0

**Status:** Draft protocol; not measured and not approved for production use  
**Target:** less than USD 0.020 fully loaded cost per monthly active free IDE user  
**Repository:** Sovereign-Development  
**As of:** 2026-09-25

## Decision boundary

The gate is the fully loaded monthly cost per free monthly active user (MAU). Also report marginal cost per free MAU so the scale curve is visible; marginal cost does not replace the gate.

A free MAU is a distinct authenticated account whose current account tier is free and that starts at least one editor session during the UTC calendar month. The event endpoint derives a month-scoped HMAC of the Clerk user ID on the server. Raw user IDs, emails, project IDs, source files, paths, and error text are not emitted.

## Calculation

Fully loaded free-tier cost per MAU:

    (direct free-cohort variable spend
     + allocated shared product operating cost
     + WebContainer API license and usage fees)
    / distinct free MAU

Report the marginal variable-cost-per-MAU separately. Exclude internal labor from product COGS, but show it separately if useful. Include Vercel, Supabase, Cloudflare, AI provider usage, storage, network egress, email, monitoring, Stripe fees caused by free-tier activity, and every WebContainer charge. Use actual invoices or provider usage exports for the measurement period.

Allocate shared costs using a documented usage driver. If no defensible driver exists, report a conservative upper bound that assigns the full shared product cost to the free cohort; do not silently omit it. Split one-time setup fees from recurring run-rate.

## Pilot protocol

- Run one 30-day UTC measurement window in an isolated, invite-only pilot environment.
- Aim for at least 30 distinct free MAU and 100 valid editor-session events. Below either minimum, label results preliminary; do not claim the target is verified.
- Include low, typical, and heavy usage patterns within the published free-tier limits. Record those limits with the result.
- Require complete cost inputs for every provider in scope and reconcile each reported amount to an invoice, usage export, or signed license quote.
- Report the mean fully loaded cost per free MAU, marginal cost per free MAU, p50/p90 editor-session duration, npm install success rate, and percentage of sessions with accepted telemetry.
- The gate passes only if the complete fully loaded average is below USD 0.020, no provider or license cost is missing, and the telemetry capture rate is at least 95%. Report tail usage and any outliers; the average does not replace limits against abuse or exceptional consumption.

This pilot is an initial operating signal, not proof that costs remain below target at scale. Repeat at a materially larger cohort or validate provider pricing at the intended scale before widening the free tier.

## Instrumentation

The implementation in this branch emits one server log event per editor initialization when both pilot flags are enabled. It records elapsed time, npm install duration and exit code, outcome, app revision, UTC month, and a month-scoped HMAC actor key. The browser submits no code, file path, project identifier, email, or raw user ID. Only accounts currently marked free are logged. Event IDs support duplicate removal in analysis.

The event sink is Vercel runtime logs. The event route is disabled unless both COST_PILOT_ENABLED and NEXT_PUBLIC_COST_PILOT_ENABLED are set to true. The code change does not enable either flag or deploy anything. Count accepted event IDs from the server logs and reconcile against pilot sessions; the capture-rate threshold is 95%. Export only the minimum fields for analysis and delete the exported row-level pilot data after 30 days, subject to the provider's available retention controls.

This instrumentation does not estimate provider bills. Reconcile actual Vercel, Supabase, Cloudflare, AI, storage, egress, email, monitoring, Stripe, and WebContainer costs from provider-side billing evidence. Include the telemetry route and log retention in the measured cost.

## License gate

StackBlitz's current Commercial Usage page says a license is required for production use of the WebContainer API in a commercial, for-profit setting; prototypes and POCs are exempt. Its FAQ also mentions a nominal charge beyond 10,000 API requests per month, but does not provide a public price or make that threshold an explicit license exemption. Treat the commercial page as controlling until StackBlitz confirms otherwise in writing.

Production and customer-facing pilot use remains blocked until written terms answer: the license fee and billing unit; definition of an API request and the 10,000/month threshold; whether this use case and free-tier users are covered; trial/POC boundaries; rate limits; key issuance and rotation; and support/SLA. Configure the licensed API key before WebContainer.boot in production. Do not treat browser-side execution as eliminating the vendor license cost.

Official references:

- https://webcontainers.io/enterprise
- https://developer.stackblitz.com/guides/user-guide/general-faqs
- https://developer.stackblitz.com/platform/api/webcontainer-api

## Current evidence and blockers

- No cost result is recorded. The pilot has not run.
- The connected Vercel account returned no teams, so the project, deployment environment, and runtime logs cannot be inspected or configured here.
- The Peregrine Supabase project returned INACTIVE. The database cannot currently serve as a live pilot dependency without restoration and verification.
- No Cloudflare account controls were exposed in this workspace.
- The production migration remains open: key rotation, Vercel repointing, and auth, Stripe webhook, database, and collaboration smoke tests remain unverified.
- No WebContainer API price or signed license terms are publicly available in the sources above. The commercial-use requirement is clear; the price and negotiated scope remain unresolved pending written vendor terms.

## Evidence record

Fill this table from provider receipts after the pilot. Do not estimate missing invoice amounts as zero.

| Provider / cost bucket | Period | Amount (USD) | Evidence URL or receipt | Allocation method | Verified |
|---|---|---:|---|---|---|
| WebContainer license and usage | | | | Direct | |
| Vercel | | | | | |
| Supabase | | | | | |
| Cloudflare | | | | | |
| AI providers | | | | | |
| Storage, egress, email, monitoring | | | | | |
| Other direct product costs | | | | | |

## Release decision

Record the final sample size, event count, capture rate, free MAU, total cost, fully loaded cost per free MAU, marginal cost per free MAU, p50/p90 use, license state, missing evidence, reviewer, and decision. The status stays NOT VERIFIED until the cost and licensing gates pass with receipts.
