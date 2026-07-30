(function initPortalResultsModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.MBbotPortalResultsModel = api;
  }
})(typeof globalThis === "object" ? globalThis : this, function createModel() {
  "use strict";

  const COST_KEYS = Object.freeze([
    Object.freeze({ key: "reference_0.65", label: "$0.65 reference" }),
    Object.freeze({ key: "stress_1.30", label: "$1.30 stress" }),
  ]);

  function finite(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function summary(payload, key) {
    const source = payload?.pooled?.[key] || {};
    return {
      trades: finite(source.trades) || 0,
      mid_to_mid_pnl: finite(source.mid_to_mid_pnl),
      friction_applied_pnl: finite(source.friction_applied_pnl),
      profit_factor:
        source.profit_factor === "Infinity"
          ? "Infinity"
          : finite(source.profit_factor),
      wins: finite(source.wins) || 0,
      losses: finite(source.losses) || 0,
      expectancy: finite(source.expectancy),
    };
  }

  function average(values) {
    const usable = values.map(finite).filter((value) => value !== null);
    if (!usable.length) return null;
    return usable.reduce((total, value) => total + value, 0) / usable.length;
  }

  function normalizeResult(payload) {
    const reference = summary(payload, "reference_0.65");
    const stress = summary(payload, "stress_1.30");
    const tradeCount = Math.max(reference.trades, stress.trades);
    const trades = Array.isArray(payload?.trades) ? payload.trades : [];
    const perSymbol = Object.entries(payload?.per_symbol || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([symbol, costs]) => ({
        symbol,
        reference: summary({ pooled: costs }, "reference_0.65"),
        stress: summary({ pooled: costs }, "stress_1.30"),
      }));
    const exitReasons = new Map();
    for (const trade of trades) {
      const reason = String(trade.exit_reason || "unknown");
      exitReasons.set(reason, (exitReasons.get(reason) || 0) + 1);
    }
    if (!trades.length && payload?.exit_reasons) {
      for (const [reason, count] of Object.entries(payload.exit_reasons)) {
        exitReasons.set(reason, finite(count) || 0);
      }
    }
    return {
      schema_version: String(payload?.schema_version || ""),
      family: String(payload?.family || ""),
      trade_count: tradeCount,
      insufficient_evidence: tradeCount < 60,
      costs: COST_KEYS.map(({ key, label }) => ({
        key,
        label,
        ...summary(payload, key),
      })),
      average_mae_percent:
        finite(payload?.excursions?.average_mae_percent) ??
        average(trades.map((trade) => trade.maximum_adverse_excursion_percent)),
      average_mfe_percent:
        finite(payload?.excursions?.average_mfe_percent) ??
        average(trades.map((trade) => trade.maximum_favorable_excursion_percent)),
      per_symbol: perSymbol,
      exit_reasons: [...exitReasons.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([reason, count]) => ({ reason, count })),
    };
  }

  function money(value) {
    if (value === null || value === undefined) return "—";
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function percent(value) {
    if (value === null || value === undefined) return "—";
    return `${Number(value).toFixed(2)}%`;
  }

  return Object.freeze({
    COST_KEYS,
    normalizeResult,
    money,
    percent,
  });
});
