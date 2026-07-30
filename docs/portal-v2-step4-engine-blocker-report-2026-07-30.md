# Portal v2 Step-4 engine blocker report

Date: 2026-07-30

Status: **ENGINE-INDEPENDENT WORK COMPLETE LOCALLY; ADAPTER EXECUTION BLOCKED**

## Last completed milestone

Step B is live:

- runner `main`: `4f6f7807bb83ac1d2b711f64002da6e68130e9f4`;
- production gateway worker: `6e121aa4-c4dc-4a45-8667-cf0f56b4a01e`;
- public site: `806de4352f9b72034363d772f54c2116baa8acd8`;
- Pages deployment: run `30493065948`, successful;
- preview Lighthouse mobile: accessibility 100, performance 100;
- axe-core: zero violations and zero critical violations on classic and v2;
- holdout validation receipt: run `30487038727`, status `validated`,
  `ui=v2`, acknowledged holdout, and `HOLDOUT RUN` watermark;
- report-85 discovery regression: run `30483789762`, successful, 72 closed
  trades, net P&L 166.40, zero open positions, zero missing-data skips.

Classic and `/v2/` both remain live. No cutover or deprecation was performed.

## Current blocker

The nine-stage UI, dependency graph, versioned parameter envelope, and
results-display components are implemented without changing strategy math.
Execution of Stages 2, 4, 6, and 7 still requires the research-side,
parity-certified adapter package.

The transferred engine cannot currently represent the requested control
surface:

1. `engine/run_family.py` executes only P1 trend persistence and two P1
   ablations. Its 3/12 snapshots, 0.15% MA gap, and 0.10% 15-minute momentum
   threshold are source constants, not request parameters.
2. The remaining five trigger-family choices have no executable
   `FamilyConfig` plus family invalidation level. Catalog screen events are not
   an executable strategy family contract.
3. Delta band and DTE eligibility are materialized into the prebuilt feature
   store. Only target Delta is selected at runtime.
4. `engine/fills.py` always evaluates profit target, underlying invalidation,
   time exit, and forced close. It exposes no independent toggles, premium
   stop, legacy-percent target, or opposite-SMI exit.
5. The runner's strict v3 request envelope contains safety provenance only. It
   has no engine-parameter object.
6. The engine result schema is not connected to the existing report publisher.

## Why engine wiring remains stopped

Adding parameterized event formulas, inventing invalidation rules for five
families, or changing exit logic would be a behavioral engine change. That
would violate both:

- “Do not change backtest math in this task”; and
- the transfer rule requiring parity and a written erratum for behavioral
  changes.

The controls therefore emit a stubbed, versioned envelope for inspection while
the Queue action fails closed except for the explicitly labelled legacy MACD
compatibility route.

## Engine-independent work completed

- Nine APG tab/tabpanel stages with one open stage at a time.
- `ui/config-dependencies.json`, rendered by the portal with visible reasons,
  affects chips, and ripple highlighting.
- `ui/portal-engine-params-v1.schema.json` and a stub request builder.
- Stage 8 result components for dual costs, mid-to-mid P&L, MAE/MFE,
  per-symbol evidence, exit reasons, and the `n < 60` evidence flag.
- Holdout report watermark and run-log audit stamp in the envelope provenance.
- No engine source, frozen tree, lock, fixture, or backtest math was edited.
- No GitHub Action was triggered after the user's no-Actions instruction.

The detailed control support matrix is in
`docs/portal-v2-control-to-engine-mapping.md`.

## Required unblock

Install and verify the parity-certified research-side adapter covering the six
family definitions, family stops, runtime-vs-feature-store parameters, exit
toggles, result conversion, and parity fixtures listed in the mapping
document. Then connect Queue to the agreed CLI without changing the envelope
shape or strategy math.
