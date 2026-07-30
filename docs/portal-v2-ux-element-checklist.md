# Portal v2 UX element checklist

This checklist records the 2026-07-30 truthfulness and guided-flow pass.
The state model is declared in `ui/config-dependencies.json`; the UI does not
invent route or dependency state outside that graph.

State terms:

- **Effective** — the active runner consumes the value.
- **Adapter-editable** — saved to `portal-engine-params.v1`, but cannot affect
  a queued run until the adapter connects.
- **Adapter-locked** — visible and read-only on the legacy route, with the
  legacy-effective value and cause shown.
- **Intrinsic read-only** — explanatory output, never a user choice.
- **Dependency-locked** — visible and read-only because another named choice
  makes it unavailable.
- **Acknowledged** — editable only after an explicit warning interaction.

| Element | Stage | State model | Fix applied |
|---|---:|---|---|
| Dataset (`dataset_version`) | 0 | Effective on legacy; adapter-editable otherwise | Added accessible state marker, affected-control chips, and explicit unavailable-v2 reason. |
| Window preset (`window_preset`) | 0 | Effective; holdout is acknowledged | Preserved discovery/custom/holdout choices; linked state marker, burn dialog, watermark, and run-log stamp. |
| Holdout acknowledgement (`burn-ack`) | 0 | Acknowledged; only active in the holdout dialog | Added warning-state marker and explicit checkbox gate in the ARIA alertdialog. |
| Start date (`start_date`) | 0 | Effective only for Custom; dependency-locked for presets | Keeps the actual preset dates visible and names Window preset as the locking cause. |
| End date (`end_date`) | 0 | Effective only for Custom; dependency-locked for presets | Keeps the actual preset dates visible and names Window preset as the locking cause. |
| Symbols (`symbol_combobox`) | 0 | Effective on legacy; adapter-editable otherwise | Added route marker, accessible group description, and robustness helper. |
| Family regime rule (`regime-rule-card`) | 1 | Intrinsic read-only | Optional default view now states the exact family-supplied rule or that none exists. |
| Warm-up requirement (`warmup_requirement`) | 1 | Intrinsic read-only | Added live session/bar conversion and a read-only state marker. |
| Trigger family (`trigger_family`) | 2 | Effective route selector | Now drives the complete mode model, persistent route banner, affected-control ripple, and review honesty. |
| Trigger timeframe (`trigger_timeframe_minutes`) | 2 | Adapter-editable; adapter-locked on legacy | Legacy route now shows the actual fixed five-minute value and why editing is unavailable. |
| Execution timeframe (`execution_timeframe`) | 2 | Intrinsic read-only | Keeps the one-minute execution rule visible with a read-only marker. |
| Signal price source (`signal_price_source`) | 2 | Intrinsic read-only, family-derived | Names Trigger family as its cause and displays the exact underlying/premium source. |
| Fast MA snapshots (`fast_ma_snapshots`) | 2 | Adapter-editable; adapter-locked on legacy | Route marker and family dependency now prevent implying that it changes a legacy run. |
| Slow MA snapshots (`slow_ma_snapshots`) | 2 | Adapter-editable; adapter-locked on legacy | Route marker and family dependency now prevent implying that it changes a legacy run. |
| MA gap (`ma_gap_percent`) | 2 | Adapter-editable; adapter-locked on legacy | Added plain-language units, state marker, and family-driven availability. |
| Momentum window (`momentum_window_minutes`) | 2 | Adapter-editable; adapter-locked on legacy | Added converted-time summary and family-driven availability. |
| Momentum threshold (`momentum_percent`) | 2 | Adapter-editable; adapter-locked on legacy | Added plain-language units and family-driven availability. |
| Opening range (`orb_range_minutes`) | 2 | Adapter-editable; adapter-locked on legacy | Visible only for the matching family through the dependency graph, with route marker. |
| Breakout buffer (`orb_buffer_percent`) | 2 | Adapter-editable; adapter-locked on legacy | Visible only for the matching family through the dependency graph, with route marker. |
| ORB regime (`orb_regime_enabled`) | 2 | Adapter-editable; adapter-locked on legacy | Switch has an accessible state marker and family cause. |
| Order-flow window (`order_flow_window_bars`) | 2 | Adapter-editable; adapter-locked on legacy | Added exact rolling-bar wording and route/family state. |
| Order-flow threshold (`order_flow_threshold`) | 2 | Adapter-editable; adapter-locked on legacy | Added formula wording and route/family state. |
| Underlying agreement (`order_flow_underlying_agreement`) | 2 | Adapter-editable; adapter-locked on legacy | Switch now states that it is a family parameter, not a live legacy filter. |
| Underlying velocity minimum (`divergence_underlying_velocity_min`) | 2 | Adapter-editable; adapter-locked on legacy | Added units, family cause, and route marker. |
| Premium velocity maximum (`divergence_premium_velocity_max`) | 2 | Adapter-editable; adapter-locked on legacy | Added Delta-implied comparison wording, family cause, and route marker. |
| Divergence window (`divergence_window_minutes`) | 2 | Adapter-editable; adapter-locked on legacy | Added exact time units, family cause, and route marker. |
| Mean-reversion RSI period (`mean_reversion_rsi_period`) | 2 | Adapter-editable; adapter-locked on legacy | Ingredient is nested under its family and clearly tagged as adapter-only. |
| Mean-reversion RSI extreme (`mean_reversion_rsi_extreme`) | 2 | Adapter-editable; adapter-locked on legacy | Ingredient is nested under its family and clearly tagged as adapter-only. |
| Reversal confirmation (`mean_reversion_reversal_confirm`) | 2 | Adapter-editable; adapter-locked on legacy | Switch now shows its route and family state. |
| Legacy fast EMA (`legacy_macd_fast`) | 2 | Adapter-locked, fixed 12 | Removed false editability; shows “legacy runs use 12.” |
| Legacy slow EMA (`legacy_macd_slow`) | 2 | Adapter-locked, fixed 26 | Removed false editability; shows “legacy runs use 26.” |
| Legacy signal EMA (`legacy_macd_signal`) | 2 | Adapter-locked, fixed 9 | Removed false editability; shows “legacy runs use 9.” |
| Spread cap (`spread_cap_percent`) | 3 | Adapter-editable; adapter-locked at actual legacy 50% | Replaced misleading editable 10% on legacy with the real 50% value and warning. |
| Spread denominator (`spread_denominator`) | 3 | Adapter-editable; adapter-locked on legacy | Keeps semantics visible and names the route cause. |
| Premium floor (`premium_floor`) | 3 | Adapter-editable; adapter-locked at actual legacy $0 | Shows the legacy-effective value rather than the adapter default. |
| Premium cap (`premium_cap`) | 3 | Adapter-editable; adapter-locked at actual legacy $4 | Shows the legacy-effective value rather than the adapter default. |
| Valid NBBO (`valid_nbbo_required`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Shows the legacy-effective state and prevents false filter claims. |
| Quote freshness (`quote_freshness`) | 3 | Intrinsic read-only | Wrapped the one-minute snapshot rule in a labelled read-only card. |
| RSI gate (`rsi_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible and truthfully unavailable on legacy. |
| SMI gate (`smi_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible; its downstream exit cause is graph-driven. |
| Momentum gate (`momentum_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible and truthfully unavailable on legacy. |
| Velocity gate (`velocity_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible and truthfully unavailable on legacy. |
| Activity gate (`activity_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible and truthfully unavailable on legacy. |
| Trade-side gate (`trade_side_gate_enabled`) | 3 | Adapter-editable; adapter-locked at actual legacy off | Optional veto remains visible and truthfully unavailable on legacy. |
| Minimum Delta (`delta_minimum`) | 4 | Adapter-editable; adapter-locked on legacy | Paired numeric input remains visible with the adapter-only reason. |
| Target Delta (`delta_target`) | 4 | Adapter-editable; adapter-locked on legacy | Added exact target wording and route marker. |
| Maximum Delta (`delta_maximum`) | 4 | Adapter-editable; adapter-locked on legacy | Paired numeric input remains visible with the adapter-only reason. |
| Delta touch sliders (`delta_slider_pair`) | 4 | Adapter-editable; adapter-locked on legacy | Retained two-thumb ARIA behavior plus precise paired numeric inputs. |
| Minimum DTE (`dte_minimum`) | 4 | Adapter-editable; adapter-locked on legacy | Shows the configured value without implying that legacy consumes it. |
| Maximum DTE (`dte_maximum`) | 4 | Adapter-editable; adapter-locked on legacy | Shows the configured value without implying that legacy consumes it. |
| 0DTE (`allow_zero_dte`) | 4 | Adapter-editable with warning; adapter-locked on legacy | Prevents toggling when ignored and preserves the outside-scope stamp when effective. |
| Expiration fallback (`expiration_fallback`) | 4 | Adapter-editable; adapter-locked on legacy | Switch remains visible with its route state. |
| Next-strike scan (`next_strike_scan`) | 4 | Adapter-editable; adapter-locked on legacy | Switch remains visible with its route state. |
| IV source (`iv_source`) | 4 | Dependency-locked by Dataset v1; adapter-only | Visible with “needs v2” reason instead of being hidden. |
| Vega filter (`vega_filter`) | 4 | Dependency-locked by Dataset v1; adapter-only | Visible with “needs v2” reason instead of being hidden. |
| Rho filter (`rho_filter`) | 4 | Dependency-locked by Dataset v1; adapter-only | Visible with “needs v2” reason instead of being hidden. |
| Open-interest minimum (`open_interest_minimum`) | 4 | Dependency-locked by Dataset v1; adapter-only | Visible with “needs v2” reason instead of being hidden. |
| IV-rank gate (`iv_rank_gate`) | 4 | Dependency-locked by Dataset v1; adapter-only | Visible with “needs v2” reason instead of being hidden. |
| Commission preset (`commission_preset`) | 5 | Effective on legacy and adapter routes | Cost state, acknowledgements, sentence, review, and stamps now update together. |
| Both-cost option (`commission-both`) | 5 | Dependency-locked on legacy; adapter-editable otherwise | Disabled at selection time with a visible adapter-required reason. |
| Unrealistic-cost acknowledgement (`unrealistic_costs_acknowledged`) | 5 | Acknowledged; effective with zero cost | Zero cost cannot validate until deliberately acknowledged; watermark persists. |
| Fill model (`fill_model`) | 5 | Intrinsic read-only | Exact buy-ask/sell-bid rule stays visible with read-only marker. |
| Experiment label (`experiment-label`) | 5 | Effective | Added queue-effective marker and validated-request invalidation on edit. |
| Contracts per trade (`contracts_per_trade`) | 6 | Adapter-editable; adapter-locked at actual legacy 1 | Shows the legacy-effective value and route cause. |
| Daily trade cap (`maximum_trades_per_symbol_day`) | 6 | Adapter-editable; adapter-locked on legacy | Shows the legacy-effective value and route cause. |
| Re-entry cooldown (`reentry_cooldown_minutes`) | 6 | Adapter-editable; adapter-locked on legacy | Shows the legacy-effective value and route cause. |
| Correlated-exposure rule (`same_direction_spy_qqq_single_exposure`) | 6 | Adapter-editable; adapter-locked on legacy | Switch remains visible with the actual legacy state. |
| Underlying invalidation (`invalidation_stop_enabled`) | 7 | Adapter-editable; adapter-locked at actual legacy off | Prevents implying that the legacy runner consumes the toggle. |
| Invalidation formula (`invalidation_formula`) | 7 | Intrinsic read-only, family-derived | Displays the exact family formula and the Trigger family cause. |
| Profit target (`profit_target_enabled`) | 7 | Adapter-editable; adapter-locked at actual legacy on | Keeps the legacy-effective state visible. |
| Profit mode (`profit_target_mode`) | 7 | Adapter-editable; adapter-locked at actual legacy percent | Shows the mode actually used by legacy. |
| Friction multiple (`profit_friction_multiple`) | 7 | Adapter-editable; adapter-locked on legacy | Remains visible without suggesting legacy consumes it. |
| Legacy profit target (`profit_legacy_percent`) | 7 | Adapter-editable; adapter-locked at actual legacy 20% | Shows the legacy-effective target. |
| Time stop (`time_stop_enabled`) | 7 | Adapter-editable; adapter-locked at actual legacy on | Keeps the legacy-effective state visible. |
| Time-stop minutes (`time_stop_minutes`) | 7 | Adapter-editable; adapter-locked at actual legacy 60 | Shows the legacy-effective duration. |
| Forced EOD close (`forced_eod_close`) | 7 | Intrinsic read-only, always on | Marked as mandatory rather than presenting a false switch. |
| Premium stop (`premium_stop_enabled`) | 7 | Adapter-editable; adapter-locked at actual legacy on | Shows the real legacy behavior and retains the noise warning. |
| Premium stop percent (`premium_stop_percent`) | 7 | Adapter-editable; adapter-locked at actual legacy 10% | Shows the real legacy threshold. |
| Opposite SMI exit (`opposite_smi_exit`) | 7 | Dependency-locked until SMI gate; adapter-only | Visible at all times with SMI gate named as the cause. |
| Exit priority (`exit_priority`) | 7 | Intrinsic read-only | Exact priority is visible and never masquerades as a choice. |
| Runner access key (`runner-access-key`) | 8 | Effective only on a queueable route | Moved to Review & Run; locked with adapter-pending reason on nonqueueable families. |

## Stage-level interaction elements

| Element | Stage | State model | Fix applied |
|---|---:|---|---|
| Optional default shell | 1, 3, 4, 6, 7 | “Using defaults” never blocks validation | Added exact default summary, Customize, and Reset to defaults. |
| State legend | Global | Always visible | Added accessible text for ✅ effective, 🟡 adapter-only, 🔒 unavailable, and ⚠ acknowledgement. |
| Route banner | Global and 8 | Persistent, family-derived | Announces queue-effective legacy or envelope-only adapter-pending mode. |
| Stage stepper | 0–8 | APG tabs; free navigation | Added required/optional subtext, validity names, arrow/Home/End behavior, and stable focus. |
| Next buttons | 0–7 | Stage progression only | Added real buttons; Enter advances and focus moves to the next panel heading. |
| Review table | 8 | Effective versus ignored | Added one row per prior stage, muted ignored rows, adapter-only tags, and Edit links. |
| Config sentence and SHA | 8 | Exact current request | Added effective legacy sentence/SHA or adapter envelope sentence/SHA with provenance. |
| Audit stamps | 8 | Conditional and persistent | Holdout, zero-cost, dual-cost, outside-scope, and legacy-baseline stamps reflect the graph. |
| Validate only | 8 | Local, exact-request gate | Any configuration edit invalidates; access-key typing does not alter request bytes. |
| Queue backtest | 8 | Enabled only for the validated queueable request | Remains disabled for adapter-pending families and is the only run-starting control. |
