# Portal v2 Step-4 engine blocker report

Date: 2026-07-30

Status: **BLOCKED before implementation**

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

## Blocking check

The Step-4 requirement is to wire Stages 2, 4, 6, and 7 to the transferred
Phase-2 engine without modifying backtest math.

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

## Why work stopped

Adding parameterized event formulas, inventing invalidation rules for five
families, or changing exit logic would be a behavioral engine change. That
would violate both:

- “Do not change backtest math in this task”; and
- the transfer rule requiring parity and a written erratum for behavioral
  changes.

Building the nine-stage controls without an executable contract would also
violate the specification's explicit warning that UI controls must not be
wired to nothing.

## Work deliberately not performed

- No Step-4 UI was merged or pushed.
- No `ui/config-dependencies.json` was created without a rendering consumer.
- No engine source, frozen tree, lock, fixture, or backtest math was edited.
- No GitHub Action was triggered after the user's no-Actions instruction.

The detailed control support matrix is in
`docs/portal-v2-control-to-engine-mapping.md`.

## Required unblock

Provide a research-side portal adapter/erratum covering the six family
definitions, family stops, runtime-vs-feature-store parameters, exit toggles,
result conversion, and parity fixtures listed in the mapping document. After
that package is verified, Step 4 can resume without guessing.
