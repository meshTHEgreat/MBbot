(function initPortalV2ControlModel(root, factory) {
  "use strict";
  const model = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = model;
  }
  if (root) {
    root.MBbotPortalV2ControlModel = model;
  }
})(typeof globalThis === "object" ? globalThis : this, function createModel() {
  "use strict";

  const REQUEST_SCHEMA = "mbbot.backtest-control.request.v3";
  const DATASET_PROFILE =
    "thetadata-options-2026-04-27-to-2026-07-24";
  const WINDOWS = Object.freeze({
    discovery: Object.freeze({
      start: "2026-04-27",
      end: "2026-05-22",
    }),
    holdout: Object.freeze({
      start: "2026-05-26",
      end: "2026-07-24",
    }),
  });
  const COMMISSIONS = Object.freeze({
    reference: 0.65,
    stress: 1.3,
    zero: 0,
  });
  const WORKFLOW_INPUT_NAMES = Object.freeze([
    "dataset_profile",
    "experiment_label",
    "symbols",
    "start_date",
    "end_date",
    "signal_source",
    "bar_minutes",
    "indicator_settings",
    "advanced_settings",
    "rule_toggles",
    "max_premium",
    "max_spread_percent",
    "spread_denominator",
    "allow_zero_dte",
    "scan_next_strike_if_nearest_fails",
    "fallback_to_next_expiration",
    "profit_target_percent",
    "stop_loss_percent",
    "commission_per_contract",
    "contracts_per_trade",
    "entry_delay_minutes",
    "entry_cutoff_minutes",
    "force_exit_time_riyadh",
    "validate_only",
    "request_envelope",
  ]);

  function inputError(message, field = null) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  function isoDate(value, field) {
    const text = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw inputError("Choose a valid date.", field);
    }
    const parsed = new Date(`${text}T00:00:00Z`);
    if (
      Number.isNaN(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== text
    ) {
      throw inputError("Choose a valid date.", field);
    }
    return text;
  }

  function symbols(values) {
    const selected = Array.isArray(values.symbols)
      ? values.symbols.map(String)
      : [];
    if (!selected.length) {
      throw inputError("Select at least one symbol.", "symbols");
    }
    const allowed = new Set(["SPY", "QQQ", "AAPL", "NVDA", "TSLA"]);
    if (
      new Set(selected).size !== selected.length ||
      selected.some((symbol) => !allowed.has(symbol))
    ) {
      throw inputError(
        "Choose unique symbols available in dataset v1.",
        "symbols",
      );
    }
    return selected;
  }

  function advancedSettings() {
    return {
      momentum: {
        enabled: false,
        scope: "entry",
        lookback_bars: 3,
        price_source: "midpoint",
        minimum_percent: -100,
        maximum_percent: 500,
      },
      premium_velocity: {
        enabled: false,
        scope: "entry",
        lookback_bars: 3,
        price_source: "midpoint",
        minimum_percent_per_minute: -100,
        maximum_percent_per_minute: 100,
      },
      trading_activity: {
        enabled: false,
        scope: "entry",
        relative_lookback_bars: 6,
        volume_enabled: true,
        minimum_volume: 0,
        maximum_volume: 10000000,
        trade_count_enabled: true,
        minimum_trade_count: 0,
        maximum_trade_count: 10000000,
        premium_turnover_enabled: false,
        minimum_premium_turnover: 0,
        maximum_premium_turnover: 1000000000000,
        relative_volume_enabled: false,
        minimum_relative_volume: 0,
        maximum_relative_volume: 1000,
      },
      premium: {
        enabled: false,
        scope: "entry",
        price_source: "midpoint",
        minimum: 0.01,
        maximum: 100,
      },
      delta: {
        enabled: false,
        scope: "entry",
        absolute_value: true,
        minimum: 0,
        maximum: 1,
      },
      theta: {
        enabled: false,
        scope: "entry",
        minimum: -100,
        maximum: 100,
      },
      calculated_gamma: {
        enabled: false,
        scope: "entry",
        minimum: 0,
        maximum: 100,
        model: "black_scholes_from_thetadata_first_order",
      },
      trade_side: {
        enabled: false,
        scope: "entry",
        side: "buy",
        minimum_classified_volume: 1,
        minimum_side_share_percent: 50,
        classification: "thetadata_opra_trade_condition_only",
      },
    };
  }

  function buildInputs(values, validateOnly = false) {
    const label = String(values.experiment_label || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.,()/+-]{0,79}$/.test(label)) {
      throw inputError(
        "Use 1–80 letters, numbers, spaces, or safe punctuation.",
        "experiment_label",
      );
    }
    const selectedSymbols = symbols(values);
    const preset = String(values.window_preset || "");
    let start;
    let end;
    if (preset === "discovery") {
      ({ start, end } = WINDOWS.discovery);
    } else if (preset === "custom_discovery") {
      start = isoDate(values.start_date, "start_date");
      end = isoDate(values.end_date, "end_date");
      if (
        start < WINDOWS.discovery.start ||
        end > WINDOWS.discovery.end ||
        start > end
      ) {
        throw inputError(
          `Custom dates must stay inside ${WINDOWS.discovery.start} through ${WINDOWS.discovery.end}.`,
          "start_date",
        );
      }
    } else if (preset === "holdout") {
      ({ start, end } = WINDOWS.holdout);
      if (values.holdout_burn_acknowledgement !== true) {
        throw inputError(
          "Acknowledge the one-time holdout use before using holdout data.",
          "window_preset",
        );
      }
    } else {
      throw inputError("Choose a window preset.", "window_preset");
    }

    const commissionPreset = String(values.commission_preset || "");
    if (commissionPreset === "both") {
      throw inputError(
        "Dual-cost reports are not available on the legacy preview runner yet.",
        "commission_preset",
      );
    }
    if (!Object.hasOwn(COMMISSIONS, commissionPreset)) {
      throw inputError(
        "Choose reference, stress, or explicitly acknowledged zero costs.",
        "commission_preset",
      );
    }
    if (
      commissionPreset === "zero" &&
      values.unrealistic_costs_acknowledged !== true
    ) {
      throw inputError(
        "Acknowledge that zero commission is unrealistic.",
        "unrealistic_costs_acknowledged",
      );
    }

    const envelope = {
      schema_version: REQUEST_SCHEMA,
      ui: "v2",
      window_preset: preset,
      holdout_burn_acknowledgement:
        values.holdout_burn_acknowledgement === true,
      commission_preset: commissionPreset,
      unrealistic_costs_acknowledged:
        values.unrealistic_costs_acknowledged === true,
    };
    const inputs = {
      dataset_profile: DATASET_PROFILE,
      experiment_label: label,
      symbols: selectedSymbols.join(","),
      start_date: start,
      end_date: end,
      signal_source: "thetadata_option_contract",
      bar_minutes: 5,
      indicator_settings: JSON.stringify({
        macd: {
          ema_seed_method: "sma",
          fast_period: 12,
          signal_period: 9,
          slow_period: 26,
          zero_line_filter_enabled: false,
        },
        rsi: {
          enabled: false,
          maximum: 100,
          minimum: 0,
          period: 14,
        },
        smi: {
          d_length: 3,
          ema_seed_method: "first",
          enabled: false,
          entry_mode: "confirm_macd_state",
          k_length: 10,
          opposite_crossover_exit_enabled: false,
          overbought: 40,
          oversold: -40,
          signal_length: 3,
          zone_filter_enabled: false,
        },
      }),
      advanced_settings: JSON.stringify(advancedSettings()),
      rule_toggles: JSON.stringify({
        max_premium_enabled: true,
        max_spread_enabled: true,
        entry_window_enabled: true,
        profit_target_enabled: true,
        stop_loss_enabled: true,
        opposite_macd_enabled: true,
        time_exit_enabled: true,
      }),
      max_premium: 4,
      max_spread_percent: 50,
      spread_denominator: "midpoint",
      allow_zero_dte: false,
      scan_next_strike_if_nearest_fails: true,
      fallback_to_next_expiration: true,
      profit_target_percent: 20,
      stop_loss_percent: 10,
      commission_per_contract: COMMISSIONS[commissionPreset],
      contracts_per_trade: 1,
      entry_delay_minutes: 15,
      entry_cutoff_minutes: 60,
      force_exit_time_riyadh: "22:20",
      validate_only: Boolean(validateOnly),
      request_envelope: JSON.stringify(envelope),
    };
    const keys = Object.keys(inputs).sort();
    const expected = [...WORKFLOW_INPUT_NAMES].sort();
    if (
      keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])
    ) {
      throw inputError("Preview request does not match the runner schema.");
    }
    return inputs;
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) {
      return `[${value.map(canonicalJson).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
        )
        .join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function sentence(inputs) {
    const envelope = JSON.parse(inputs.request_envelope);
    const symbolText = inputs.symbols.replaceAll(",", " + ");
    const cost =
      envelope.commission_preset === "zero"
        ? "ZERO-COST SIMULATION"
        : `$${Number(inputs.commission_per_contract).toFixed(2)} per contract per side`;
    const window =
      envelope.window_preset === "holdout"
        ? `HOLDOUT RUN ${inputs.start_date} through ${inputs.end_date}`
        : `discovery ${inputs.start_date} through ${inputs.end_date}`;
    return `Replay the fixed legacy MACD baseline on ${symbolText}, ${window}, with ${cost}.`;
  }

  return Object.freeze({
    REQUEST_SCHEMA,
    DATASET_PROFILE,
    WINDOWS,
    COMMISSIONS,
    WORKFLOW_INPUT_NAMES,
    buildInputs,
    canonicalJson,
    sentence,
  });
});
