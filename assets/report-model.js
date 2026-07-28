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
    "mae_quote_sequence",
    "mae_bid",
    "mae_ask",
    "mae_price_source",
    "mfe_quote_sequence",
    "mfe_bid",
    "mfe_ask",
    "mfe_price_source",
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
    "minimum_bid_return_percent",
    "maximum_adverse_excursion_percent",
    "maximum_bid_return_percent",
    "maximum_favorable_excursion_percent",
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
    "signal_greek_source",
    "exit_greek_source",
    "signal_trade_side_source",
    "exit_trade_side_source",
    "market_timezone",
    "user_timezone",
  ]);
  const COMPARISON_DIMENSIONS = [
    {
      id: "dataset-start",
      label: "Dataset start",
      group: "Data window",
      kind: "date",
      flag: "setup",
      guidance:
        "Different start dates expose the runs to different market conditions. Treat aggregate and rate deltas as unlike periods.",
      read: (report) => report?.dataset?.first_timestamp,
    },
    {
      id: "dataset-end",
      label: "Dataset end",
      group: "Data window",
      kind: "date",
      flag: "setup",
      guidance:
        "Different end dates expose the runs to different market conditions. Align the window before attributing a result to strategy settings.",
      read: (report) => report?.dataset?.last_timestamp,
    },
    {
      id: "sessions",
      label: "Trading sessions",
      group: "Data coverage",
      kind: "integer",
      flag: "context",
      guidance:
        "Session counts normally change when the selected symbol basket changes. Total P&L and trade counts are not directly comparable until the universe is aligned.",
      read: (report) => report?.dataset?.sessions,
    },
    {
      id: "underlying-points",
      label: "Underlying points",
      group: "Data coverage",
      kind: "integer",
      flag: "context",
      guidance:
        "Underlying-point totals describe coverage, not performance. A different symbol basket can explain this difference.",
      read: (report) => report?.dataset?.underlying_points,
    },
    {
      id: "option-bars",
      label: "Option bars",
      group: "Data coverage",
      kind: "integer",
      flag: "context",
      guidance:
        "Option-bar totals depend on symbols, contracts, and eligible sessions. Confirm those scopes before treating the difference as a data-quality problem.",
      read: (report) => report?.dataset?.option_bars,
    },
    {
      id: "option-quotes",
      label: "Option quotes",
      group: "Data coverage",
      kind: "integer",
      flag: "context",
      guidance:
        "Quote totals depend on the selected universe and contract coverage. Use this difference to explain sample size, not as a performance signal.",
      read: (report) => report?.dataset?.option_quotes,
    },
    {
      id: "symbols",
      label: "Symbols",
      group: "Universe",
      kind: "setting",
      flag: "setup",
      guidance:
        "Aggregate totals from different symbol baskets are not like-for-like. Compare per-symbol results or rerun the same universe.",
      setting: "backtest.symbols",
    },
    {
      id: "bar-minutes",
      label: "Bar interval",
      group: "Replay model",
      kind: "minutes",
      flag: "setup",
      guidance:
        "A different bar interval changes indicator timing and signal count. Do not attribute metric deltas until it matches.",
      setting: "backtest.bar_minutes",
    },
    {
      id: "contracts",
      label: "Contracts per trade",
      group: "Replay model",
      kind: "setting",
      flag: "setup",
      guidance:
        "Contract count scales dollar exposure and net P&L. Percentage returns and signal quality should be interpreted separately.",
      setting: "backtest.contracts_per_trade",
    },
    {
      id: "multiplier",
      label: "Contract multiplier",
      group: "Replay model",
      kind: "setting",
      flag: "setup",
      guidance:
        "A different multiplier makes dollar P&L incomparable even when entries and percentage returns match.",
      setting: "backtest.contract_multiplier",
    },
    {
      id: "commission",
      label: "Commission per contract",
      group: "Costs & fills",
      kind: "money",
      flag: "setup",
      guidance:
        "Different commission assumptions change every trade's net result. Align costs before comparing net P&L or expectancy.",
      setting: "backtest.commission_per_contract",
    },
    {
      id: "profit-price-source",
      label: "Profit price source",
      group: "Costs & fills",
      kind: "setting",
      flag: "setup",
      guidance:
        "The profit source determines which executable side is used to test the target. The verified replay uses the bid.",
      setting: "exit.profit_price_field",
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
        flag: dimension.flag,
        guidance: dimension.guidance,
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

  function buildStopLossEvidence(report) {
    const metrics = report?.metrics || {};
    const exit = report?.strategy?.settings?.exit || {};
    const finiteNumber = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const scenarioMetrics = (value) => {
      if (!value || typeof value !== "object") return null;
      return {
        closedTrades: finiteNumber(value.closed_trades),
        wins: finiteNumber(value.wins),
        losses: finiteNumber(value.losses),
        flat: finiteNumber(value.flat),
        winRate: finiteNumber(value.win_rate),
        netPnl: finiteNumber(value.net_pnl),
        grossProfit: finiteNumber(value.gross_profit),
        grossLoss: finiteNumber(value.gross_loss),
        profitFactor: finiteNumber(value.profit_factor),
        averageReturnPercent: finiteNumber(value.average_return_percent),
        expectancy: finiteNumber(value.expectancy),
        maxDrawdown: finiteNumber(value.max_drawdown),
        exitReasonCounts:
          value.exit_reason_counts &&
          typeof value.exit_reason_counts === "object"
            ? { ...value.exit_reason_counts }
            : {},
      };
    };
    const total = finiteNumber(
      metrics.excursion_trades ?? metrics.closed_trades,
    );
    const groupTotals = {
      all: total,
      winners: finiteNumber(metrics.wins),
      losers: finiteNumber(metrics.losses),
      flat: finiteNumber(metrics.flat),
    };
    const pathRows = (report?.charts?.stop_loss_reach || [])
      .map((row) => {
        const threshold = finiteNumber(row.threshold_percent);
        if (threshold === null) return null;
        return {
          threshold,
          all: {
            count: finiteNumber(row.trades_reached),
            percent: finiteNumber(row.trades_reached_percent),
            total: groupTotals.all,
          },
          winners: {
            count: finiteNumber(row.winning_trades_reached),
            percent: finiteNumber(row.winning_trades_reached_percent),
            total: groupTotals.winners,
          },
          losers: {
            count: finiteNumber(row.losing_trades_reached),
            percent: finiteNumber(row.losing_trades_reached_percent),
            total: groupTotals.losers,
          },
          flat: {
            count: finiteNumber(row.flat_trades_reached),
            percent: finiteNumber(row.flat_trades_reached_percent),
            total: groupTotals.flat,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.threshold - b.threshold);
    const sweep =
      report?.analysis?.stop_loss_sweep ||
      report?.extensions?.analysis?.stop_loss_sweep ||
      null;
    const reportFingerprint =
      report?.dataset?.dataset_fingerprint ||
      report?.extensions?.audit?.dataset_fingerprint ||
      null;
    const sweepFingerprint = sweep?.dataset_fingerprint || null;
    const replayFingerprintMatches =
      !reportFingerprint ||
      !sweepFingerprint ||
      reportFingerprint === sweepFingerprint;
    const replayRows =
      sweep?.method === "full_strategy_replay" &&
      Array.isArray(sweep?.thresholds) &&
      replayFingerprintMatches
        ? sweep.thresholds
            .map((row) => {
              const threshold = finiteNumber(row?.threshold_percent);
              const normalizedMetrics = scenarioMetrics(row?.metrics);
              if (threshold === null || !normalizedMetrics) return null;
              return {
                threshold,
                metrics: normalizedMetrics,
                matchesConfiguredRun:
                  row.matches_configured_run === true,
                scenarioFingerprint:
                  row.scenario_fingerprint || null,
              };
            })
            .filter(Boolean)
        : [];
    const pathByThreshold = new Map(
      pathRows.map((row) => [row.threshold, row]),
    );
    const replayByThreshold = new Map(
      replayRows.map((row) => [row.threshold, row]),
    );
    const thresholds = [
      ...new Set([
        ...pathByThreshold.keys(),
        ...replayByThreshold.keys(),
      ]),
    ].sort((a, b) => a - b);
    const currentStopEnabled = exit.stop_loss_enabled === true;
    const currentStopPercent = finiteNumber(exit.stop_loss_percent);
    const medianMae = finiteNumber(metrics.median_mae_percent);
    const target =
      currentStopEnabled && currentStopPercent !== null
        ? currentStopPercent
        : medianMae;
    const defaultRow =
      target === null || !thresholds.length
        ? thresholds[0] ?? null
        : thresholds.reduce((closest, threshold) =>
            Math.abs(threshold - target) < Math.abs(closest - target)
              ? threshold
              : closest,
          );
    const configured =
      scenarioMetrics(sweep?.configured_metrics) ||
      scenarioMetrics(metrics);
    const rows = thresholds.map((threshold) => {
      const path = pathByThreshold.get(threshold) || {
        threshold,
        all: { count: null, percent: null, total: groupTotals.all },
        winners: {
          count: null,
          percent: null,
          total: groupTotals.winners,
        },
        losers: {
          count: null,
          percent: null,
          total: groupTotals.losers,
        },
        flat: { count: null, percent: null, total: groupTotals.flat },
      };
      const replay = replayByThreshold.get(threshold) || null;
      return {
        ...path,
        replay,
        replayDelta:
          replay && configured
            ? {
                closedTrades:
                  replay.metrics.closedTrades === null ||
                  configured.closedTrades === null
                    ? null
                    : replay.metrics.closedTrades -
                      configured.closedTrades,
                winRate:
                  replay.metrics.winRate === null ||
                  configured.winRate === null
                    ? null
                    : replay.metrics.winRate - configured.winRate,
                netPnl:
                  replay.metrics.netPnl === null ||
                  configured.netPnl === null
                    ? null
                    : replay.metrics.netPnl - configured.netPnl,
                maxDrawdown:
                  replay.metrics.maxDrawdown === null ||
                  configured.maxDrawdown === null
                    ? null
                    : replay.metrics.maxDrawdown -
                      configured.maxDrawdown,
              }
            : null,
        censoredByCurrentStop:
          currentStopEnabled &&
          currentStopPercent !== null &&
          threshold >= currentStopPercent,
      };
    });
    return {
      currentStopEnabled,
      currentStopPercent,
      defaultThreshold: defaultRow,
      groupTotals,
      configured,
      replayAvailable: replayRows.length > 0,
      replayFingerprintMatches,
      replayMethod: sweep?.method || null,
      rows,
    };
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
    buildStopLossEvidence,
    compareTradeValues,
    differingSettings,
    groupTradeColumns,
    isTimelineField,
  });
});
