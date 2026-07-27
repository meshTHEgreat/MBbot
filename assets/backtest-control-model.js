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
    "databento-opra-2026-06": Object.freeze([
      "QQQ",
      "SPY",
      "TSLA",
      "AAPL",
      "NVDA",
    ]),
    "thetadata-spy-2025-08-19": Object.freeze(["SPY"]),
  });
  const PROFILE_SIGNAL_SOURCES = Object.freeze({
    "thetadata-options-2026-04-27-to-2026-07-24": Object.freeze([
      "thetadata_option_contract",
    ]),
    "databento-opra-2026-06": Object.freeze([
      "alpha_vantage_underlying_directional",
      "databento_option_contract",
    ]),
    "thetadata-spy-2025-08-19": Object.freeze([
      "databento_option_contract",
    ]),
  });
  const PROFILE_DATE_RANGES = Object.freeze({
    "thetadata-options-2026-04-27-to-2026-07-24": Object.freeze({
      start: "2026-04-27",
      end: "2026-07-24",
    }),
    "databento-opra-2026-06": Object.freeze({
      start: "2026-06-01",
      end: "2026-06-30",
    }),
    "thetadata-spy-2025-08-19": Object.freeze({
      start: "2025-08-19",
      end: "2025-08-19",
    }),
  });
  const NUMBER_FIELDS = Object.freeze([
    "max_premium",
    "max_spread_percent",
    "profit_target_percent",
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
    "indicator_settings",
    "rule_toggles",
    "max_premium",
    "max_spread_percent",
    "spread_denominator",
    "allow_zero_dte",
    "scan_next_strike_if_nearest_fails",
    "fallback_to_next_expiration",
    "profit_target_percent",
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
    const toggles = JSON.parse(normalized.rule_toggles);
    if (
      profile === "databento-opra-2026-06" &&
      (!toggles.max_premium_enabled ||
        normalized.max_premium > 4 ||
        !toggles.max_spread_enabled ||
        normalized.max_spread_percent > 50 ||
        normalized.spread_denominator !== "midpoint" ||
        !toggles.entry_window_enabled ||
        normalized.entry_delay_minutes < 15 ||
        normalized.entry_cutoff_minutes < 60)
    ) {
      throw inputError(
        "This verified offline dataset supports an enabled ask cap up to $4, an enabled midpoint spread cap up to 50%, and entries from 15 minutes after open until 60 minutes before close.",
        "dataset_profile",
      );
    }
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
    WORKFLOW_INPUT_NAMES,
    buildInputs,
  });
});
