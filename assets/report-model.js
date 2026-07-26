(function exposeReportModel(root, factory) {
  "use strict";
  const model = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = model;
  }
  if (root) {
    root.MBbotReportModel = model;
  }
})(typeof globalThis === "object" ? globalThis : this, function createReportModel() {
  "use strict";

  const EXECUTION_FIELDS = new Set([
    "symbol",
    "option_type",
    "direction",
    "contract_id",
    "expiration",
    "strike",
    "entry_quote_sequence",
    "entry_bid",
    "entry_ask",
    "entry_price",
    "entry_fill_source",
    "entry_spread_percent",
    "entry_delay_seconds",
    "exit_quote_sequence",
    "exit_bid",
    "exit_ask",
    "exit_price",
    "exit_fill_source",
    "exit_spread_percent",
    "exit_delay_seconds",
    "slippage_basis_points",
    "commission",
    "fees",
  ]);
  const OUTCOME_FIELDS = new Set([
    "exit_reason",
    "exit_reasons",
    "return_percent",
    "gross_pnl",
    "net_pnl",
  ]);
  const VALIDATION_FIELDS = new Set([
    "trade_id",
    "dataset_fingerprint",
    "underlying_source",
    "signal_bar_source",
    "entry_quote_source",
    "exit_quote_source",
    "market_timezone",
    "user_timezone",
  ]);
  const COMPARISON_DIMENSIONS = [
    {
      id: "dataset-start",
      label: "Dataset start",
      group: "Data window",
      kind: "date",
      read: (report) => report?.dataset?.first_timestamp,
    },
    {
      id: "dataset-end",
      label: "Dataset end",
      group: "Data window",
      kind: "date",
      read: (report) => report?.dataset?.last_timestamp,
    },
    {
      id: "sessions",
      label: "Trading sessions",
      group: "Data coverage",
      kind: "integer",
      read: (report) => report?.dataset?.sessions,
    },
    {
      id: "underlying-points",
      label: "Underlying points",
      group: "Data coverage",
      kind: "integer",
      read: (report) => report?.dataset?.underlying_points,
    },
    {
      id: "option-bars",
      label: "Option bars",
      group: "Data coverage",
      kind: "integer",
      read: (report) => report?.dataset?.option_bars,
    },
    {
      id: "option-quotes",
      label: "Option quotes",
      group: "Data coverage",
      kind: "integer",
      read: (report) => report?.dataset?.option_quotes,
    },
    {
      id: "symbols",
      label: "Symbols",
      group: "Universe",
      kind: "setting",
      setting: "backtest.symbols",
    },
    {
      id: "bar-minutes",
      label: "Bar interval",
      group: "Replay model",
      kind: "minutes",
      setting: "backtest.bar_minutes",
    },
    {
      id: "contracts",
      label: "Contracts per trade",
      group: "Replay model",
      kind: "setting",
      setting: "backtest.contracts_per_trade",
    },
    {
      id: "multiplier",
      label: "Contract multiplier",
      group: "Replay model",
      kind: "setting",
      setting: "backtest.contract_multiplier",
    },
    {
      id: "commission",
      label: "Commission per contract",
      group: "Costs & fills",
      kind: "money",
      setting: "backtest.commission_per_contract",
    },
    {
      id: "profit-price-source",
      label: "Profit price source",
      group: "Costs & fills",
      kind: "setting",
      setting: "exit.profit_price_source",
    },
  ];

  function findFlatSetting(report, suffix) {
    const item = (report?.strategy?.settings_flat || []).find(
      (candidate) =>
        candidate.path === suffix || candidate.path.endsWith(`.${suffix}`),
    );
    return item?.value;
  }

  function stableComparable(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => stableComparable(item))
        .sort()
        .join("|");
    }
    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .map((key) => `${key}:${stableComparable(value[key])}`)
        .join("|");
    }
    return String(value ?? "");
  }

  function buildCompatibilityRows(reports) {
    return COMPARISON_DIMENSIONS.map((dimension) => {
      const values = (reports || []).map((report) =>
        dimension.setting
          ? findFlatSetting(report, dimension.setting)
          : dimension.read(report),
      );
      const recorded = values.every(
        (value) => value !== null && value !== undefined && value !== "",
      );
      const distinct = new Set(values.map((value) => stableComparable(value)));
      return {
        id: dimension.id,
        label: dimension.label,
        group: dimension.group,
        kind: dimension.kind,
        values,
        state: !recorded
          ? "missing"
          : distinct.size === 1
            ? "match"
            : "different",
      };
    });
  }

  function differingSettings(reports) {
    const maps = (reports || []).map(
      (report) =>
        new Map(
          (report?.strategy?.settings_flat || []).map((item) => [
            String(item.path),
            item.value,
          ]),
        ),
    );
    const paths = new Set(maps.flatMap((map) => [...map.keys()]));
    return [...paths]
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        path,
        values: maps.map((map) => map.get(path) ?? "not set"),
      }))
      .filter(
        (row) =>
          new Set(row.values.map((value) => stableComparable(value))).size > 1,
      );
  }

  function isTimelineField(column) {
    return (
      column === "session_date" ||
      column === "expiration" ||
      /(?:^|_)(?:time|timestamp|date)(?:_(?:utc|user))?$/.test(column) ||
      /(?:^|_)(?:opened|closed|created|updated|filled|entered|exited|signaled)_at$/.test(
        column,
      )
    );
  }

  function compareTradeValues(a, b, column) {
    const aValue = a?.[column];
    const bValue = b?.[column];
    if (isTimelineField(column)) {
      const aDate = Date.parse(aValue);
      const bDate = Date.parse(bValue);
      if (Number.isFinite(aDate) && Number.isFinite(bDate)) {
        return aDate - bDate;
      }
    }
    const aNumber =
      aValue === null || aValue === undefined || aValue === ""
        ? null
        : Number(aValue);
    const bNumber =
      bValue === null || bValue === undefined || bValue === ""
        ? null
        : Number(bValue);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }
    return String(aValue ?? "").localeCompare(String(bValue ?? ""));
  }

  function groupTradeColumns(columns) {
    const unique = [];
    const seen = new Set();
    for (const value of columns || []) {
      const column = String(value);
      if (!seen.has(column)) {
        unique.push(column);
        seen.add(column);
      }
    }
    const groups = {
      timeline: [],
      execution: [],
      outcome: [],
      validation: [],
      features: [],
    };
    for (const column of unique) {
      if (isTimelineField(column)) groups.timeline.push(column);
      else if (EXECUTION_FIELDS.has(column)) groups.execution.push(column);
      else if (OUTCOME_FIELDS.has(column)) groups.outcome.push(column);
      else if (
        VALIDATION_FIELDS.has(column) ||
        /(?:^|_)(?:source|fingerprint|checksum|sha256)$/.test(column)
      )
        groups.validation.push(column);
      else groups.features.push(column);
    }
    return groups;
  }

  return Object.freeze({
    buildCompatibilityRows,
    compareTradeValues,
    differingSettings,
    groupTradeColumns,
    isTimelineField,
  });
});
