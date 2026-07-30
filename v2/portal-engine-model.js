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

  const SCHEMA_VERSION = "mbbot.portal.engine-params.v1";
  const ADAPTER_COMMAND =
    "python -m portal_engine.cli --request request.json --out-dir DIR";
  const FAMILY_NAMES = Object.freeze([
    "trend_persistence",
    "opening_range_breakout",
    "orderflow_imbalance",
    "premium_underlying_divergence",
    "mean_reversion_fade",
  ]);
  const UI_TO_ENGINE_FAMILY = Object.freeze({
    trend_persistence: "trend_persistence",
    opening_range_breakout: "opening_range_breakout",
    order_flow_imbalance: "orderflow_imbalance",
    premium_underlying_divergence: "premium_underlying_divergence",
    mean_reversion_fade: "mean_reversion_fade",
  });
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
    both: 0.65,
    zero: 0,
  });
  const MOMENTUM_WINDOWS = Object.freeze([5, 10, 15, 30, 60]);

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

  function oneOf(values, name, allowed) {
    const parsed = number(values, name, Math.min(...allowed), Math.max(...allowed), true);
    if (!allowed.includes(parsed)) {
      throw inputError(
        `${name.replaceAll("_", " ")} must be one of ${allowed.join(", ")}.`,
        name,
      );
    }
    return parsed;
  }

  function selectedSymbols(values) {
    const symbols = Array.isArray(values.symbols)
      ? values.symbols
      : [values.symbols].filter(Boolean);
    const allowed = new Set(["AAPL", "NVDA", "QQQ", "SPY", "TSLA"]);
    const result = [...new Set(symbols.map(String))].sort();
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

  function trigger(values, uiFamily) {
    if (uiFamily === "trend_persistence") {
      const fast = number(values, "fast_ma_snapshots", 1, 65, true);
      const slow = number(values, "slow_ma_snapshots", 2, 66, true);
      if (fast >= slow) {
        throw inputError(
          "Fast MA snapshots must be fewer than slow MA snapshots.",
          "fast_ma_snapshots",
        );
      }
      return {
        fast_ma_snapshots: fast,
        slow_ma_snapshots: slow,
        ma_gap_min_pct: number(values, "ma_gap_percent", 0, 100),
        momentum_minutes: oneOf(
          values,
          "momentum_window_minutes",
          MOMENTUM_WINDOWS,
        ),
        momentum_min_pct: number(values, "momentum_percent", 0, 100),
      };
    }
    if (uiFamily === "opening_range_breakout") {
      const range = number(values, "orb_range_minutes", 5, 120, true);
      if (range % 5 !== 0) {
        throw inputError(
          "Opening range must be a multiple of five minutes.",
          "orb_range_minutes",
        );
      }
      return {
        range_minutes: range,
        buffer_pct: number(values, "orb_buffer_percent", 0, 5),
        regime_filter_enabled: Boolean(values.orb_regime_enabled),
        regime_max_width_vs_prior5: 1.5,
      };
    }
    if (uiFamily === "order_flow_imbalance") {
      const threshold = number(values, "order_flow_threshold", 0, 1);
      if (threshold === 0) {
        throw inputError(
          "Order-flow threshold must be greater than zero.",
          "order_flow_threshold",
        );
      }
      return {
        window_bars: number(values, "order_flow_window_bars", 1, 12, true),
        imbalance_threshold: threshold,
        require_underlying_agreement: Boolean(
          values.order_flow_underlying_agreement,
        ),
      };
    }
    if (uiFamily === "premium_underlying_divergence") {
      const underlying = number(
        values,
        "divergence_underlying_velocity_min",
        0,
        100,
      );
      if (underlying === 0) {
        throw inputError(
          "Underlying velocity minimum must be greater than zero.",
          "divergence_underlying_velocity_min",
        );
      }
      return {
        window_minutes: oneOf(
          values,
          "divergence_window_minutes",
          MOMENTUM_WINDOWS,
        ),
        underlying_velocity_min_pct_per_minute: underlying,
        premium_velocity_max_pct_per_minute: number(
          values,
          "divergence_premium_velocity_max",
          -100,
          100,
        ),
      };
    }
    if (uiFamily === "mean_reversion_fade") {
      const extreme = number(
        values,
        "mean_reversion_rsi_extreme",
        50,
        100,
      );
      if (extreme === 50) {
        throw inputError(
          "Mean-reversion RSI extreme must be greater than 50.",
          "mean_reversion_rsi_extreme",
        );
      }
      return {
        rsi_period: number(
          values,
          "mean_reversion_rsi_period",
          2,
          50,
          true,
        ),
        rsi_extreme: extreme,
        require_reversal_bar: Boolean(
          values.mean_reversion_reversal_confirm,
        ),
      };
    }
    throw inputError(
      "Legacy MACD uses the compatibility runner, not the Phase-2 adapter.",
      "trigger_family",
    );
  }

  function buildEnvelope(values) {
    if (!values || typeof values !== "object") {
      throw inputError("Portal engine settings are missing.");
    }
    const uiFamily = String(values.trigger_family || "");
    const family = UI_TO_ENGINE_FAMILY[uiFamily];
    if (!family || !FAMILY_NAMES.includes(family)) {
      throw inputError(
        uiFamily === "legacy_macd"
          ? "Legacy MACD uses the compatibility runner."
          : "Choose a supported trigger family.",
        "trigger_family",
      );
    }

    const dataset = String(values.dataset_version || "v1");
    if (!["v1", "v2-year"].includes(dataset)) {
      throw inputError("Choose an available certified dataset.", "dataset_version");
    }
    const windowPreset = String(values.window_preset || "");
    if (
      !["discovery", "custom_discovery", "all", "validation", "holdout"].includes(
        windowPreset,
      )
    ) {
      throw inputError("Choose a supported window preset.", "window_preset");
    }
    const start = isoDate(values, "start_date");
    const end = isoDate(values, "end_date");
    if (start > end) {
      throw inputError("Start date cannot be later than end date.", "start_date");
    }
    const acknowledged = Boolean(values.holdout_burn_acknowledgement);
    const protectedWindow = ["all", "validation", "holdout"].includes(
      windowPreset,
    );
    if (protectedWindow && !acknowledged) {
      throw inputError(
        "Acknowledge the one-time protected-window decision.",
        "holdout_burn_acknowledgement",
      );
    }
    if (!protectedWindow && acknowledged) {
      throw inputError(
        "Reusable discovery windows cannot carry a protected-window acknowledgement.",
        "holdout_burn_acknowledgement",
      );
    }

    const commissionPreset = String(values.commission_preset || "");
    if (!Object.hasOwn(COMMISSIONS, commissionPreset)) {
      throw inputError("Choose a supported commission preset.", "commission_preset");
    }
    const unrealistic = Boolean(values.unrealistic_costs_acknowledged);
    if (commissionPreset === "zero" && !unrealistic) {
      throw inputError(
        "Acknowledge unrealistic costs before using zero commission.",
        "unrealistic_costs_acknowledged",
      );
    }

    const deltaMinimum = number(values, "delta_minimum", 0.01, 1);
    const deltaTarget = number(values, "delta_target", 0.01, 1);
    const deltaMaximum = number(values, "delta_maximum", 0.01, 1);
    if (!(deltaMinimum <= deltaTarget && deltaTarget <= deltaMaximum)) {
      throw inputError(
        "Delta target must remain inside the acceptance band.",
        "delta_target",
      );
    }
    const allowZeroDte = Boolean(values.allow_zero_dte);
    const minimumDte = number(values, "dte_minimum", 0, 30, true);
    const maximumDte = number(values, "dte_maximum", 0, 30, true);
    if (minimumDte > maximumDte) {
      throw inputError("Minimum DTE cannot exceed maximum DTE.", "dte_minimum");
    }
    if (allowZeroDte !== (minimumDte === 0)) {
      throw inputError(
        "0DTE and the minimum DTE must agree.",
        "allow_zero_dte",
      );
    }

    if (values.profit_target_enabled === false) {
      throw inputError(
        "The certified adapter always applies a profit target.",
        "profit_target_enabled",
      );
    }
    if (values.time_stop_enabled === false) {
      throw inputError(
        "The certified adapter always applies a time stop.",
        "time_stop_enabled",
      );
    }
    if (values.opposite_smi_exit === true) {
      throw inputError(
        "Opposite-SMI exit is not exposed by the certified adapter.",
        "opposite_smi_exit",
      );
    }
    const profitMode = String(values.profit_target_mode || "");
    if (!["friction_multiple", "legacy_percent"].includes(profitMode)) {
      throw inputError("Choose a profit-target mode.", "profit_target_mode");
    }

    const reportWatermarks = [
      ...(protectedWindow
        ? ["HOLDOUT RUN"]
        : []),
      ...(commissionPreset === "zero" ? ["ZERO-COST SIMULATION"] : []),
      ...(commissionPreset === "both" ? ["DUAL-COST REPORT"] : []),
      ...(minimumDte === 0 ? ["OUTSIDE PREREGISTERED SCOPE"] : []),
    ];
    const runLogStamps = [
      ...(protectedWindow
        ? ["holdout_burn_acknowledged=true"]
        : []),
      `dataset_label=${dataset === "v2-year" ? "v2-year" : "v1-study"}`,
    ];
    const symbols = selectedSymbols(values);
    const riskCustomized = Boolean(values.risk_enabled);

    return {
      schema_version: SCHEMA_VERSION,
      family,
      trigger: trigger(values, uiFamily),
      delta_band: {
        target: deltaTarget,
        minimum: deltaMinimum,
        maximum: deltaMaximum,
      },
      dte_range: {
        minimum: minimumDte,
        maximum: maximumDte,
      },
      session_window: {
        entry_start: "09:45:00",
        entry_end: "15:00:00",
      },
      liquidity: {
        maximum_relative_spread_percent: number(
          values,
          "spread_cap_percent",
          0.01,
          100,
        ),
        minimum_midpoint: number(values, "premium_floor", 0, 10000),
        require_valid_nbbo: Boolean(values.valid_nbbo_required),
      },
      risk: riskCustomized
        ? {
            contracts_per_trade: number(
              values,
              "contracts_per_trade",
              1,
              100,
              true,
            ),
            maximum_trades_per_symbol_session: number(
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
            correlated_exposure_skip: Boolean(
              values.same_direction_spy_qqq_single_exposure,
            ),
          }
        : {
            contracts_per_trade: 1,
            maximum_trades_per_symbol_session: 3,
            reentry_cooldown_minutes: 30,
            correlated_exposure_skip: true,
          },
      exits: {
        invalidation_enabled: Boolean(values.invalidation_stop_enabled),
        profit_target_mode:
          profitMode === "legacy_percent" ? "percent" : "friction_multiple",
        profit_target_friction_multiple: number(
          values,
          "profit_friction_multiple",
          0.01,
          100,
        ),
        profit_target_percent:
          profitMode === "legacy_percent"
            ? number(values, "profit_legacy_percent", 0.01, 1000)
            : null,
        time_stop_minutes: number(
          values,
          "time_stop_minutes",
          5,
          375,
          true,
        ),
        premium_stop_enabled: Boolean(values.premium_stop_enabled),
        premium_stop_percent: Boolean(values.premium_stop_enabled)
          ? number(values, "premium_stop_percent", 0.01, 99.99)
          : null,
      },
      costs: {
        commission_per_contract_per_side: COMMISSIONS[commissionPreset],
      },
      symbols,
      window: { start, end },
      provenance: {
        ui: "v2",
        dataset,
        dataset_label: dataset === "v2-year" ? "v2-year" : "v1-study",
        window_preset: windowPreset,
        holdout_burn_acknowledgement: acknowledged,
        commission_preset: commissionPreset,
        unrealistic_costs_acknowledged: unrealistic,
        preset:
          family === "trend_persistence"
            ? "P1/U08 preregistered"
            : "custom portal surface",
        experiment_label: String(values.experiment_label || "Guided backtest"),
        report_watermarks: reportWatermarks,
        run_log_stamps: runLogStamps,
        adapter_command: ADAPTER_COMMAND,
        adapter_status: "parity_certified_connected",
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
    FAMILY_NAMES,
    FAMILY_SOURCES,
    COMMISSIONS,
    buildEnvelope,
    canonicalJson,
  });
});
