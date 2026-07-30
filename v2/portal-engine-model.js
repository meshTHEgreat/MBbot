(function initPortalEngineModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.MBbotPortalEngineModel = api;
  }
})(typeof globalThis === "object" ? globalThis : this, function createModel() {
  "use strict";

  const SCHEMA_VERSION = "portal-engine-params.v1";
  const ADAPTER_COMMAND =
    "python -m portal_engine.cli --request request.json --out-dir DIR";
  const FAMILY_SOURCES = Object.freeze({
    trend_persistence: "UNDERLYING snapshot price",
    opening_range_breakout: "UNDERLYING snapshot price",
    order_flow_imbalance: "OPTION trade flow plus underlying agreement",
    premium_underlying_divergence:
      "UNDERLYING and OPTION premium snapshots",
    mean_reversion_fade: "UNDERLYING snapshot price",
    legacy_macd: "OPTION premium",
  });
  const COMMISSIONS = Object.freeze({
    reference: 0.65,
    stress: 1.3,
    both: Object.freeze([0.65, 1.3]),
    zero: 0,
  });

  function inputError(message, field) {
    const error = new Error(message);
    error.field = field || null;
    return error;
  }

  function number(values, name, minimum, maximum, integer = false) {
    const parsed = Number(values[name]);
    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      parsed > maximum ||
      (integer && !Number.isInteger(parsed))
    ) {
      throw inputError(
        `${name.replaceAll("_", " ")} must be ${
          integer ? "a whole number" : "a number"
        } from ${minimum} through ${maximum}.`,
        name,
      );
    }
    return parsed;
  }

  function optionalNumber(values, name, minimum, maximum) {
    const raw = values[name];
    if (raw === "" || raw === null || raw === undefined) return null;
    return number(values, name, minimum, maximum);
  }

  function selectedSymbols(values) {
    const symbols = Array.isArray(values.symbols)
      ? values.symbols
      : [values.symbols].filter(Boolean);
    const allowed = new Set(["SPY", "QQQ", "AAPL", "NVDA", "TSLA"]);
    const result = [...new Set(symbols.map((value) => String(value)))];
    if (!result.length || result.some((symbol) => !allowed.has(symbol))) {
      throw inputError("Choose at least one available symbol.", "symbols");
    }
    return result;
  }

  function isoDate(values, name) {
    const value = String(values[name] || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw inputError(`${name.replaceAll("_", " ")} is invalid.`, name);
    }
    return value;
  }

  function familyParameters(values, family) {
    if (family === "trend_persistence") {
      return {
        fast_ma_snapshots: number(values, "fast_ma_snapshots", 1, 240, true),
        slow_ma_snapshots: number(values, "slow_ma_snapshots", 2, 500, true),
        ma_gap_percent: number(values, "ma_gap_percent", 0, 100),
        momentum_window_minutes: number(
          values,
          "momentum_window_minutes",
          1,
          390,
          true,
        ),
        momentum_percent: number(values, "momentum_percent", 0, 100),
      };
    }
    if (family === "opening_range_breakout") {
      return {
        range_minutes: number(values, "orb_range_minutes", 1, 180, true),
        buffer_percent: number(values, "orb_buffer_percent", 0, 100),
        regime_enabled: Boolean(values.orb_regime_enabled),
      };
    }
    if (family === "order_flow_imbalance") {
      return {
        rolling_window_bars: number(
          values,
          "order_flow_window_bars",
          1,
          240,
          true,
        ),
        buy_minus_sell_share_threshold: number(
          values,
          "order_flow_threshold",
          -1,
          1,
        ),
        underlying_agreement: Boolean(values.order_flow_underlying_agreement),
      };
    }
    if (family === "premium_underlying_divergence") {
      return {
        underlying_velocity_minimum: number(
          values,
          "divergence_underlying_velocity_min",
          -100,
          100,
        ),
        premium_velocity_maximum_vs_delta_implied: number(
          values,
          "divergence_premium_velocity_max",
          -100,
          100,
        ),
        window_minutes: number(
          values,
          "divergence_window_minutes",
          1,
          390,
          true,
        ),
      };
    }
    if (family === "mean_reversion_fade") {
      return {
        rsi_period: number(values, "mean_reversion_rsi_period", 1, 240, true),
        rsi_extreme: number(values, "mean_reversion_rsi_extreme", 0, 100),
        reversal_bar_confirmation: Boolean(
          values.mean_reversion_reversal_confirm,
        ),
      };
    }
    if (family === "legacy_macd") {
      return {
        fast_period: number(values, "legacy_macd_fast", 1, 240, true),
        slow_period: number(values, "legacy_macd_slow", 2, 500, true),
        signal_period: number(values, "legacy_macd_signal", 1, 240, true),
        comparison_only: true,
      };
    }
    throw inputError("Choose a supported trigger family.", "trigger_family");
  }

  function gate(values, name) {
    return { enabled: Boolean(values[name]) };
  }

  function buildEnvelope(values) {
    if (!values || typeof values !== "object") {
      throw inputError("Portal engine settings are missing.");
    }
    const family = String(values.trigger_family || "");
    if (!Object.hasOwn(FAMILY_SOURCES, family)) {
      throw inputError("Choose a supported trigger family.", "trigger_family");
    }
    const windowPreset = String(values.window_preset || "");
    if (!["discovery", "custom_discovery", "holdout"].includes(windowPreset)) {
      throw inputError("Choose a supported window preset.", "window_preset");
    }
    const startDate = isoDate(values, "start_date");
    const endDate = isoDate(values, "end_date");
    if (startDate > endDate) {
      throw inputError("Start date cannot be later than end date.", "start_date");
    }
    if (
      windowPreset === "holdout" &&
      !Boolean(values.holdout_burn_acknowledgement)
    ) {
      throw inputError(
        "Acknowledge the one-time holdout decision.",
        "holdout_burn_acknowledgement",
      );
    }
    const commissionPreset = String(values.commission_preset || "");
    if (!Object.hasOwn(COMMISSIONS, commissionPreset)) {
      throw inputError("Choose a supported commission preset.", "commission_preset");
    }
    if (
      commissionPreset === "zero" &&
      !Boolean(values.unrealistic_costs_acknowledged)
    ) {
      throw inputError(
        "Acknowledge unrealistic costs before using zero commission.",
        "unrealistic_costs_acknowledged",
      );
    }
    const deltaMinimum = number(values, "delta_minimum", 0, 1);
    const deltaTarget = number(values, "delta_target", 0, 1);
    const deltaMaximum = number(values, "delta_maximum", 0, 1);
    if (!(deltaMinimum <= deltaTarget && deltaTarget <= deltaMaximum)) {
      throw inputError(
        "Delta target must remain inside the acceptance band.",
        "delta_target",
      );
    }
    const minimumDte = number(values, "dte_minimum", 0, 365, true);
    const maximumDte = number(values, "dte_maximum", 0, 365, true);
    if (minimumDte > maximumDte) {
      throw inputError("Minimum DTE cannot exceed maximum DTE.", "dte_minimum");
    }
    const premiumStopEnabled = Boolean(values.premium_stop_enabled);
    const smiGateEnabled = Boolean(values.smi_gate_enabled);
    const oppositeSmiEnabled = Boolean(values.opposite_smi_exit);
    if (oppositeSmiEnabled && !smiGateEnabled) {
      throw inputError(
        "Enable the SMI gate before the opposite-SMI exit.",
        "opposite_smi_exit",
      );
    }
    const profitMode = String(values.profit_target_mode || "");
    if (!["friction_multiple", "legacy_percent"].includes(profitMode)) {
      throw inputError("Choose a profit-target mode.", "profit_target_mode");
    }

    return {
      schema_version: SCHEMA_VERSION,
      dataset: {
        version: String(values.dataset_version || "v1"),
        window_preset: windowPreset,
        start_date: startDate,
        end_date: endDate,
        symbols: selectedSymbols(values),
        holdout_burn_acknowledgement: Boolean(
          values.holdout_burn_acknowledgement,
        ),
      },
      regime: {
        rule_source: "family_supplied",
        warmup_read_only: String(values.warmup_requirement || ""),
      },
      setup_trigger: {
        family,
        signal_price_source: FAMILY_SOURCES[family],
        trigger_timeframe_minutes: number(
          values,
          "trigger_timeframe_minutes",
          1,
          60,
          true,
        ),
        execution_timeframe_minutes: 1,
        parameters: familyParameters(values, family),
      },
      filters: {
        spread_cap_percent: number(values, "spread_cap_percent", 0.01, 200),
        spread_denominator: String(values.spread_denominator || "midpoint"),
        premium_floor: number(values, "premium_floor", 0, 10000),
        premium_cap: optionalNumber(values, "premium_cap", 0.01, 10000),
        valid_nbbo_required: Boolean(values.valid_nbbo_required),
        quote_freshness_minutes: 1,
        indicator_gates: {
          rsi: gate(values, "rsi_gate_enabled"),
          smi: gate(values, "smi_gate_enabled"),
          momentum: gate(values, "momentum_gate_enabled"),
          velocity: gate(values, "velocity_gate_enabled"),
          activity: gate(values, "activity_gate_enabled"),
          trade_side: gate(values, "trade_side_gate_enabled"),
        },
      },
      contract_selection: {
        target_absolute_delta: deltaTarget,
        minimum_absolute_delta: deltaMinimum,
        maximum_absolute_delta: deltaMaximum,
        minimum_dte: minimumDte,
        maximum_dte: maximumDte,
        allow_zero_dte: Boolean(values.allow_zero_dte),
        expiration_fallback: Boolean(values.expiration_fallback),
        next_strike_scan: Boolean(values.next_strike_scan),
      },
      execution_costs: {
        commission_preset: commissionPreset,
        commission_per_contract_per_side: COMMISSIONS[commissionPreset],
        unrealistic_costs_acknowledged: Boolean(
          values.unrealistic_costs_acknowledged,
        ),
        fill_model:
          "buy_first_valid_ask_after_completed_trigger_bar_sell_first_valid_bid",
      },
      risk: {
        contracts_per_trade: number(
          values,
          "contracts_per_trade",
          1,
          100,
          true,
        ),
        maximum_trades_per_symbol_day: number(
          values,
          "maximum_trades_per_symbol_day",
          1,
          100,
          true,
        ),
        reentry_cooldown_minutes: number(
          values,
          "reentry_cooldown_minutes",
          0,
          390,
          true,
        ),
        same_direction_spy_qqq_single_exposure: Boolean(
          values.same_direction_spy_qqq_single_exposure,
        ),
      },
      exits: {
        underlying_invalidation: {
          enabled: Boolean(values.invalidation_stop_enabled),
          definition: String(values.invalidation_formula || ""),
        },
        profit_target: {
          enabled: Boolean(values.profit_target_enabled),
          mode: profitMode,
          friction_multiple: number(values, "profit_friction_multiple", 0, 100),
          legacy_percent: number(values, "profit_legacy_percent", 0.01, 1000),
        },
        time_stop: {
          enabled: Boolean(values.time_stop_enabled),
          minutes: number(values, "time_stop_minutes", 1, 390, true),
        },
        forced_eod_close: {
          enabled: true,
          time_et: "15:55",
        },
        premium_percent_stop: {
          enabled: premiumStopEnabled,
          percent: number(values, "premium_stop_percent", 0.01, 100),
        },
        opposite_smi: {
          enabled: oppositeSmiEnabled,
        },
        priority: [
          "profit_target",
          "underlying_invalidation",
          "premium_percent_stop",
          "opposite_smi",
          "time_stop",
          "forced_eod_close",
        ],
      },
      provenance: {
        ui: "v2",
        preset:
          family === "trend_persistence"
            ? "P1/U08 preregistered"
            : family === "legacy_macd"
              ? "report-85 legacy comparison"
              : "custom portal surface",
        report_watermarks: [
          ...(windowPreset === "holdout" ? ["HOLDOUT RUN"] : []),
          ...(commissionPreset === "zero" ? ["ZERO-COST SIMULATION"] : []),
          ...(minimumDte === 0 ? ["OUTSIDE PREREGISTERED SCOPE"] : []),
          ...(family === "legacy_macd"
            ? ["LEGACY MACD BASELINE ONLY"]
            : []),
        ],
        run_log_stamps: [
          ...(windowPreset === "holdout"
            ? ["holdout_burn_acknowledged=true"]
            : []),
        ],
        adapter_command: ADAPTER_COMMAND,
        adapter_status: "pending_parity_certified_package",
      },
    };
  }

  function sorted(value) {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sorted(value[key])]),
      );
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(sorted(value));
  }

  return Object.freeze({
    SCHEMA_VERSION,
    ADAPTER_COMMAND,
    FAMILY_SOURCES,
    COMMISSIONS,
    buildEnvelope,
    canonicalJson,
  });
});
