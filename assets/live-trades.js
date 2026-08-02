(function initializeLiveTrades() {
  "use strict";

  const model = window.MBBotLiveTradesModel;
  const page = document.querySelector("[data-live-trades-page]");
  if (!model || !page) return;

  const feedUrl = page.dataset.feedUrl;
  const refreshButton = document.getElementById("live-refresh");
  const feedStatus = document.getElementById("live-feed-status");
  const strategyTabs = [...document.querySelectorAll("[data-strategy-tab]")];
  const strategyPanels = [...document.querySelectorAll("[data-strategy-panel]")];
  let feed = null;
  let activeStrategy = "workflow_125";

  const moneyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });

  function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.title) node.title = options.title;
    for (const [name, value] of Object.entries(options.attributes || {})) {
      if (value !== null && value !== undefined) node.setAttribute(name, value);
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child) node.append(child);
    }
    return node;
  }

  function numeric(value) {
    return model.numeric(value);
  }

  function formatMoney(value, { signed = false } = {}) {
    const parsed = numeric(value);
    if (parsed === null) return "—";
    const output = moneyFormatter.format(Math.abs(parsed));
    if (!signed || parsed === 0) return parsed < 0 ? `-${output}` : output;
    return `${parsed > 0 ? "+" : "-"}${output}`;
  }

  function formatPercent(value, { signed = false } = {}) {
    const parsed = numeric(value);
    if (parsed === null) return "—";
    const prefix = signed && parsed > 0 ? "+" : "";
    return `${prefix}${numberFormatter.format(parsed)}%`;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    const options = {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const ny = new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: "America/New_York",
    }).format(parsed);
    const riyadh = new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: "Asia/Riyadh",
    }).format(parsed);
    return `${ny} ET / ${riyadh} Riyadh`;
  }

  function labelize(value) {
    if (!value) return "—";
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function resultClass(trade) {
    if (trade.status === "open") return "open";
    if (["win", "loss", "flat"].includes(trade.result)) return trade.result;
    return "flat";
  }

  function field(label, value, className = "") {
    return element("div", { className: `live-field ${className}`.trim() }, [
      element("span", { text: label }),
      element("strong", { text: value }),
    ]);
  }

  function detailField(label, value) {
    return element("div", { className: "live-detail-field" }, [
      element("dt", { text: label }),
      element("dd", { text: value ?? "—" }),
    ]);
  }

  function strategyEvidence(trade) {
    const details = trade.details || {};
    if (trade.strategy_id === "workflow_125") {
      return [
        ["Momentum", formatPercent(details.momentum_percent, { signed: true })],
        ["Absolute Delta", details.delta || "—"],
        ["RSI(14)", details.rsi || "—"],
        ["Relative spread", formatPercent(details.spread_percent)],
        ["Signal bar", formatDateTime(details.signal_bar_time)],
      ];
    }
    return [
      ["D · absolute Delta", details.entry_delta || "—"],
      ["A · 5m acceleration", `${details.underlying_acceleration_5m_pct || "—"} pp`],
      ["V · option vs VWAP", formatPercent(details.option_vwap_deviation_pct)],
      ["P · underlying", formatMoney(trade.entry?.underlying_price)],
      ["O · opening-low distance", formatPercent(details.opening_low_distance_pct)],
      ["Kept branch", labelize(details.keep_branch)],
      ["Decision time", formatDateTime(details.decision_time)],
    ];
  }

  function tradeCard(trade) {
    const outcome = resultClass(trade);
    const right = String(trade.right || "option").toUpperCase();
    const strike = trade.strike ? `$${trade.strike}` : "—";
    const identity = element("div", { className: "live-trade-identity" }, [
      element("div", { className: "live-trade-title" }, [
        element("strong", { text: trade.symbol || "Unknown" }),
        element("span", { text: `${strike} ${right}` }),
      ]),
      element("code", { text: trade.trade_id || "Missing trade ID" }),
    ]);
    const status = element("span", {
      className: `live-status live-status--${outcome}`,
      text: trade.status === "open" ? "OPEN" : String(trade.result || "closed").toUpperCase(),
    });
    const exitText = trade.status === "closed"
      ? `${formatMoney(trade.exit?.bid)} • ${labelize(trade.exit?.reason)}`
      : "Monitoring exit";
    const returnValue = trade.status === "closed"
      ? `${formatPercent(trade.return_percent, { signed: true })} / ${formatMoney(trade.pnl, { signed: true })}`
      : "Open position";

    const primary = element("div", { className: "live-trade-primary" }, [
      identity,
      field("Entry time", formatDateTime(trade.entry?.time), "live-field--time"),
      field("Expiry", `${trade.expiration || "—"}${trade.dte === null || trade.dte === undefined ? "" : ` • ${trade.dte} DTE`}`),
      field("Entry bid / ask", `${formatMoney(trade.entry?.bid)} / ${formatMoney(trade.entry?.ask)}`),
      field("Exit", exitText),
      field("Return / P&L", returnValue, `live-field--${outcome}`),
      status,
    ]);

    const evidence = strategyEvidence(trade).map(([label, value]) =>
      detailField(label, value),
    );
    const detailGrid = element("dl", { className: "live-detail-grid" }, [
      detailField("Trade ID", trade.trade_id),
      detailField("Contract", trade.contract_id),
      detailField("Strike / right", `${strike} ${right}`),
      detailField("Expiration", trade.expiration),
      detailField("Underlying at entry", formatMoney(trade.entry?.underlying_price)),
      detailField("Target bid", formatMoney(trade.target_bid)),
      detailField("Stop bid", formatMoney(trade.stop_bid)),
      detailField("Entry quote time", formatDateTime(trade.entry?.quote_time)),
      detailField("Exit time", formatDateTime(trade.exit?.time)),
      ...evidence,
    ]);
    const details = element("details", { className: "live-trade-details" }, [
      element("summary", { text: "View contract and signal evidence" }),
      detailGrid,
    ]);
    return element("article", {
      className: `live-trade-card live-trade-card--${outcome}`,
    }, [primary, details]);
  }

  function filtersFor(panel) {
    return {
      query: panel.querySelector('[data-filter="query"]').value,
      status: panel.querySelector('[data-filter="status"]').value,
      result: panel.querySelector('[data-filter="result"]').value,
      order: panel.querySelector('[data-filter="order"]').value,
    };
  }

  function setMetric(panel, name, value, className = "") {
    const node = panel.querySelector(`[data-metric="${name}"]`);
    if (!node) return;
    node.textContent = value;
    node.classList.remove("positive", "negative");
    if (className) node.classList.add(className);
  }

  function renderPanel(panel) {
    if (!feed) return;
    const strategyId = panel.dataset.strategyPanel;
    const allTrades = model.strategyTrades(feed, strategyId);
    const visible = model.filterTrades(allTrades, filtersFor(panel));
    const summary = model.summarize(allTrades);
    const list = panel.querySelector("[data-trade-list]");
    const empty = panel.querySelector("[data-trade-empty]");
    const count = panel.querySelector("[data-visible-count]");
    list.replaceChildren(...visible.map(tradeCard));
    empty.hidden = visible.length > 0;
    count.textContent = `${visible.length} of ${allTrades.length} trade${allTrades.length === 1 ? "" : "s"}`;
    setMetric(panel, "open", numberFormatter.format(summary.open));
    setMetric(panel, "closed", numberFormatter.format(summary.closed));
    setMetric(
      panel,
      "win_rate",
      summary.win_rate_percent === null
        ? "—"
        : formatPercent(summary.win_rate_percent),
    );
    setMetric(
      panel,
      "realized_pnl",
      formatMoney(summary.realized_pnl, { signed: true }),
      summary.realized_pnl > 0 ? "positive" : summary.realized_pnl < 0 ? "negative" : "",
    );
    setMetric(
      panel,
      "expectancy",
      summary.expectancy === null
        ? "—"
        : formatMoney(summary.expectancy, { signed: true }),
      summary.expectancy > 0 ? "positive" : summary.expectancy < 0 ? "negative" : "",
    );
  }

  function render() {
    for (const panel of strategyPanels) renderPanel(panel);
    for (const tab of strategyTabs) {
      const trades = feed
        ? model.strategyTrades(feed, tab.dataset.strategyTab)
        : [];
      const count = tab.querySelector("[data-strategy-count]");
      if (count) count.textContent = `${trades.length} trade${trades.length === 1 ? "" : "s"}`;
    }
  }

  function selectStrategy(strategyId, { updateUrl = true } = {}) {
    if (!model.STRATEGY_IDS.includes(strategyId)) return;
    activeStrategy = strategyId;
    for (const tab of strategyTabs) {
      const selected = tab.dataset.strategyTab === strategyId;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of strategyPanels) {
      panel.hidden = panel.dataset.strategyPanel !== strategyId;
    }
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("strategy", strategyId);
      window.history.replaceState({}, "", url);
    }
  }

  function feedStatusText(updatedAt) {
    if (!updatedAt) return "Connected • waiting for the first local trade";
    return `Latest local mirror: ${formatDateTime(updatedAt)}`;
  }

  async function loadFeed({ manual = false } = {}) {
    if (!feedUrl) return;
    refreshButton.disabled = true;
    page.setAttribute("aria-busy", "true");
    feedStatus.textContent = manual ? "Refreshing the local trade mirror…" : "Loading the local trade mirror…";
    try {
      const response = await fetch(feedUrl, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github.raw+json" },
      });
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "The live-trades data branch is not initialized yet."
            : response.status === 403
              ? "GitHub's public read limit was reached. Try again shortly."
              : `GitHub returned HTTP ${response.status}.`,
        );
      }
      feed = model.validateFeed(await response.json());
      feedStatus.textContent = feedStatusText(feed.updated_at);
      feedStatus.dataset.state = "ready";
      render();
    } catch (error) {
      feedStatus.textContent = feed
        ? `${error.message} Showing the last loaded snapshot.`
        : error.message;
      feedStatus.dataset.state = "error";
    } finally {
      page.removeAttribute("aria-busy");
      refreshButton.disabled = false;
    }
  }

  for (const tab of strategyTabs) {
    tab.addEventListener("click", () => selectStrategy(tab.dataset.strategyTab));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const index = strategyTabs.indexOf(tab);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const target = strategyTabs[(index + direction + strategyTabs.length) % strategyTabs.length];
      selectStrategy(target.dataset.strategyTab);
      target.focus();
    });
  }

  for (const panel of strategyPanels) {
    for (const control of panel.querySelectorAll("[data-filter]")) {
      control.addEventListener(control.matches('input[type="search"]') ? "input" : "change", () => renderPanel(panel));
    }
    panel.querySelector("[data-clear-filters]").addEventListener("click", () => {
      panel.querySelector('[data-filter="query"]').value = "";
      panel.querySelector('[data-filter="status"]').value = "all";
      panel.querySelector('[data-filter="result"]').value = "all";
      panel.querySelector('[data-filter="order"]').value = "newest";
      renderPanel(panel);
    });
  }

  refreshButton.addEventListener("click", () => loadFeed({ manual: true }));
  const requested = new URLSearchParams(window.location.search).get("strategy");
  if (model.STRATEGY_IDS.includes(requested)) activeStrategy = requested;
  selectStrategy(activeStrategy, { updateUrl: false });
  loadFeed();
  window.setInterval(() => loadFeed(), 5 * 60 * 1000);
})();
