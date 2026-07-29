# Portal v2 control-to-engine mapping

Date: 2026-07-30

This document maps the v3 portal controls to the code that currently executes
them. It is deliberately explicit about controls that the transferred Phase-2
engine does not expose. A UI control is not considered wired merely because a
matching constant exists in research configuration.

## Shipped safety controls

| Portal control | Request / runner mapping | Execution status |
| --- | --- | --- |
| Producing UI | `request_envelope.ui` → `RequestSafety.ui` → report tag and run receipt | Shipped for `classic` and `v2` |
| Discovery window | `window_preset=discovery` → `2026-04-27..2026-05-22` | Shipped and enforced before replay |
| Custom discovery | `window_preset=custom_discovery` plus dates, clamped to discovery | Shipped and enforced before replay |
| Holdout | `window_preset=holdout` plus acknowledgement → fixed `2026-05-26..2026-07-24` | Shipped; `HOLDOUT RUN` appears in the page state, report metadata, and run receipt |
| Reference commission | `commission_preset=reference` → `commission_per_contract=0.65` | Shipped |
| Stress commission | `commission_preset=stress` → `commission_per_contract=1.30` | Shipped |
| Zero commission | `commission_preset=zero` plus acknowledgement → `commission_per_contract=0` | Shipped; `ZERO-COST SIMULATION` appears in page and report metadata |
| Dual cost report | `commission_preset=both` | Not executable in the legacy report path; rejected honestly |

The public controls use `mbbot.backtest-control.request.v3`. The runner retains
v1 and v2 acceptance for queued and legacy requests.

## Phase-2 strategy controls

| Portal stage / control | Closest frozen-engine field or code | Support state |
| --- | --- | --- |
| Trigger family: trend persistence | `engine.run_family._family_events`, event `P1_primary` | Executable only as the frozen P1 definition; no portal request adapter exists |
| Fast MA snapshots | `engine.feature_store`: rolling 3 snapshots | Frozen at 3; not a runner parameter |
| Slow MA snapshots | `engine.feature_store`: rolling 12 snapshots | Frozen at 12; not a runner parameter |
| MA gap | `engine.run_family`: aligned gap `>= 0.15` | Frozen at 0.15%; not a runner parameter |
| Momentum window | Feature `underlying_return_15m_pct` | Frozen at 15 minutes; not a runner parameter |
| Momentum threshold | `engine.run_family`: aligned return `>= 0.10` | Frozen at 0.10%; not a runner parameter |
| Opening-range breakout | Research catalog screen events | Catalogued for research only; no executable `FamilyConfig` or family stop |
| Order-flow imbalance | Research catalog screen events | Catalogued for research only; no executable `FamilyConfig` or family stop |
| Premium-underlying divergence | Research catalog screen events | Catalogued for research only; no executable `FamilyConfig` or family stop |
| Mean-reversion fade | No executable family in `run_family.py` | Unsupported |
| Legacy MACD premium crossover | Legacy runner, not the Phase-2 family runner | Executable only through the classic legacy path |
| Trigger timeframe | `research-config.json.bar_minutes=5` and prebuilt feature store | Frozen at 5 minutes; changing it requires feature regeneration |
| Signal source | P1 feature rows use underlying snapshot features | Frozen and read-only |

`engine/run_family.py` constructs only three `FamilyConfig` instances:
`P1_primary`, `P1_A1_no_ma_gap`, and `P1_A2_no_momentum`. The latter two are
formal ablations, not additional trigger families.

## Contract selection

| Portal control | Closest engine field | Support state |
| --- | --- | --- |
| Target absolute Delta | `liquidity.target_absolute_delta` | Runtime-selected by `select_signal_candidates` |
| Delta acceptance band | `liquidity.minimum_absolute_delta` / `maximum_absolute_delta` | Applied while building `entry_eligible`; not dynamically adjustable against the frozen store |
| DTE range | `scope.minimum_dte` / `maximum_dte` | Applied while building the feature store; not dynamically adjustable |
| 0DTE | `scope.allow_zero_dte=false` | No runtime portal path; frozen store is scoped to 1–4 DTE |
| Expiration fallback / next-strike scan | No Phase-2 runtime control | Unsupported in the transferred family runner |
| IV source, Vega, Rho, OI, IV-rank | v2 dataset not transferred | Unavailable by dependency |

## Risk

| Portal control | Engine field | Support state |
| --- | --- | --- |
| Contracts per trade | `scope.contracts_per_trade` | Configuration constant; trade accounting is currently one contract |
| Max trades per symbol/day | `scope.maximum_trades_per_symbol_session` | Runtime-consumed |
| Re-entry cooldown | `scope.reentry_cooldown_minutes` | Runtime-consumed |
| SPY/QQQ same-direction exposure | `scope.same_direction_spy_qqq_single_exposure` | Runtime-consumed |

These values exist in the engine configuration, but the runner has no validated
portal request schema that passes them into a per-run configuration copy.

## Exits

| Portal control | Engine behavior | Support state |
| --- | --- | --- |
| Underlying invalidation | Family `invalidation_level_column`; P1 uses `underlying_slow_ma_60m` | Always evaluated when the level exists; no toggle |
| Friction-multiple profit target | `costs.minimum_profit_target_friction_multiple` | Always evaluated; runtime value exists |
| Legacy percent profit target | No Phase-2 implementation | Unsupported |
| Time stop | `scope.maximum_hold_minutes` | Always evaluated; runtime value exists |
| Forced 15:55 close | `scope.force_close` | Always evaluated |
| Premium-percent stop | No Phase-2 implementation | Unsupported |
| Opposite SMI exit | No Phase-2 implementation | Unsupported |
| Exit priority | Profit target → invalidation → time exit → forced close in `engine/fills.py` | Fixed; read-only |

The independently toggleable Stage-7 behavior in the portal specification
cannot be represented by the transferred `simulate_long_option_fill` API.

## Results

The transferred backtester already calculates:

- reference and stress cost summaries;
- mid-to-mid P&L;
- per-symbol summaries;
- MAE and MFE fields on each trade;
- exit reasons.

It emits `mbbot.phase2.backtest-result.v1`, while the Actions publication path
still consumes the legacy report input schema. A verified adapter is required
before these values can be published by the portal.

## Required engine-facing contract

Completing Step 4 without changing engine math requires a research-side
transfer or erratum that supplies:

1. an offline portal entrypoint with an explicit, versioned request schema;
2. executable definitions and invalidation levels for all six trigger
   families, or an authoritative declaration that some choices must remain
   disabled;
3. runtime-vs-feature-build classification for timeframe, Delta band, DTE, and
   every filter;
4. independent exit toggles and their exact priority semantics;
5. a converter from `mbbot.phase2.backtest-result.v1` to the report publisher's
   accepted input schema;
6. parity fixtures for every newly parameterized behavior.

Until that contract arrives, unsupported controls must remain absent or visibly
disabled. They must not be mapped to similar-looking legacy parameters.
