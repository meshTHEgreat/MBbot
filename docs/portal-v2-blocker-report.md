# Portal v2 build blocker report

Date: 2026-07-29

Branch: `portal-v2`

Blocked build-order step: 2 — Engine port + CI parity test

## Completed before the blocker

- Created the `portal-v2` branch from clean `main` at `181d030`.
- Added a hidden `/v2/index.html` holding path.
- Added a branch-only preview-artifact workflow. The repository's
  `github-pages` environment permits only `main`, so a branch Pages deployment
  is intentionally not used.
- The preview workflow checks out the latest `main` site, overlays only
  `/v2` and `/ui`, verifies the live `index.html` SHA-256 is unchanged, and
  uploads the complete preview as a seven-day Actions artifact.
- The current live `index.html` has not been modified.

## Missing transfer package

The MBbot workspace was searched for all four required Phase-2 artifacts. None
are present:

1. Phase-2 research engine modules.
2. Feature-store builder.
3. The 71-test Phase-2 suite.
4. X00 parity fixture.

No equivalent implementation was inferred from the legacy engine. Doing so
would change or guess backtest behavior, which this task forbids.

## Work intentionally not started

The authoritative build order requires the engine port and parity gate before
the remaining work. Therefore these later steps have not been started:

- Stage 0 window guard and Stage 5 honest-cost runner changes.
- Nine-stage stepper IA and `ui/config-dependencies.json`.
- Stages 2, 4, 6, and 7 runner wiring.
- Versioned new runner config schema and dual-schema transition.
- Stage 8 report additions.
- Full preview merge gate and atomic live cutover.

The control-to-engine mapping cannot be finalized until the transferred
engine's real parameter names and signatures can be inspected. Creating names
without the package would be an unverified interface and is intentionally
avoided.

## Exact unblock condition

Place the transfer package in this workspace with its provenance and expected
directory layout documented. The next build action is:

1. inspect the transferred modules and installed signatures;
2. port them without altering calculations;
3. run the supplied 71 tests;
4. add and pass X00 parity as a CI gate;
5. only then resume build-order step 3.
