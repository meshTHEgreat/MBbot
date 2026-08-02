(function attachLiveTradesModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MBBotLiveTradesModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildModel() {
  "use strict";

  const STRATEGY_IDS = Object.freeze([
    "workflow_125",
    "a2_pt40_sl20_combined_v1",
  ]);

  function numeric(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function strategyTrades(feed, strategyId) {
    if (!STRATEGY_IDS.includes(strategyId)) return [];
    const trades = Array.isArray(feed?.trades) ? feed.trades : [];
    return trades.filter((trade) => trade?.strategy_id === strategyId);
  }

  function searchableText(trade) {
    const exit = trade?.exit || {};
    return [
      trade?.trade_id,
      trade?.strategy_name,
      trade?.symbol,
      trade?.right,
      trade?.contract_id,
      trade?.strike,
      trade?.expiration,
      trade?.status,
      trade?.result,
      exit.reason,
      ...(Array.isArray(exit.all_reasons) ? exit.all_reasons : []),
      JSON.stringify(trade?.details || {}),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/_/g, " ")
      .toLowerCase();
  }

  function filterTrades(trades, filters) {
    const query = String(filters?.query || "").trim().toLowerCase();
    const status = String(filters?.status || "all");
    const result = String(filters?.result || "all");
    const order = String(filters?.order || "newest");
    const selected = (Array.isArray(trades) ? trades : []).filter((trade) => {
      if (query && !searchableText(trade).includes(query)) return false;
      if (status !== "all" && trade?.status !== status) return false;
      if (result !== "all" && trade?.result !== result) return false;
      return true;
    });
    const timestamp = (trade) =>
      Date.parse(trade?.opened_at || trade?.entry?.time || "") || 0;
    const pnl = (trade) => numeric(trade?.pnl) ?? Number.NEGATIVE_INFINITY;
    const sorters = {
      newest: (left, right) => timestamp(right) - timestamp(left),
      oldest: (left, right) => timestamp(left) - timestamp(right),
      pnl_high: (left, right) => pnl(right) - pnl(left),
      pnl_low: (left, right) => pnl(left) - pnl(right),
    };
    return selected.sort(sorters[order] || sorters.newest);
  }

  function summarize(trades) {
    const values = Array.isArray(trades) ? trades : [];
    const closed = values.filter((trade) => trade?.status === "closed");
    const wins = closed.filter((trade) => trade?.result === "win").length;
    const losses = closed.filter((trade) => trade?.result === "loss").length;
    const flats = closed.filter((trade) => trade?.result === "flat").length;
    const realizedPnl = closed.reduce(
      (total, trade) => total + (numeric(trade?.pnl) || 0),
      0,
    );
    return {
      trades: values.length,
      open: values.length - closed.length,
      closed: closed.length,
      wins,
      losses,
      flats,
      realized_pnl: realizedPnl,
      win_rate_percent: closed.length ? (100 * wins) / closed.length : null,
      expectancy: closed.length ? realizedPnl / closed.length : null,
    };
  }

  function validateFeed(feed) {
    if (!feed || typeof feed !== "object") {
      throw new Error("The live-trade feed is not a JSON object.");
    }
    if (feed.schema_version !== "mbbot.live-trades.feed.v1") {
      throw new Error("The live-trade feed schema is unsupported.");
    }
    if (!Array.isArray(feed.trades)) {
      throw new Error("The live-trade feed does not contain a trade list.");
    }
    return feed;
  }

  return Object.freeze({
    STRATEGY_IDS,
    numeric,
    strategyTrades,
    filterTrades,
    summarize,
    validateFeed,
  });
});
