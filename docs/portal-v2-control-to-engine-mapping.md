# Portal v2 control-to-engine mapping

Date: 2026-07-30

The guided portal emits `mbbot.portal.engine-params.v1`. The private runner
validates that exact envelope and invokes:

```text
python -m portal_engine.cli --request request.json --out-dir DIR
```

For `v2-year`, the runner additionally supplies the certified Windows dataset
configuration with `--dataset-config`. Legacy MACD continues through the
unchanged compatibility engine. A setting is editable only when its active
route consumes it.

## Data, safety, and provenance

| Portal control | Request mapping | Effective behavior |
| --- | --- | --- |
| Dataset v1 | `provenance.dataset=v1`, workflow profile `portal-adapter-v1-study` | Frozen three-month study archive |
| Dataset v2 | `provenance.dataset=v2-year`, `dataset_label=v2-year`, workflow profile `portal-adapter-v2-year` | Certified year archive and feature store selected only through `--dataset-config`; current session count comes from the capability manifest |
| Recommended discovery | `window`, `provenance.window_preset=discovery` | v1: reusable four-week block, 2026-04-27..2026-05-22; v2-year: reusable ten-month block, 2025-07-25..2026-05-22 |
| Custom dates inside recommended | `window`, `window_preset=custom_discovery` | Dates remain clamped inside the selected dataset’s reusable discovery boundary |
| All available data | `window`, `window_preset=all` | Starts at the dataset’s first discovery session and ends at the capability manifest’s latest session; protected, so acknowledgement, `HOLDOUT RUN`, and the burn log stamp are mandatory |
| Validation | v2 `2026-05-26..2026-06-26` plus acknowledgement | Protected; `HOLDOUT RUN` watermark and `holdout_burn_acknowledged=true` run-log stamp |
| Holdout | Capability receipt’s holdout start/end plus acknowledgement | Protected and refreshed from the runner capability manifest; never hard-coded in the browser or runner policy |
| Symbols | `symbols[]` | Exact selected symbols; single names remain robustness-only evidence |
| Producing UI | `provenance.ui=v2` | Stored in the request, report, and unified index |
| Request identity | canonical JSON SHA-256 | Validation binds Queue to the exact request; any edit invalidates it |

## Strategy parameters

| Stage / control | `portal-engine-params.v1` field | Adapter behavior |
| --- | --- | --- |
| Trend persistence | `family=trend_persistence`, `trigger.fast_ma_snapshots`, `slow_ma_snapshots`, `ma_gap_min_pct`, `momentum_minutes`, `momentum_min_pct` | Queue-effective |
| Opening-range breakout | `family=opening_range_breakout`, `trigger.range_minutes`, `buffer_pct`, `regime_filter_enabled`, `regime_max_width_vs_prior5` | Queue-effective |
| Order-flow imbalance | `family=orderflow_imbalance`, `trigger.window_bars`, `imbalance_threshold`, `require_underlying_agreement` | Queue-effective; result is explicitly no-fuel-labeled while classified tick volume is zero |
| Premium/underlying divergence | `family=premium_underlying_divergence`, `trigger.underlying_velocity_min_pct_per_minute`, `premium_velocity_max_pct_per_minute`, `window_minutes` | Queue-effective |
| Mean-reversion fade | `family=mean_reversion_fade`, `trigger.rsi_period`, `rsi_extreme`, `require_reversal_bar` | Queue-effective |
| Legacy MACD | legacy flat workflow inputs | Queue-effective only through the compatibility runner; adapter-only controls are locked |
| Trigger timeframe | fixed five-minute completed bars | Read-only because the certified feature store is five-minute |
| Signal source | family-defined underlying or option evidence | Read-only |

## Contract, liquidity, risk, exits, and costs

| Portal control | Envelope field | Effective behavior |
| --- | --- | --- |
| Delta target/band | `delta_band.target`, `minimum`, `maximum` | Runtime adapter selection |
| DTE | `dte_range.minimum`, `maximum` | Certified 1–4 DTE by default; 0DTE carries `OUTSIDE PREREGISTERED SCOPE` |
| Entry window | `session_window.entry_start`, `entry_end` | Inclusive start, exclusive end |
| Spread cap | `liquidity.maximum_relative_spread_percent` | Midpoint denominator; explicit warnings remain audit UI |
| Premium floor | `liquidity.minimum_midpoint` | Applied by adapter |
| Valid NBBO | `liquidity.require_valid_nbbo` | Applied by adapter |
| Contracts/trade | `risk.contracts_per_trade` | Certified default is 1 |
| Max trades/symbol/day | `risk.maximum_trades_per_symbol_session` | Certified default is 3 |
| Re-entry cooldown | `risk.reentry_cooldown_minutes` | Certified default is 30 |
| SPY/QQQ correlated exposure | `risk.correlated_exposure_skip` | Certified default is enabled |
| Invalidation | `exits.invalidation_enabled` | Formula is fixed by family |
| Profit target | `exits.profit_target_mode`, `profit_target_friction_multiple`, `profit_target_percent` | Certified default is 3× friction |
| Time stop | `exits.time_stop_minutes` | Certified default is 60 minutes |
| Forced close | runner constant | Fixed at 15:55 ET |
| Commission | `costs.commission_per_contract_per_side` | Reference $0.65, stress $1.30, or acknowledged zero |
| Dual report | `provenance.commission_preset=both` with primary cost $0.65 | Adapter always emits reference and stress result columns; audit stamp is `DUAL-COST REPORT` |

Controls not represented by the certified schema remain visible and read-only:
indicator veto gates, expiration fallback, next-strike scan, IV source,
Vega/Rho/OI/IV-rank filters, legacy percent targets/stops, opposite-SMI exit,
and a configurable exit priority. They never imply an effect on a real run.

## Result publication

The adapter emits and the v2 publisher surfaces:

- reference and stress cost columns;
- mid-to-mid P&L with the pre-friction explanation;
- MAE and MFE;
- per-symbol and exit-reason tables;
- an insufficient-evidence marker when `n < 60`;
- `ui: v2`, `dataset_label`, canonical request SHA-256, watermarks, and
  run-log stamps.

Reports publish under `/v2/reports/` and are also appended to the shared
`reports/report-index.md` and `data/manifest.json` with both UI and dataset
columns.
