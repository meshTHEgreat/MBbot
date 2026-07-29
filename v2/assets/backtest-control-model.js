(function exposeBacktestControlModel(root, factory) {
  "use strict";
  const model = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = model;
  }
  if (root) {
    root.MBbotBacktestControlModel = model;
  }
})(typeof globalThis === "object" ? globalThis : this, function createModel() {
  "use strict";

  const PROFILE_SYMBOLS = Object.freeze({
    "thetadata-options-2026-04-27-to-2026-07-24": Object.freeze([
      "QQQ",
      "SPY",
      "TSLA",
      "AAPL",
      "NVDA",
    ]),
  });
  const PROFILE_SIGNAL_SOURCES = Object.freeze({
    "thetadata-options-2026-04-27-to-2026-07-24": Object.freeze([
      "thetadata_option_contract",
    ]),
  });
  const PROFILE_DATE_RANGES = Object.freeze({
    "thetadata-options-2026-04-27-to-2026-07-24": Object.freeze({
      start: "2026-04-27",
      end: "2026-07-24",
    }),
  });
  const NUMBER_FIELDS = Object.freeze([
    "bar_minutes",
    "max_premium",
    "max_spread_percent",
    "profit_target_percent",
    "stop_loss_percent",
    "commission_per_contract",
    "contracts_per_trade",
    "entry_delay_minutes",
    "entry_cutoff_minutes",
  ]);
  const BOOLEAN_FIELDS = Object.freeze([
    "allow_zero_dte",
    "scan_next_strike_if_nearest_fails",
    "fallback_to_next_expiration",
    "validate_only",
  ]);
  const RULE_TOGGLE_FIELDS = Object.freeze([
    "max_premium_enabled",
    "max_spread_enabled",
    "entry_window_enabled",
    "profit_target_enabled",
    "stop_loss_enabled",
    "opposite_macd_enabled",
    "time_exit_enabled",
  ]);
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
  ]);
  const SMI_ENTRY_MODES = Object.freeze([
    "confirm_macd_state",
    "require_same_bar_cross",
    "replace_macd",
  ]);
  const ADVANCED_SCOPES = Object.freeze(["entry", "exit", "both"]);
  const PREMIUM_PRICE_SOURCES = Object.freeze([
    "midpoint",
    "bid",
    "ask",
    "trade_close",
    "vwap",
  ]);

  function advancedScope(values, name) {
    const scope = String(values[name] || "");
    if (!ADVANCED_SCOPES.includes(scope)) {
      throw inputError("Choose entry, exit, or both.", name);
    }
    return scope;
  }

  function premiumSource(values, name) {
    const source = String(values[name] || "");
    if (!PREMIUM_PRICE_SOURCES.includes(source)) {
      throw inputError("Choose a supported option-premium source.", name);
    }
    return source;
  }

  function orderedRange(minimum, maximum, field) {
    if (minimum > maximum) {
      throw inputError("Minimum cannot exceed maximum.", field);
    }
  }

  function buildAdvancedSettings(values) {
    const momentumMinimum = finiteNumber(
      values,
      "momentum_minimum_percent",
      -10000,
      10000,
    );
    const momentumMaximum = finiteNumber(
      values,
      "momentum_maximum_percent",
      -10000,
      10000,
    );
    orderedRange(momentumMinimum, momentumMaximum, "momentum_minimum_percent");
    const velocityMinimum = finiteNumber(
      values,
      "premium_velocity_minimum_percent_per_minute",
      -1000,
      1000,
    );
    const velocityMaximum = finiteNumber(
      values,
      "premium_velocity_maximum_percent_per_minute",
      -1000,
      1000,
    );
    orderedRange(
      velocityMinimum,
      velocityMaximum,
      "premium_velocity_minimum_percent_per_minute",
    );
    const volumeMinimum = finiteNumber(
      values,
      "activity_minimum_volume",
      0,
      10000000,
      true,
    );
    const volumeMaximum = finiteNumber(
      values,
      "activity_maximum_volume",
      0,
      10000000,
      true,
    );
    orderedRange(volumeMinimum, volumeMaximum, "activity_minimum_volume");
    const countMinimum = finiteNumber(
      values,
      "activity_minimum_trade_count",
      0,
      10000000,
      true,
    );
    const countMaximum = finiteNumber(
      values,
      "activity_maximum_trade_count",
      0,
      10000000,
      true,
    );
    orderedRange(countMinimum, countMaximum, "activity_minimum_trade_count");
    const turnoverMinimum = finiteNumber(
      values,
      "activity_minimum_premium_turnover",
      0,
      1000000000000,
    );
    const turnoverMaximum = finiteNumber(
      values,
      "activity_maximum_premium_turnover",
      0,
      1000000000000,
    );
    orderedRange(
      turnoverMinimum,
      turnoverMaximum,
      "activity_minimum_premium_turnover",
    );
    const relativeMinimum = finiteNumber(
      values,
      "activity_minimum_relative_volume",
      0,
      1000000,
    );
    const relativeMaximum = finiteNumber(
      values,
      "activity_maximum_relative_volume",
      0,
      1000000,
    );
    orderedRange(
      relativeMinimum,
      relativeMaximum,
      "activity_minimum_relative_volume",
    );
    if (
      values.activity_enabled &&
      ![
        "activity_volume_enabled",
        "activity_trade_count_enabled",
        "activity_premium_turnover_enabled",
        "activity_relative_volume_enabled",
      ].some((name) => Boolean(values[name]))
    ) {
      throw inputError(
        "Enable at least one trading-activity measurement.",
        "activity_enabled",
      );
    }
    const premiumMinimum = finiteNumber(
      values,
      "premium_range_minimum",
      0,
      100000,
    );
    const premiumMaximum = finiteNumber(
      values,
      "premium_range_maximum",
      0,
      100000,
    );
    orderedRange(premiumMinimum, premiumMaximum, "premium_range_minimum");
    const deltaMinimum = finiteNumber(values, "delta_minimum", 0, 1);
    const deltaMaximum = finiteNumber(values, "delta_maximum", 0, 1);
    orderedRange(deltaMinimum, deltaMaximum, "delta_minimum");
    const thetaMinimum = finiteNumber(
      values,
      "theta_minimum",
      -100000,
      100000,
    );
    const thetaMaximum = finiteNumber(
      values,
      "theta_maximum",
      -100000,
      100000,
    );
    orderedRange(thetaMinimum, thetaMaximum, "theta_minimum");
    const gammaMinimum = finiteNumber(
      values,
      "gamma_minimum",
      0,
      100000,
    );
    const gammaMaximum = finiteNumber(
      values,
      "gamma_maximum",
      0,
      100000,
    );
    orderedRange(gammaMinimum, gammaMaximum, "gamma_minimum");
    const tradeSide = String(values.trade_side_value || "");
    if (!["buy", "sell", "either"].includes(tradeSide)) {
      throw inputError("Choose buy, sell, or either.", "trade_side_value");
    }
    return {
      momentum: {
        enabled: Boolean(values.momentum_enabled),
        scope: advancedScope(values, "momentum_scope"),
        lookback_bars: finiteNumber(
          values,
          "momentum_lookback_bars",
          2,
          78,
          true,
        ),
        price_source: premiumSource(values, "momentum_price_source"),
        minimum_percent: momentumMinimum,
        maximum_percent: momentumMaximum,
      },
      premium_velocity: {
        enabled: Boolean(values.premium_velocity_enabled),
        scope: advancedScope(values, "premium_velocity_scope"),
        lookback_bars: finiteNumber(
          values,
          "premium_velocity_lookback_bars",
          2,
          78,
          true,
        ),
        price_source: premiumSource(
          values,
          "premium_velocity_price_source",
        ),
        minimum_percent_per_minute: velocityMinimum,
        maximum_percent_per_minute: velocityMaximum,
      },
      trading_activity: {
        enabled: Boolean(values.activity_enabled),
        scope: advancedScope(values, "activity_scope"),
        relative_lookback_bars: finiteNumber(
          values,
          "activity_relative_lookback_bars",
          1,
          78,
          true,
        ),
        volume_enabled: Boolean(values.activity_volume_enabled),
        minimum_volume: volumeMinimum,
        maximum_volume: volumeMaximum,
        trade_count_enabled: Boolean(values.activity_trade_count_enabled),
        minimum_trade_count: countMinimum,
        maximum_trade_count: countMaximum,
        premium_turnover_enabled: Boolean(
          values.activity_premium_turnover_enabled,
        ),
        minimum_premium_turnover: turnoverMinimum,
        maximum_premium_turnover: turnoverMaximum,
        relative_volume_enabled: Boolean(
          values.activity_relative_volume_enabled,
        ),
        minimum_relative_volume: relativeMinimum,
        maximum_relative_volume: relativeMaximum,
      },
      premium: {
        enabled: Boolean(values.premium_range_enabled),
        scope: advancedScope(values, "premium_range_scope"),
        price_source: premiumSource(values, "premium_range_price_source"),
        minimum: premiumMinimum,
        maximum: premiumMaximum,
      },
      delta: {
        enabled: Boolean(values.delta_enabled),
        scope: advancedScope(values, "delta_scope"),
        absolute_value: Boolean(values.delta_absolute_value),
        minimum: deltaMinimum,
        maximum: deltaMaximum,
      },
      theta: {
        enabled: Boolean(values.theta_enabled),
        scope: advancedScope(values, "theta_scope"),
        minimum: thetaMinimum,
        maximum: thetaMaximum,
      },
      calculated_gamma: {
        enabled: Boolean(values.gamma_enabled),
        scope: advancedScope(values, "gamma_scope"),
        minimum: gammaMinimum,
        maximum: gammaMaximum,
        model: "black_scholes_from_thetadata_first_order",
      },
      trade_side: {
        enabled: Boolean(values.trade_side_enabled),
        scope: advancedScope(values, "trade_side_scope"),
        side: tradeSide,
        minimum_classified_volume: finiteNumber(
          values,
          "trade_side_minimum_classified_volume",
          1,
          10000000,
          true,
        ),
        minimum_side_share_percent: finiteNumber(
          values,
          "trade_side_minimum_share_percent",
          0,
          100,
        ),
        classification: "thetadata_opra_trade_condition_only",
      },
    };
  }

  function finiteNumber(values, name, minimum, maximum, integer = false) {
    const parsed = Number(values[name]);
    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      parsed > maximum ||
      (integer && !Number.isInteger(parsed))
    ) {
      const noun = integer ? "whole number" : "number";
      throw inputError(
        `${name.replaceAll("_", " ")} must be a ${noun} from ${minimum} to ${maximum}.`,
        name,
      );
    }
    return parsed;
  }

  function inputError(message, field = null) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  function selectedSymbols(value) {
    const values = Array.isArray(value)
      ? value
      : String(value || "")
          .split(",")
          .map((symbol) => symbol.trim())
          .filter(Boolean);
    if (!values.length) {
      throw inputError("Select at least one symbol.", "symbols");
    }
    if (
      new Set(values).size !== values.length ||
      values.some((symbol) => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    ) {
      throw inputError(
        "Symbols must be unique uppercase ticker identifiers.",
        "symbols",
      );
    }
    return values;
  }

  function isoDate(values, name) {
    const value = String(values[name] || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw inputError(
        `${name.replaceAll("_", " ")} must be a valid date.`,
        name,
      );
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      Number.isNaN(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw inputError(
        `${name.replaceAll("_", " ")} must be a valid date.`,
        name,
      );
    }
    return value;
  }

  function buildInputs(values) {
    if (!values || typeof values !== "object") {
      throw inputError("Backtest settings are missing.");
    }
    const profile = String(values.dataset_profile || "");
    const available = PROFILE_SYMBOLS[profile];
    if (!available) {
      throw inputError("Choose an available local dataset.", "dataset_profile");
    }
    const label = String(values.experiment_label || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.,()/+-]{0,79}$/.test(label)) {
      throw inputError(
        "Use 1-80 letters, numbers, spaces, or safe punctuation for the experiment label.",
        "experiment_label",
      );
    }
    const symbols = selectedSymbols(values.symbols);
    const unsupported = symbols.find((symbol) => !available.includes(symbol));
    if (unsupported) {
      throw inputError(
        `${unsupported} is not available in this local dataset.`,
        "symbols",
      );
    }

    const normalized = {
      dataset_profile: profile,
      experiment_label: label,
      symbols: symbols.join(","),
      signal_source: String(values.signal_source || ""),
    };
    const range = PROFILE_DATE_RANGES[profile];
    normalized.start_date = isoDate(values, "start_date");
    normalized.end_date = isoDate(values, "end_date");
    if (normalized.start_date > normalized.end_date) {
      throw inputError(
        "Start date cannot be later than end date.",
        "start_date",
      );
    }
    if (
      normalized.start_date < range.start ||
      normalized.end_date > range.end
    ) {
      throw inputError(
        `Choose dates from ${range.start} through ${range.end} for this local dataset.`,
        "start_date",
      );
    }
    if (
      !PROFILE_SIGNAL_SOURCES[profile].includes(normalized.signal_source)
    ) {
      throw inputError(
        "Choose a signal source available in this local dataset.",
        "signal_source",
      );
    }
    for (const name of NUMBER_FIELDS) {
      const parsed = Number(values[name]);
      if (!Number.isFinite(parsed)) {
        throw inputError(`${name.replaceAll("_", " ")} must be numeric.`, name);
      }
      normalized[name] = parsed;
    }
    for (const name of BOOLEAN_FIELDS) {
      normalized[name] = Boolean(values[name]);
    }
    normalized.rule_toggles = JSON.stringify(
      Object.fromEntries(
        RULE_TOGGLE_FIELDS.map((name) => [name, Boolean(values[name])]),
      ),
    );
    const macdFast = finiteNumber(values, "macd_fast_period", 1, 1000, true);
    const macdSlow = finiteNumber(values, "macd_slow_period", 2, 1000, true);
    const macdSignal = finiteNumber(
      values,
      "macd_signal_period",
      1,
      1000,
      true,
    );
    const rsiPeriod = finiteNumber(values, "rsi_period", 1, 1000, true);
    const rsiMinimum = finiteNumber(values, "rsi_minimum", 0, 100);
    const rsiMaximum = finiteNumber(values, "rsi_maximum", 0, 100);
    const smiK = finiteNumber(values, "smi_k_length", 1, 1000, true);
    const smiD = finiteNumber(values, "smi_d_length", 1, 1000, true);
    const smiSignal = finiteNumber(
      values,
      "smi_signal_length",
      1,
      1000,
      true,
    );
    const smiOversold = finiteNumber(values, "smi_oversold", -100, 100);
    const smiOverbought = finiteNumber(values, "smi_overbought", -100, 100);
    const macdSeed = String(values.macd_ema_seed_method || "");
    const smiSeed = String(values.smi_ema_seed_method || "");
    const smiEntryMode = String(values.smi_entry_mode || "");
    normalized.indicator_settings = JSON.stringify({
      macd: {
        ema_seed_method: macdSeed,
        fast_period: macdFast,
        signal_period: macdSignal,
        slow_period: macdSlow,
        zero_line_filter_enabled: Boolean(
          values.zero_line_filter_enabled,
        ),
      },
      rsi: {
        enabled: Boolean(values.rsi_enabled),
        maximum: rsiMaximum,
        minimum: rsiMinimum,
        period: rsiPeriod,
      },
      smi: {
        d_length: smiD,
        ema_seed_method: smiSeed,
        enabled: Boolean(values.smi_enabled),
        entry_mode: smiEntryMode,
        k_length: smiK,
        opposite_crossover_exit_enabled: Boolean(
          values.opposite_smi_enabled,
        ),
        overbought: smiOverbought,
        oversold: smiOversold,
        signal_length: smiSignal,
        zone_filter_enabled: Boolean(values.smi_zone_filter_enabled),
      },
    });
    normalized.advanced_settings = JSON.stringify(
      buildAdvancedSettings(values),
    );
    normalized.spread_denominator = String(values.spread_denominator || "");
    normalized.force_exit_time_riyadh = String(
      values.force_exit_time_riyadh || "",
    );

    if (macdFast >= macdSlow) {
      throw inputError(
        "MACD fast period must be smaller than the slow period.",
        "macd_fast_period",
      );
    }
    if (rsiMinimum > rsiMaximum) {
      throw inputError(
        "RSI minimum cannot exceed RSI maximum.",
        "rsi_minimum",
      );
    }
    if (
      normalized.entry_delay_minutes + normalized.entry_cutoff_minutes >=
      390
    ) {
      throw inputError(
        "Entry delay and cutoff must leave part of the regular session open.",
        "entry_delay_minutes",
      );
    }
    if (!["sma", "first"].includes(macdSeed)) {
      throw inputError("Choose a supported MACD seed method.", "macd_ema_seed_method");
    }
    if (!["sma", "first"].includes(smiSeed)) {
      throw inputError("Choose a supported SMI seed method.", "smi_ema_seed_method");
    }
    if (!SMI_ENTRY_MODES.includes(smiEntryMode)) {
      throw inputError("Choose a supported SMI entry mode.", "smi_entry_mode");
    }
    if (smiOversold >= smiOverbought) {
      throw inputError(
        "SMI oversold must be smaller than SMI overbought.",
        "smi_oversold",
      );
    }
    if (values.opposite_smi_enabled && !values.smi_enabled) {
      throw inputError(
        "Enable SMI before enabling the opposite SMI exit.",
        "opposite_smi_enabled",
      );
    }
    if (!["midpoint", "ask"].includes(normalized.spread_denominator)) {
      throw inputError("Choose a supported spread denominator.", "spread_denominator");
    }
    finiteNumber(values, "max_premium", 0.01, 100);
    finiteNumber(values, "bar_minutes", 1, 60, true);
    finiteNumber(values, "max_spread_percent", 0.01, 200);
    finiteNumber(values, "profit_target_percent", 0.1, 500);
    finiteNumber(values, "stop_loss_percent", 0.1, 100);
    finiteNumber(values, "commission_per_contract", 0, 100);
    finiteNumber(values, "contracts_per_trade", 1, 100, true);
    finiteNumber(values, "entry_delay_minutes", 0, 240, true);
    finiteNumber(values, "entry_cutoff_minutes", 0, 240, true);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized.force_exit_time_riyadh)) {
      throw inputError(
        "Forced exit must use 24-hour HH:MM Riyadh time.",
        "force_exit_time_riyadh",
      );
    }
    const keys = Object.keys(normalized).sort();
    const expected = [...WORKFLOW_INPUT_NAMES].sort();
    if (
      keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])
    ) {
      throw inputError("Backtest settings do not match the supported schema.");
    }
    return normalized;
  }

  return Object.freeze({
    PROFILE_SYMBOLS,
    PROFILE_SIGNAL_SOURCES,
    PROFILE_DATE_RANGES,
    RULE_TOGGLE_FIELDS,
    SMI_ENTRY_MODES,
    ADVANCED_SCOPES,
    PREMIUM_PRICE_SOURCES,
    WORKFLOW_INPUT_NAMES,
    buildAdvancedSettings,
    buildInputs,
  });
});
