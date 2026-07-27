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
    "databento-opra-2026-06": Object.freeze(["TSLA"]),
    "thetadata-spy-2025-08-19": Object.freeze(["SPY"]),
  });
  const PROFILE_SIGNAL_SOURCES = Object.freeze({
    "databento-opra-2026-06": Object.freeze([
      "alpha_vantage_underlying_directional",
      "databento_option_contract",
    ]),
    "thetadata-spy-2025-08-19": Object.freeze([
      "databento_option_contract",
    ]),
  });
  const NUMBER_FIELDS = Object.freeze([
    "macd_fast_period",
    "macd_slow_period",
    "macd_signal_period",
    "rsi_period",
    "rsi_minimum",
    "rsi_maximum",
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
    "zero_line_filter_enabled",
    "rsi_enabled",
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
    "signal_source",
    "macd_fast_period",
    "macd_slow_period",
    "macd_signal_period",
    "macd_ema_seed_method",
    "rule_toggles",
    "rsi_period",
    "rsi_minimum",
    "rsi_maximum",
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
    normalized.macd_ema_seed_method = String(
      values.macd_ema_seed_method || "",
    );
    normalized.spread_denominator = String(values.spread_denominator || "");
    normalized.force_exit_time_riyadh = String(
      values.force_exit_time_riyadh || "",
    );

    if (normalized.macd_fast_period >= normalized.macd_slow_period) {
      throw inputError(
        "MACD fast period must be smaller than the slow period.",
        "macd_fast_period",
      );
    }
    if (normalized.rsi_minimum > normalized.rsi_maximum) {
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
    if (!["sma", "first"].includes(normalized.macd_ema_seed_method)) {
      throw inputError("Choose a supported MACD seed method.", "macd_ema_seed_method");
    }
    if (!["midpoint", "ask"].includes(normalized.spread_denominator)) {
      throw inputError("Choose a supported spread denominator.", "spread_denominator");
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
    RULE_TOGGLE_FIELDS,
    WORKFLOW_INPUT_NAMES,
    buildInputs,
  });
});
