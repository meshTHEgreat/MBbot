(() => {
  "use strict";

  const page = document.body.dataset.page;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
  const number = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  });
  const integer = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  });
  const dateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const preciseDateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
  const localTimeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "local timezone";

  function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(options)) {
      if (key === "className") {
        node.className = value;
      } else if (key === "text") {
        node.textContent = value;
      } else if (key === "dataset") {
        Object.assign(node.dataset, value);
      } else if (key.startsWith("aria-")) {
        node.setAttribute(key, value);
      } else if (value !== null && value !== undefined) {
        node.setAttribute(key, value);
      }
    }
    for (const child of children) {
      node.append(child);
    }
    return node;
  }

  function preserveFocusAcrossLayout(
    mobileContainer,
    desktopContainer,
    fallback,
  ) {
    if (!window.matchMedia || !mobileContainer || !desktopContainer) return;
    const desktopLayout = window.matchMedia("(min-width: 900px)");
    const handleLayoutChange = (event) => {
      const active = document.activeElement;
      const source = event.matches ? mobileContainer : desktopContainer;
      if (!active || !source.contains(active)) return;
      const target = event.matches ? desktopContainer : mobileContainer;
      const reportId = active.dataset?.reportId;
      const equivalent = reportId
        ? [...target.querySelectorAll("[data-report-id]")].find(
            (node) => node.dataset.reportId === reportId,
          )
        : null;
      (equivalent || fallback)?.focus();
    };
    if (desktopLayout.addEventListener) {
      desktopLayout.addEventListener("change", handleLayoutChange);
    } else {
      desktopLayout.addListener(handleLayoutChange);
    }
  }

  function readJson(id) {
    const node = document.getElementById(id);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      console.error(`Cannot parse ${id}`, error);
      return null;
    }
  }

  function numeric(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatMoney(value) {
    const parsed = numeric(value);
    return parsed === null ? "—" : money.format(parsed);
  }

  function formatPercent(value, sign = false) {
    const parsed = numeric(value);
    if (parsed === null) return "—";
    const prefix = sign && parsed > 0 ? "+" : "";
    return `${prefix}${number.format(parsed)}%`;
  }

  function formatNumber(value) {
    const parsed = numeric(value);
    return parsed === null ? "—" : number.format(parsed);
  }

  function formatInteger(value) {
    const parsed = numeric(value);
    return parsed === null ? "—" : integer.format(parsed);
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? String(value) : dateTime.format(parsed);
  }

  function formatPreciseDate(value) {
    if (!value) return "Not recorded";
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf())
      ? String(value)
      : preciseDateTime.format(parsed);
  }

  function valueClass(value) {
    const parsed = numeric(value);
    if (parsed === null || parsed === 0) return "neutral";
    return parsed > 0 ? "positive" : "negative";
  }

  function statusNode(status) {
    const normalized = String(status || "unverified").toLowerCase();
    return element("span", {
      className: `status status-${normalized}`,
      text: normalized,
    });
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Theme still works for this page load when storage is unavailable.
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const next = theme === "dark" ? "light" : "dark";
      button.setAttribute("aria-label", `Use ${next} theme`);
      const label = button.querySelector(".theme-label");
      if (label) label.textContent = next[0].toUpperCase() + next.slice(1);
    });
    window.dispatchEvent(new CustomEvent("mbbot:theme"));
  }

  function initializeTheme() {
    const stored = safeStorageGet("mbbot-report-theme");
    const preferred = window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    applyTheme(stored === "light" || stored === "dark" ? stored : preferred);
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const next =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        safeStorageSet("mbbot-report-theme", next);
        applyTheme(next);
      });
    });
  }

  function settingsText(report) {
    return (report.strategy?.settings_flat || [])
      .map((item) => `${item.path} ${item.value}`)
      .join(" ");
  }

  function initializeBacktestControl() {
    const form = document.getElementById("backtest-form");
    const submit = document.getElementById("run-backtest-button");
    const status = document.getElementById("backtest-control-status");
    const stateLabel = document.getElementById("runner-state-title");
    const state = document.querySelector(".runner-state");
    const runTitle = document.getElementById("backtest-run-title");
    const error = document.getElementById("backtest-control-error");
    const resultActions = document.getElementById("backtest-result-actions");
    const resultLink = document.getElementById("backtest-result-link");
    const profile = form?.elements.namedItem("dataset_profile");
    const signalSource = form?.elements.namedItem("signal_source");
    const signalSourceHelp = document.getElementById("signal-source-help");
    const symbolInputs = [
      ...(form?.querySelectorAll('input[name="symbol"]') || []),
    ];
    const symbolsError = document.getElementById("symbols-error");
    const model = window.MBbotBacktestControlModel;
    if (
      !form ||
      !submit ||
      !status ||
      !stateLabel ||
      !state ||
      !runTitle ||
      !error ||
      !resultActions ||
      !resultLink ||
      !profile ||
      !signalSource ||
      !model
    ) {
      return;
    }

    const configured = window.MBbotSiteConfig?.backtestDispatchUrl;
    let gatewayUrl = null;
    try {
      const parsed = new URL(configured);
      const loopback =
        parsed.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
      if (
        (parsed.protocol !== "https:" && !loopback) ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error("Unsupported dispatch gateway URL");
      }
      gatewayUrl = parsed.href.replace(/\/+$/, "");
    } catch {
      submit.disabled = true;
    }

    function setRunnerState(nextState, title, message, heading) {
      state.dataset.state = nextState;
      stateLabel.textContent = title;
      status.textContent = message;
      if (heading) runTitle.textContent = heading;
    }

    function clearError() {
      error.hidden = true;
      error.textContent = "";
      symbolsError.textContent = "";
      form
        .querySelectorAll('[aria-invalid="true"]')
        .forEach((control) => control.removeAttribute("aria-invalid"));
    }

    function showError(message, fieldName = null) {
      error.textContent = message;
      error.hidden = false;
      error.focus();
      setRunnerState(
        "error",
        "Request needs attention",
        "Nothing was queued. Your settings are preserved below.",
        "Correct the highlighted setting and try again.",
      );
      if (fieldName === "symbols") {
        symbolsError.textContent = message;
        symbolInputs[0]?.focus();
        return;
      }
      const field = form.elements.namedItem(fieldName);
      if (field instanceof HTMLElement) {
        field.setAttribute("aria-invalid", "true");
        field.focus();
      }
    }

    const selectionsByProfile = new Map([
      [
        "databento-opra-2026-06",
        new Set(symbolInputs.filter((input) => input.checked).map((input) => input.value)),
      ],
      ["thetadata-spy-2025-08-19", new Set(["SPY"])],
    ]);
    let previousProfile = profile.value;

    function updateSignalSourceHelp() {
      if (!signalSourceHelp) return;
      signalSourceHelp.textContent =
        signalSource.value === "databento_option_contract"
          ? "The selected option contract's completed five-minute bars drive MACD, RSI, and SMI. Databento also supplies contract selection and bid/ask fills."
          : "Saved AV stock bars set the bullish or bearish direction. Databento still supplies option selection and bid/ask fills.";
    }

    function applyProfileSymbols() {
      selectionsByProfile.set(
        previousProfile,
        new Set(
          symbolInputs
            .filter((input) => input.checked && !input.disabled)
            .map((input) => input.value),
        ),
      );
      const available = new Set(model.PROFILE_SYMBOLS[profile.value] || []);
      const remembered =
        selectionsByProfile.get(profile.value) || new Set(available);
      symbolInputs.forEach((input) => {
        const supported = available.has(input.value);
        input.disabled = !supported;
        input.closest("label")?.classList.toggle("is-disabled", !supported);
        input.checked = supported && remembered.has(input.value);
      });
      if (!symbolInputs.some((input) => input.checked && !input.disabled)) {
        const firstAvailable = symbolInputs.find((input) => !input.disabled);
        if (firstAvailable) firstAvailable.checked = true;
      }
      previousProfile = profile.value;
      const availableSignals = new Set(
        model.PROFILE_SIGNAL_SOURCES[profile.value] || [],
      );
      [...signalSource.options].forEach((option) => {
        option.disabled = !availableSignals.has(option.value);
      });
      if (!availableSignals.has(signalSource.value)) {
        signalSource.value = [...availableSignals][0] || "";
      }
      updateSignalSourceHelp();
      clearError();
    }

    function readValues() {
      const value = (name) => {
        const field = form.elements.namedItem(name);
        return field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement
          ? field.value
          : "";
      };
      const checked = (name) => {
        const field = form.elements.namedItem(name);
        return field instanceof HTMLInputElement && field.checked;
      };
      return {
        dataset_profile: value("dataset_profile"),
        experiment_label: value("experiment_label").trim(),
        signal_source: value("signal_source"),
        symbols: symbolInputs
          .filter((input) => input.checked && !input.disabled)
          .map((input) => input.value),
        macd_fast_period: value("macd_fast_period"),
        macd_slow_period: value("macd_slow_period"),
        macd_signal_period: value("macd_signal_period"),
        macd_ema_seed_method: value("macd_ema_seed_method"),
        zero_line_filter_enabled: checked("zero_line_filter_enabled"),
        rsi_enabled: checked("rsi_enabled"),
        max_premium_enabled: checked("max_premium_enabled"),
        max_spread_enabled: checked("max_spread_enabled"),
        entry_window_enabled: checked("entry_window_enabled"),
        profit_target_enabled: checked("profit_target_enabled"),
        opposite_macd_enabled: checked("opposite_macd_enabled"),
        time_exit_enabled: checked("time_exit_enabled"),
        rsi_period: value("rsi_period"),
        rsi_minimum: value("rsi_minimum"),
        rsi_maximum: value("rsi_maximum"),
        smi_enabled: checked("smi_enabled"),
        smi_entry_mode: value("smi_entry_mode"),
        smi_k_length: value("smi_k_length"),
        smi_d_length: value("smi_d_length"),
        smi_signal_length: value("smi_signal_length"),
        smi_ema_seed_method: value("smi_ema_seed_method"),
        smi_zone_filter_enabled: checked("smi_zone_filter_enabled"),
        smi_oversold: value("smi_oversold"),
        smi_overbought: value("smi_overbought"),
        opposite_smi_enabled: checked("opposite_smi_enabled"),
        max_premium: value("max_premium"),
        max_spread_percent: value("max_spread_percent"),
        spread_denominator: value("spread_denominator"),
        allow_zero_dte: checked("allow_zero_dte"),
        scan_next_strike_if_nearest_fails: checked(
          "scan_next_strike_if_nearest_fails",
        ),
        fallback_to_next_expiration: checked(
          "fallback_to_next_expiration",
        ),
        profit_target_percent: value("profit_target_percent"),
        commission_per_contract: value("commission_per_contract"),
        contracts_per_trade: value("contracts_per_trade"),
        entry_delay_minutes: value("entry_delay_minutes"),
        entry_cutoff_minutes: value("entry_cutoff_minutes"),
        force_exit_time_riyadh: value("force_exit_time_riyadh"),
        validate_only: checked("validate_only"),
      };
    }

    function accessKey() {
      const field = form.elements.namedItem("runner_access_key");
      return field instanceof HTMLInputElement ? field.value : "";
    }

    function clearAccessKey() {
      const field = form.elements.namedItem("runner_access_key");
      if (field instanceof HTMLInputElement) field.value = "";
    }

    async function gatewayRequest(path, key, options = {}) {
      const response = await fetch(`${gatewayUrl}${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${key}`,
          ...(options.body ? { "content-type": "application/json" } : {}),
        },
        cache: "no-store",
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      if (!response.ok) {
        throw new Error(
          payload.message ||
            `The dispatch gateway returned HTTP ${response.status}.`,
        );
      }
      return payload;
    }

    const wait = (milliseconds) =>
      new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    async function waitForPublishedReport(reportPath) {
      if (!/^reports\/github-\d+-\d+\.html$/.test(reportPath || "")) {
        throw new Error("The runner returned an invalid report path.");
      }
      setRunnerState(
        "publishing",
        "Publishing verified report",
        "The replay passed verification. Waiting for GitHub Pages to publish it.",
        "The calculation is complete; the archive is updating.",
      );
      for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
          const separator = reportPath.includes("?") ? "&" : "?";
          const response = await fetch(
            `${reportPath}${separator}published=${Date.now()}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            resultLink.href = reportPath;
            resultActions.hidden = false;
            clearAccessKey();
            setRunnerState(
              "success",
              "Report published",
              "The verified run is now available in the archive and comparison view.",
              "Your experiment is ready to inspect.",
            );
            return;
          }
        } catch {
          // A Pages deployment can temporarily be unavailable while publishing.
        }
        await wait(10_000);
      }
      throw new Error(
        "The backtest completed, but the report is still waiting for GitHub Pages. Refresh the archive shortly.",
      );
    }

    async function followRun(runId, key) {
      for (let attempt = 0; attempt < 1080; attempt += 1) {
        const payload = await gatewayRequest(
          `/api/backtests/${encodeURIComponent(runId)}`,
          key,
        );
        if (payload.status === "queued") {
          setRunnerState(
            "queued",
            "Waiting for local runner",
            "GitHub accepted the request. It will remain queued safely if the PC is offline.",
            `Backtest #${payload.run_number || runId} is queued.`,
          );
        } else if (payload.status === "in_progress") {
          setRunnerState(
            "running",
            "Offline replay running",
            "The local PC is validating data, replaying trades, and verifying the saved result.",
            `Backtest #${payload.run_number || runId} is running.`,
          );
        } else if (payload.status === "completed") {
          if (payload.conclusion !== "success") {
            throw new Error(
              `The backtest finished with status ${payload.conclusion || "unknown"}. No report was published.`,
            );
          }
          if (payload.validation_only) {
            clearAccessKey();
            setRunnerState(
              "success",
              "Validation complete",
              "The local PC verified the configuration, offline guard, and selected dataset. No backtest was run and no report was published.",
              `Validation #${payload.run_number || runId} completed successfully.`,
            );
            return;
          }
          if (!payload.report_path) {
            throw new Error(
              "The backtest succeeded but did not return a report path.",
            );
          }
          await waitForPublishedReport(payload.report_path);
          return;
        }
        await wait(payload.status === "queued" ? 15_000 : 10_000);
      }
      throw new Error(
        "The run exceeded the three-hour monitoring window. It may still be visible after refreshing the archive.",
      );
    }

    profile.addEventListener("change", applyProfileSymbols);
    signalSource.addEventListener("change", updateSignalSourceHelp);
    const dependencyToggles = [
      ...form.querySelectorAll("[data-controls]"),
    ];
    const smiSummary = document.getElementById("smi-summary-state");
    function applyRuleStates() {
      for (let pass = 0; pass < 2; pass += 1) {
        dependencyToggles.forEach((toggle) => {
          const active = toggle.checked && !toggle.disabled;
          String(toggle.dataset.controls || "")
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .forEach((name) => {
              const controlled = form.elements.namedItem(name);
              if (!(controlled instanceof HTMLElement)) return;
              controlled.toggleAttribute("disabled", !active);
              controlled
                .closest(".control-field")
                ?.classList.toggle("is-rule-disabled", !active);
            });
        });
      }
      const smiEnabled = form.elements.namedItem("smi_enabled");
      const smiMode = form.elements.namedItem("smi_entry_mode");
      if (
        smiSummary &&
        smiEnabled instanceof HTMLInputElement &&
        smiMode instanceof HTMLSelectElement
      ) {
        const modeLabels = {
          confirm_macd_state: "confirms MACD state",
          require_same_bar_cross: "same-bar MACD + SMI cross",
          replace_macd: "SMI replaces MACD",
        };
        smiSummary.textContent = smiEnabled.checked
          ? `Enabled · ${modeLabels[smiMode.value] || "custom mode"}`
          : "TradingView standard · disabled by default";
      }
    }
    dependencyToggles.forEach((toggle) => {
      toggle.addEventListener("change", applyRuleStates);
    });
    form.elements
      .namedItem("smi_entry_mode")
      ?.addEventListener("change", applyRuleStates);
    applyRuleStates();
    symbolInputs.forEach((input) => {
      input.addEventListener("change", () => {
        symbolsError.textContent = "";
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();
      resultActions.hidden = true;
      if (!gatewayUrl) {
        showError(
          "Direct submission is not configured yet. The private gateway URL must be deployed first.",
        );
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const key = accessKey();
      if (!key) {
        showError("Enter the runner access key.", "runner_access_key");
        return;
      }
      let inputs;
      try {
        inputs = model.buildInputs(readValues());
      } catch (reason) {
        showError(reason.message, reason.field);
        return;
      }

      submit.disabled = true;
      form.setAttribute("aria-busy", "true");
      setRunnerState(
        "authorizing",
        "Authorizing request",
        "Checking the access key and validating the experiment on the private gateway.",
        "Submitting without leaving this page.",
      );
      try {
        const payload = await gatewayRequest("/api/backtests", key, {
          method: "POST",
          body: JSON.stringify({ inputs }),
        });
        if (!payload.run_id) {
          setRunnerState(
            "queued",
            "Request accepted",
            "The workflow was queued. Refresh the archive after the local runner finishes.",
            "The request is safely queued.",
          );
          return;
        }
        await followRun(payload.run_id, key);
      } catch (reason) {
        showError(
          reason instanceof Error
            ? reason.message
            : "The request could not be completed.",
        );
      } finally {
        submit.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });

    applyProfileSymbols();
    if (gatewayUrl) {
      setRunnerState(
        "ready",
        "Direct submission ready",
        "Choose settings, enter the shared runner key, and queue the offline replay.",
        "The page stays here during the run.",
      );
      submit.disabled = false;
    }
  }

  function findSetting(report, suffix) {
    const item = (report.strategy?.settings_flat || []).find(
      (candidate) =>
        candidate.path === suffix || candidate.path.endsWith(`.${suffix}`),
    );
    return item?.value || "";
  }

  function renderLatest(report) {
    const panel = document.getElementById("latest-tape");
    const latestLink = document.getElementById("latest-report-link");
    if (!panel || !report) return;
    panel.replaceChildren();
    latestLink.href = report.url;

    const head = element("div", { className: "tape-head" }, [
      statusNode(report.status),
      element("time", {
        datetime: report.created_at,
        text: formatDate(report.created_at),
      }),
    ]);
    const title = element("h2", {
      className: "tape-title",
      text: report.title,
    });
    const pnl = element("div", {
      className: `tape-pnl ${valueClass(report.metrics.net_pnl)}`,
      text: formatMoney(report.metrics.net_pnl),
    });
    const metrics = element("dl", { className: "tape-metrics" });
    [
      ["Closed trades", formatInteger(report.metrics.closed_trades)],
      ["Win rate", formatPercent(report.metrics.win_rate)],
      ["Max drawdown", formatMoney(-Math.abs(report.metrics.max_drawdown || 0))],
    ].forEach(([label, value]) => {
      metrics.append(
        element("div", { className: "metric-line" }, [
          element("dt", { text: label }),
          element("dd", { text: value }),
        ]),
      );
    });
    const link = element("a", {
      className: "run-link",
      href: report.url,
      text: "Open experiment →",
    });
    const tags = (report.tags || []).length
      ? report.tags.join(" · ")
      : "No tags";
    const foot = element("div", { className: "tape-foot" }, [
      element("span", { text: tags }),
      link,
    ]);
    panel.append(head, title, pnl, metrics, foot);
  }

  function renderDeskSummary(reports) {
    const container = document.getElementById("portfolio-summary");
    if (!container) return;
    container.replaceChildren();
    const closedTrades = reports.reduce(
      (sum, report) => sum + (numeric(report.metrics.closed_trades) || 0),
      0,
    );
    const verified = reports.filter((report) => report.status === "verified").length;
    const settings = new Set(
      reports.map((report) => report.strategy?.fingerprint).filter(Boolean),
    );
    const oldest = reports.length
      ? reports[reports.length - 1].created_at
      : null;
    [
      ["Reports", formatInteger(reports.length)],
      ["Closed trades recorded", formatInteger(closedTrades)],
      ["Distinct configurations", formatInteger(settings.size)],
      ["Verified runs", formatInteger(verified)],
    ].forEach(([label, value]) => {
      container.append(
        element("div", { className: "summary-metric" }, [
          element("span", { text: label }),
          element("strong", { text: value }),
        ]),
      );
    });
    const reportCount = document.getElementById("report-count");
    if (reportCount) {
      const span = oldest ? ` since ${formatDate(oldest).split(",")[0]}` : "";
      reportCount.textContent = `${reports.length} ${
        reports.length === 1 ? "run" : "runs"
      }${span}`;
    }
  }

  function renderArchive(manifest) {
    const allReports = manifest?.reports || [];
    const body = document.getElementById("archive-body");
    const cards = document.getElementById("archive-cards");
    const empty = document.getElementById("archive-empty");
    const output = document.getElementById("archive-status");
    const search = document.getElementById("report-search");
    const status = document.getElementById("status-filter");
    const order = document.getElementById("report-order");
    const form = document.getElementById("archive-controls");
    const tray = document.getElementById("compare-tray");
    const selectionContainer = document.getElementById("compare-selection");
    const selectionCount = document.getElementById("compare-selection-count");
    const compareLink = document.getElementById("compare-link");
    const latestLink = document.getElementById("latest-report-link");
    const emptyTitle = document.getElementById("archive-empty-title");
    const emptyCopy = document.getElementById("archive-empty-copy");
    const controls = document.getElementById("archive-controls");
    const tableStatus = document.querySelector(".table-status");
    const desktopLedger = document.querySelector(".desktop-archive-ledger");
    const selection = new Set();
    const hasReports = allReports.length > 0;

    document.body.classList.toggle("has-no-reports", !hasReports);
    if (!hasReports) {
      if (latestLink) {
        latestLink.href = "#capabilities";
        latestLink.textContent = "Explore the workspace";
      }
      if (emptyTitle) emptyTitle.textContent = "The research ledger is ready";
      if (emptyCopy) {
        emptyCopy.textContent =
          "Your first experiment will arrive here with its settings, performance, trades, and validation evidence connected.";
      }
      empty?.querySelector(".clear-filters")?.setAttribute("hidden", "");
      controls?.setAttribute("hidden", "");
      tableStatus?.setAttribute("hidden", "");
      desktopLedger?.setAttribute("hidden", "");
    }

    function updateTray() {
      tray.hidden = selection.size === 0;
      selectionContainer.replaceChildren();
      for (const id of selection) {
        const report = allReports.find((item) => item.id === id);
        if (report) {
          selectionContainer.append(
            element("span", {
              className: "selection-chip",
              text: report.title,
              title: report.title,
            }),
          );
        }
      }
      selectionCount.textContent = `${selection.size} of 4 selected`;
      if (selection.size >= 2) {
        compareLink.removeAttribute("aria-disabled");
        compareLink.href = `compare.html?runs=${encodeURIComponent(
          [...selection].join(","),
        )}`;
      } else {
        compareLink.setAttribute("aria-disabled", "true");
        compareLink.href = "compare.html";
      }
    }

    function matches(report, query) {
      if (!query) return true;
      const haystack = [
        report.title,
        report.status,
        ...(report.tags || []),
        JSON.stringify(report.dataset || {}),
        JSON.stringify(report.automation || {}),
        settingsText(report),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    }

    function sortedReports() {
      const query = search.value.trim().toLowerCase();
      const selectedStatus = status.value;
      const filtered = allReports.filter(
        (report) =>
          matches(report, query) &&
          (selectedStatus === "all" || report.status === selectedStatus),
      );
      const compare = {
        newest: (a, b) => b.created_at.localeCompare(a.created_at),
        oldest: (a, b) => a.created_at.localeCompare(b.created_at),
        "pnl-desc": (a, b) =>
          (numeric(b.metrics.net_pnl) || 0) - (numeric(a.metrics.net_pnl) || 0),
        "drawdown-asc": (a, b) =>
          (numeric(a.metrics.max_drawdown) || 0) -
          (numeric(b.metrics.max_drawdown) || 0),
        "trades-desc": (a, b) =>
          (numeric(b.metrics.closed_trades) || 0) -
          (numeric(a.metrics.closed_trades) || 0),
      };
      return filtered.sort(compare[order.value] || compare.newest);
    }

    function render() {
      const reports = sortedReports();
      body.replaceChildren();
      cards.replaceChildren();
      empty.hidden = reports.length > 0;
      output.textContent = `${reports.length} of ${allReports.length} reports`;
      for (const report of reports) {
        const createCheckbox = () => {
          const checkbox = element("input", {
            className: "compare-check",
            type: "checkbox",
            dataset: { reportId: report.id },
            "aria-label": `Select ${report.title} for comparison`,
          });
          checkbox.checked = selection.has(report.id);
          checkbox.addEventListener("change", () => {
            if (checkbox.checked && selection.size >= 4) {
              checkbox.checked = false;
              output.textContent = "Comparison is limited to four reports.";
              return;
            }
            if (checkbox.checked) selection.add(report.id);
            else selection.delete(report.id);
            updateTray();
            document
              .querySelectorAll(".compare-check[data-report-id]")
              .forEach((control) => {
                if (control.dataset.reportId === report.id) {
                  control.checked = selection.has(report.id);
                }
              });
          });
          return checkbox;
        };

        const cardCheckbox = createCheckbox();
        const card = element("article", { className: "archive-card" }, [
          element("div", { className: "archive-card-meta" }, [
            statusNode(report.status),
            element("time", {
              datetime: report.created_at,
              text: formatDate(report.created_at),
            }),
          ]),
          element("h3", {}, [
            element("a", {
              className: "run-link",
              href: report.url,
              text: report.title,
            }),
          ]),
          element("p", {
            className: "run-subtitle",
            text: (report.tags || []).join(" · ") || report.id,
          }),
          ...(report.automation?.workflow_run_number
            ? [
                element("p", {
                  className: "run-automation",
                  text: `Workflow #${report.automation.workflow_run_number} / ${report.automation.actor || "unknown actor"}`,
                }),
              ]
            : []),
          element("dl", { className: "archive-card-metrics" }, [
            element("div", {}, [
              element("dt", { text: "Trades" }),
              element("dd", {
                text: formatInteger(report.metrics.closed_trades),
              }),
            ]),
            element("div", {}, [
              element("dt", { text: "Win rate" }),
              element("dd", { text: formatPercent(report.metrics.win_rate) }),
            ]),
            element("div", {}, [
              element("dt", { text: "Net P&L" }),
              element("dd", {
                className: valueClass(report.metrics.net_pnl),
                text: formatMoney(report.metrics.net_pnl),
              }),
            ]),
          ]),
          element("label", { className: "archive-compare-control" }, [
            cardCheckbox,
            element("span", { text: "Add to comparison" }),
          ]),
        ]);
        cards.append(card);

        const checkbox = createCheckbox();
        const titleCell = element("td", {}, [
          element("a", {
            className: "run-link",
            href: report.url,
            text: report.title,
          }),
          element("span", {
            className: "run-subtitle",
            text: (report.tags || []).join(" · ") || report.id,
          }),
        ]);
        if (report.automation?.workflow_run_number) {
          titleCell.append(
            element("span", {
              className: "run-automation",
              text: `Workflow #${report.automation.workflow_run_number} / ${report.automation.actor || "unknown actor"}`,
            }),
          );
        }
        const pnl = element("td", {
          className: valueClass(report.metrics.net_pnl),
          text: formatMoney(report.metrics.net_pnl),
        });
        body.append(
          element("tr", {}, [
            element("td", {}, [checkbox]),
            titleCell,
            element("td", { text: formatDate(report.created_at) }),
            element("td", {}, [statusNode(report.status)]),
            element("td", {
              text: formatInteger(report.metrics.closed_trades),
            }),
            element("td", { text: formatPercent(report.metrics.win_rate) }),
            pnl,
            element("td", {
              className: "negative",
              text: formatMoney(-Math.abs(report.metrics.max_drawdown || 0)),
            }),
          ]),
        );
      }
    }

    [search, status, order].forEach((control) => {
      control.addEventListener(control === search ? "input" : "change", render);
    });
    form.addEventListener("reset", () => window.setTimeout(render, 0));
    document.querySelectorAll(".clear-filters").forEach((button) => {
      button.addEventListener("click", () => {
        form.reset();
        render();
        search.focus();
      });
    });
    renderLatest(allReports[0]);
    renderDeskSummary(allReports);
    render();
    updateTray();
    preserveFocusAcrossLayout(
      cards,
      body.closest(".desktop-archive-ledger"),
      search,
    );
  }

  function renderHome() {
    const manifest = readJson("report-manifest");
    if (!manifest) {
      const status = document.getElementById("archive-status");
      if (status) status.textContent = "Report manifest could not be loaded.";
      return;
    }
    renderArchive(manifest);
  }

  function metricNode(label, value, className = "") {
    return element("div", { className: "report-metric" }, [
      element("span", { text: label }),
      element("strong", { className, text: value }),
    ]);
  }

  function chartColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      background: styles.getPropertyValue("--surface-soft").trim(),
      border: styles.getPropertyValue("--border").trim(),
      text: styles.getPropertyValue("--text-muted").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
      danger: styles.getPropertyValue("--danger").trim(),
      amber: styles.getPropertyValue("--amber").trim(),
    };
  }

  function prepareCanvas(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width: bounds.width, height: bounds.height };
  }

  function drawEmptyChart(canvas, message) {
    const { context, width, height } = prepareCanvas(canvas);
    const colors = chartColors();
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.text;
    context.font = "13px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText(message, width / 2, height / 2);
  }

  function lineChart(canvas, points) {
    if (!points.length) {
      drawEmptyChart(canvas, "No closed trades to chart");
      return;
    }
    const { context, width, height } = prepareCanvas(canvas);
    const colors = chartColors();
    const padding = { top: 22, right: 18, bottom: 34, left: 66 };
    const innerWidth = Math.max(1, width - padding.left - padding.right);
    const innerHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = points.map((point) => numeric(point.cumulative_pnl) || 0);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const x = (index) =>
      padding.left +
      (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
    const y = (value) =>
      padding.top + ((max - value) / (max - min)) * innerHeight;

    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.font = "11px Cascadia Code, monospace";
    context.fillStyle = colors.text;
    context.textAlign = "right";
    for (let index = 0; index <= 4; index += 1) {
      const value = max - ((max - min) * index) / 4;
      const position = padding.top + (innerHeight * index) / 4;
      context.strokeStyle = colors.border;
      context.beginPath();
      context.moveTo(padding.left, position);
      context.lineTo(width - padding.right, position);
      context.stroke();
      context.fillText(formatMoney(value), padding.left - 10, position + 4);
    }

    const zero = y(0);
    context.strokeStyle = colors.text;
    context.setLineDash([4, 5]);
    context.beginPath();
    context.moveTo(padding.left, zero);
    context.lineTo(width - padding.right, zero);
    context.stroke();
    context.setLineDash([]);

    const fill = context.createLinearGradient(0, padding.top, 0, height);
    fill.addColorStop(0, `${colors.accent}45`);
    fill.addColorStop(1, `${colors.accent}00`);
    context.beginPath();
    points.forEach((point, index) => {
      const method = index === 0 ? "moveTo" : "lineTo";
      context[method](x(index), y(numeric(point.cumulative_pnl) || 0));
    });
    context.lineTo(x(points.length - 1), zero);
    context.lineTo(x(0), zero);
    context.closePath();
    context.fillStyle = fill;
    context.fill();

    context.strokeStyle = colors.accent;
    context.lineWidth = 2.5;
    context.beginPath();
    points.forEach((point, index) => {
      const method = index === 0 ? "moveTo" : "lineTo";
      context[method](x(index), y(numeric(point.cumulative_pnl) || 0));
    });
    context.stroke();

    context.fillStyle = colors.text;
    context.textAlign = "center";
    context.fillText("1", x(0), height - 10);
    if (points.length > 1) {
      context.fillText(String(points.length), x(points.length - 1), height - 10);
    }
    context.textAlign = "left";
    context.fillText("Closed trade sequence", padding.left, height - 10);
  }

  function barChart(canvas, points) {
    if (!points.length) {
      drawEmptyChart(canvas, "No closed trades to chart");
      return;
    }
    const { context, width, height } = prepareCanvas(canvas);
    const colors = chartColors();
    const padding = { top: 20, right: 14, bottom: 34, left: 54 };
    const innerWidth = Math.max(1, width - padding.left - padding.right);
    const innerHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = points.map((point) => numeric(point.value) || 0);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const y = (value) =>
      padding.top + ((max - value) / (max - min)) * innerHeight;
    const zero = y(0);
    const slot = innerWidth / points.length;
    const barWidth = Math.max(2, Math.min(24, slot * 0.62));

    context.clearRect(0, 0, width, height);
    context.strokeStyle = colors.border;
    context.beginPath();
    context.moveTo(padding.left, zero);
    context.lineTo(width - padding.right, zero);
    context.stroke();
    points.forEach((point, index) => {
      const value = numeric(point.value) || 0;
      const top = y(Math.max(value, 0));
      const bottom = y(Math.min(value, 0));
      context.fillStyle = value >= 0 ? colors.accent : colors.danger;
      context.fillRect(
        padding.left + index * slot + (slot - barWidth) / 2,
        top,
        barWidth,
        Math.max(2, bottom - top),
      );
    });
    context.fillStyle = colors.text;
    context.font = "11px Cascadia Code, monospace";
    context.textAlign = "right";
    context.fillText(formatPercent(max), padding.left - 8, padding.top + 4);
    context.fillText(formatPercent(min), padding.left - 8, height - padding.bottom);
    context.textAlign = "left";
    context.fillText("Closed trade sequence", padding.left, height - 10);
  }

  function renderDecisionTrace(report) {
    const container = document.getElementById("decision-trace");
    const authoring = report.authoring || {};
    const delta = report.comparison?.settings_delta || [];
    const changed = delta.length
      ? `${delta.length} recorded ${delta.length === 1 ? "setting differs" : "settings differ"} from the baseline.`
      : "No recorded settings delta; confirm the baseline before attributing change.";
    const steps = [
      ["What changed", authoring.hypothesis || changed],
      [
        "What happened",
        authoring.observation ||
          `${formatInteger(report.metrics.closed_trades)} trades closed for ${formatMoney(
            report.metrics.net_pnl,
          )} net P&L. This is an observation, not an explanation.`,
      ],
      [
        "What to test next",
        authoring.next_test ||
          "Record one falsifiable next test and change as few variables as possible.",
      ],
    ];
    container.replaceChildren(
      ...steps.map(([label, text]) =>
        element("article", { className: "trace-step" }, [
          element("span", { text: label }),
          element("p", { text }),
        ]),
      ),
    );
    const baselineNote = document.getElementById("baseline-note");
    const baseline = report.comparison?.baseline;
    baselineNote.textContent = baseline
      ? `Compared with ${baseline.title}, created ${formatDate(baseline.created_at)}.`
      : "This report has no earlier or named baseline in the archive.";
  }

  function renderBreakdowns(report) {
    const container = document.getElementById("breakdowns");
    container.replaceChildren();
    const labels = {
      symbol: "By symbol",
      option_type: "By direction",
      exit_reason: "By exit reason",
    };
    for (const [key, title] of Object.entries(labels)) {
      const group = element("section", { className: "breakdown-group" }, [
        element("h3", { text: title }),
      ]);
      const rows = report.breakdowns?.[key] || [];
      if (!rows.length) {
        group.append(element("p", { className: "neutral", text: "No data" }));
      }
      rows.forEach((row) => {
        group.append(
          element("div", { className: "breakdown-row" }, [
            element("span", { text: row.label }),
            element("span", { text: `${formatInteger(row.trades)} trades` }),
            element("span", {
              className: valueClass(row.net_pnl),
              text: formatMoney(row.net_pnl),
            }),
          ]),
        );
      });
      container.append(group);
    }
  }

  function renderSettings(report) {
    const deltaContainer = document.getElementById("settings-delta");
    const delta = report.comparison?.settings_delta || [];
    deltaContainer.replaceChildren();
    if (!delta.length) {
      deltaContainer.append(
        element("p", {
          className: "neutral",
          text: report.comparison?.baseline
            ? "No recorded settings differ from this baseline."
            : "No baseline is available for a settings delta.",
        }),
      );
    } else {
      const list = element("div", { className: "delta-list" });
      delta.forEach((item) => {
        list.append(
          element("div", { className: "delta-row" }, [
            element("code", { text: item.path }),
            element("div", { className: "delta-values" }, [
              element("del", { text: item.baseline ?? "not set" }),
              element("span", { "aria-hidden": "true", text: "→" }),
              element("ins", { text: item.current ?? "not set" }),
            ]),
          ]),
        );
      });
      deltaContainer.append(list);
    }

    const groups = new Map();
    for (const item of report.strategy?.settings_flat || []) {
      const [group, ...rest] = item.path.split(".");
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({
        path: rest.join(".") || group,
        value: item.value,
      });
    }
    const groupContainer = document.getElementById("settings-groups");
    groupContainer.replaceChildren();
    if (!groups.size) {
      groupContainer.append(
        element("p", {
          className: "neutral",
          text: "No complete configuration snapshot was supplied.",
        }),
      );
    }
    let index = 0;
    for (const [name, items] of groups) {
      const details = element("details", { className: "settings-group" });
      if (index === 0) details.open = true;
      details.append(
        element("summary", {}, [
          element("strong", { text: name }),
          element("span", { text: `${items.length} values` }),
        ]),
      );
      const list = element("dl");
      items.forEach((item) => {
        const row = element("div", { className: "setting-row" }, [
          element("dt", { text: item.path }),
          element("dd", { text: item.value }),
        ]);
        list.append(row);
      });
      details.append(list);
      groupContainer.append(details);
      index += 1;
    }
  }

  function columnLabel(column) {
    return column
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function displayTradeValue(column, value, timeMode = "local") {
    if (value === null || value === undefined || value === "") return "—";
    if (/(?:^|_)(?:percent|return)(?:_|$)/.test(column)) {
      return formatPercent(value, column.includes("return"));
    }
    if (
      /(?:^|_)(?:price|strike|bid|ask|premium|commission|fees?|gross_pnl|net_pnl)(?:_|$)/.test(
        column,
      )
    ) {
      const parsed = numeric(value);
      return parsed === null ? String(value) : money.format(parsed);
    }
    if (/(?:^|_)(?:basis_points|bps)$/.test(column)) {
      return `${formatNumber(value)} bps`;
    }
    if (window.MBbotReportModel?.isTimelineField(column)) {
      return timeMode === "source" ? String(value) : formatPreciseDate(value);
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function renderTrades(report) {
    const columns = report.trade_columns || [];
    const allTrades = report.trades || [];
    const head = document.getElementById("trade-head");
    const body = document.getElementById("trade-body");
    const cards = document.getElementById("trade-cards");
    const search = document.getElementById("trade-search");
    const order = document.getElementById("trade-order");
    const timeDisplay = document.getElementById("trade-time-display");
    const timezoneNote = document.getElementById("trade-timezone-note");
    const output = document.getElementById("trade-status");
    const empty = document.getElementById("trade-empty");
    let sort = { column: "exit_time", direction: "desc" };
    let tradeTimeMode = timeDisplay.value;
    timeDisplay.options[0].textContent = `Local time (${localTimeZone})`;
    timezoneNote.textContent = `Local display uses ${localTimeZone}. Source timestamps retain their original offset and include seconds. Each expanded trade includes a copyable execution receipt for manual chart validation. Fingerprints prove which input was replayed, not that vendor data was accurate.`;
    const orderMap = {
      "exit-desc": { column: "exit_time", direction: "desc" },
      "exit-asc": { column: "exit_time", direction: "asc" },
      "pnl-desc": { column: "net_pnl", direction: "desc" },
      "pnl-asc": { column: "net_pnl", direction: "asc" },
      "return-desc": { column: "return_percent", direction: "desc" },
      "return-asc": { column: "return_percent", direction: "asc" },
    };
    if (!window.MBbotReportModel) {
      output.textContent = "Trade field model could not be loaded.";
      return;
    }
    const groupedFields = window.MBbotReportModel.groupTradeColumns(columns);
    const timelineFields = groupedFields.timeline;
    const executionFields = groupedFields.execution;
    const outcomeFields = groupedFields.outcome;
    const validationFields = groupedFields.validation;
    const featureFields = groupedFields.features;

    function fieldValueNode(
      column,
      value,
      timeMode = tradeTimeMode,
      showSource = false,
    ) {
      const className =
        column === "net_pnl" || column === "return_percent"
          ? valueClass(value)
          : "";
      const options = {
        className,
        text: displayTradeValue(column, value, timeMode),
      };
      if (
        window.MBbotReportModel.isTimelineField(column) &&
        value &&
        !Number.isNaN(new Date(value).valueOf())
      ) {
        const time = element("time", {
          ...options,
          datetime: String(value),
        });
        if (showSource && timeMode !== "source") {
          return element("span", { className: "trade-time-pair" }, [
            time,
            element("small", {}, [
              element("span", { text: "Source " }),
              element("code", { text: String(value) }),
            ]),
          ]);
        }
        return time;
      }
      return element("span", options);
    }

    function tradeFieldGroup(title, fields, trade) {
      if (!fields.length) return null;
      const list = element("dl", { className: "trade-card-fields" });
      fields.forEach((column) => {
        list.append(
          element("div", { className: "trade-card-field" }, [
            element("dt", { text: columnLabel(column) }),
            element("dd", {}, [
              fieldValueNode(column, trade[column], "local", true),
            ]),
          ]),
        );
      });
      return element("section", { className: "trade-card-group" }, [
        element("h4", { text: title }),
        list,
      ]);
    }

    function validationStep(
      stage,
      timeValue,
      priceValue,
      detail,
      missingPriceLabel = "Price not supplied",
    ) {
      const timestamp = timeValue
        ? element("span", { className: "validation-timestamps" }, [
            element("time", {
              datetime: String(timeValue),
              text: formatPreciseDate(timeValue),
            }),
            element("code", { text: String(timeValue) }),
          ])
        : element("span", {
            className: "validation-timestamps",
            text: "Timestamp not supplied",
          });
      return element("li", {}, [
        element("span", { className: "validation-stage" }, [
          element("strong", { text: stage }),
          element("span", {
            text:
              priceValue === null ||
              priceValue === undefined ||
              priceValue === ""
                ? missingPriceLabel
                : formatMoney(priceValue),
          }),
        ]),
        timestamp,
        element("small", { text: detail }),
      ]);
    }

    function validationReceiptText(trade, index) {
      return [
        "MBbot backtest trade validation receipt",
        `Report: ${report.title} (${report.id})`,
        `Trade: ${index + 1}`,
        `Symbol: ${trade.symbol ?? "not recorded"}`,
        `Contract: ${trade.contract_id ?? "not recorded"}`,
        `Direction: ${trade.option_type ?? trade.direction ?? "not recorded"}`,
        `Trade ID: ${trade.trade_id ?? "not recorded"}`,
        `Dataset fingerprint: ${trade.dataset_fingerprint ?? "not recorded"}`,
        `Signal source timestamp: ${trade.signal_time ?? "not recorded"}`,
        `Signal user timestamp: ${trade.signal_time_user ?? "not recorded"}`,
        `Signal source: ${trade.signal_source ?? report.extensions?.signal_source ?? "not recorded"}`,
        `Signal instrument: ${trade.signal_instrument ?? "not recorded"}`,
        `Signal trigger: ${trade.signal_trigger ?? "not recorded"}`,
        `Signal OHLC: ${trade.signal_bar_open ?? trade.signal_option_open ?? "?"}/${trade.signal_bar_high ?? trade.signal_option_high ?? "?"}/${trade.signal_bar_low ?? trade.signal_option_low ?? "?"}/${trade.signal_bar_close ?? trade.signal_option_close ?? trade.signal_option_price ?? "?"}`,
        `Previous MACD timestamp: ${trade.signal_previous_time ?? "not recorded"}`,
        `Previous MACD user timestamp: ${trade.signal_previous_time_user ?? "not recorded"}`,
        `Previous MACD/signal/histogram: ${trade.signal_previous_macd ?? "?"}/${trade.signal_previous_macd_signal ?? "?"}/${trade.signal_previous_macd_histogram ?? "?"}`,
        `Current MACD/signal/histogram: ${trade.signal_macd ?? "?"}/${trade.signal_macd_signal ?? "?"}/${trade.signal_macd_histogram ?? "?"}`,
        `Previous SMI/signal/histogram: ${trade.signal_previous_smi ?? "?"}/${trade.signal_previous_smi_signal ?? "?"}/${trade.signal_previous_smi_histogram ?? "?"}`,
        `Current SMI/signal/histogram: ${trade.signal_smi ?? "?"}/${trade.signal_smi_signal ?? "?"}/${trade.signal_smi_histogram ?? "?"}`,
        `Entry source timestamp: ${trade.entry_time ?? "not recorded"}`,
        `Entry user timestamp: ${trade.entry_time_user ?? "not recorded"}`,
        `Entry fill price: ${trade.entry_price ?? "not recorded"}`,
        `Entry source row: ${trade.entry_quote_source ?? "not recorded"}`,
        `Exit trigger timestamp: ${trade.exit_trigger_time ?? "not recorded"}`,
        `Exit trigger user timestamp: ${trade.exit_trigger_time_user ?? "not recorded"}`,
        `Exit source timestamp: ${trade.exit_time ?? "not recorded"}`,
        `Exit user timestamp: ${trade.exit_time_user ?? "not recorded"}`,
        `Exit fill price: ${trade.exit_price ?? "not recorded"}`,
        `Exit source row: ${trade.exit_quote_source ?? "not recorded"}`,
        `Exit reason: ${trade.exit_reason ?? "not recorded"}`,
        `Result source SHA-256: ${report.provenance?.source_sha256 ?? "not recorded"}`,
        `Strategy fingerprint: ${report.strategy?.fingerprint ?? "not recorded"}`,
        "",
        "All recorded trade fields:",
        JSON.stringify(trade, null, 2),
      ].join("\n");
    }

    function tradeValidationReceipt(trade, index) {
      const copyStatus = element("span", {
        className: "validation-copy-status",
        "aria-live": "polite",
      });
      const copyButton = element("button", {
        className: "quiet-button validation-copy-button",
        type: "button",
        text: "Copy receipt",
      });
      copyButton.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard?.writeText) {
            throw new Error("Clipboard API unavailable");
          }
          await navigator.clipboard.writeText(
            validationReceiptText(trade, index),
          );
          copyStatus.textContent = "Receipt copied.";
        } catch {
          copyStatus.textContent =
            "Copy is unavailable here; use the labeled fields below.";
        }
      });
      const signalPrice =
        trade.signal_bar_close ??
        trade.signal_bar_price ??
        trade.signal_option_close ??
        trade.signal_option_price ??
        trade.signal_price ??
        trade.option_price_at_signal;
      const signalDetail = [
        trade.signal_underlying_price
          ? `Underlying ${formatMoney(trade.signal_underlying_price)}`
          : null,
        trade.signal_underlying_time
          ? `underlying timestamp ${trade.signal_underlying_time}`
          : null,
        trade.signal_source
          ? `Signal ${trade.signal_source} on ${trade.signal_instrument || "unknown instrument"}`
          : null,
        trade.signal_trigger
          ? `Trigger ${trade.signal_trigger.replaceAll("_", " ")}`
          : null,
        trade.signal_bar_open || trade.signal_option_open
          ? `OHLC ${trade.signal_bar_open ?? trade.signal_option_open}/${trade.signal_bar_high ?? trade.signal_option_high}/${trade.signal_bar_low ?? trade.signal_option_low}/${trade.signal_bar_close ?? trade.signal_option_close}`
          : null,
        trade.signal_previous_macd
          ? `Previous (${trade.signal_previous_time}) MACD ${trade.signal_previous_macd} / signal ${trade.signal_previous_macd_signal} / histogram ${trade.signal_previous_macd_histogram}`
          : null,
        trade.signal_macd
          ? `Current MACD ${trade.signal_macd} / signal ${trade.signal_macd_signal} / histogram ${trade.signal_macd_histogram}`
          : null,
        trade.signal_previous_smi
          ? `Previous (${trade.signal_previous_time}) SMI ${trade.signal_previous_smi} / signal ${trade.signal_previous_smi_signal} / histogram ${trade.signal_previous_smi_histogram}`
          : null,
        trade.signal_smi
          ? `Current SMI ${trade.signal_smi} / signal ${trade.signal_smi_signal} / histogram ${trade.signal_smi_histogram}`
          : null,
        trade.signal_bar_source ? `source ${trade.signal_bar_source}` : null,
        trade.underlying_source
          ? `underlying source ${trade.underlying_source}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const entryDetail = [
        trade.entry_bid ? `Bid ${formatMoney(trade.entry_bid)}` : null,
        trade.entry_ask ? `Ask ${formatMoney(trade.entry_ask)}` : null,
        trade.entry_fill_source
          ? `Filled from ${trade.entry_fill_source}`
          : null,
        trade.entry_spread_percent
          ? `Spread ${formatPercent(trade.entry_spread_percent)}`
          : null,
        trade.entry_delay_seconds
          ? `Fill delay ${trade.entry_delay_seconds}s`
          : null,
        trade.entry_quote_source ? `source ${trade.entry_quote_source}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const exitDetail = [
        trade.exit_bid ? `Bid ${formatMoney(trade.exit_bid)}` : null,
        trade.exit_ask ? `Ask ${formatMoney(trade.exit_ask)}` : null,
        trade.exit_fill_source
          ? `Filled from ${trade.exit_fill_source}`
          : null,
        trade.exit_spread_percent
          ? `Spread ${formatPercent(trade.exit_spread_percent)}`
          : null,
        trade.exit_delay_seconds
          ? `Fill delay ${trade.exit_delay_seconds}s`
          : null,
        trade.exit_reason ? `Reason ${trade.exit_reason}` : null,
        trade.exit_quote_source ? `source ${trade.exit_quote_source}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const triggerDetail = [
        trade.exit_reason ? `First trigger ${trade.exit_reason}` : null,
        trade.exit_reasons ? `Observed triggers ${trade.exit_reasons}` : null,
        trade.exit_macd
          ? `MACD ${trade.exit_macd} · signal ${trade.exit_macd_signal} · histogram ${trade.exit_macd_histogram}`
          : null,
        trade.exit_smi
          ? `SMI ${trade.exit_smi} · signal ${trade.exit_smi_signal} · histogram ${trade.exit_smi_histogram}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return element("section", { className: "trade-validation-receipt" }, [
        element("div", { className: "validation-receipt-heading" }, [
          element("div", {}, [
            element("p", { className: "section-label", text: "Validation" }),
            element("h4", { text: "Execution receipt" }),
          ]),
          element("div", { className: "validation-copy-control" }, [
            copyButton,
            copyStatus,
          ]),
        ]),
        element("p", {
          className: "validation-contract",
          text: [
            trade.contract_id || trade.symbol || "Contract not recorded",
            trade.expiration ? `Expiry ${trade.expiration}` : null,
            trade.strike ? `Strike ${formatMoney(trade.strike)}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }),
        element("ol", { className: "validation-timeline" }, [
          validationStep(
            "Signal",
            trade.signal_time,
            signalPrice,
            signalDetail || "Signal price context not supplied",
          ),
          validationStep(
            "Entry fill",
            trade.entry_time,
            trade.entry_price,
            entryDetail || "Quote-side context not supplied",
          ),
          validationStep(
            "Exit trigger",
            trade.exit_trigger_time,
            null,
            triggerDetail || "Trigger context not supplied",
            "No fill at trigger",
          ),
          validationStep(
            "Exit fill",
            trade.exit_time,
            trade.exit_price,
            exitDetail || "Quote-side context not supplied",
          ),
        ]),
      ]);
    }

    function tradeCard(trade, index) {
      const symbol = String(trade.symbol || "Trade");
      const direction = String(
        trade.option_type || trade.direction || "direction not recorded",
      ).toUpperCase();
      const result = numeric(trade.net_pnl);
      const returnValue = numeric(trade.return_percent);
      const exitTime = trade.exit_time
        ? element("time", {
            datetime: String(trade.exit_time),
            text: `Exit ${displayTradeValue(
              "exit_time",
              trade.exit_time,
              tradeTimeMode,
            )}`,
          })
        : element("small", { text: "Exit time not recorded" });
      const summary = element("summary", { className: "trade-card-summary" }, [
        element("span", { className: "trade-card-identity" }, [
          element("small", { text: `Trade ${index + 1}` }),
          element("strong", { text: `${symbol} · ${direction}` }),
          exitTime,
        ]),
        element("span", { className: "trade-card-result" }, [
          element("strong", {
            className: valueClass(result),
            text: formatMoney(result),
          }),
          element("small", {
            className: valueClass(returnValue),
            text: `${formatPercent(returnValue, true)} return`,
          }),
        ]),
        element("span", {
          className: "trade-card-field-count",
          text: `${columns.length} fields · ${featureFields.length + validationFields.length} audit/additional`,
        }),
      ]);
      const groups = [
        tradeFieldGroup("Timeline", timelineFields, trade),
        tradeFieldGroup("Contract & execution", executionFields, trade),
        tradeFieldGroup("Outcome", outcomeFields, trade),
        tradeFieldGroup("Validation & provenance", validationFields, trade),
        tradeFieldGroup("Signal & additional features", featureFields, trade),
      ].filter(Boolean);
      return element("details", { className: "trade-card" }, [
        summary,
        element("div", { className: "trade-card-body" }, [
          tradeValidationReceipt(trade, index),
          ...groups,
        ]),
      ]);
    }

    function render(focusColumn = null) {
      const query = search.value.trim().toLowerCase();
      const trades = allTrades
        .filter((trade) => !query || JSON.stringify(trade).toLowerCase().includes(query))
        .sort((a, b) => {
          const value = window.MBbotReportModel.compareTradeValues(
            a,
            b,
            sort.column,
          );
          return sort.direction === "asc" ? value : -value;
        });
      head.replaceChildren();
      cards.replaceChildren();
      columns.forEach((column) => {
        const th = element("th", { scope: "col" });
        if (column === sort.column) {
          th.setAttribute("aria-sort", sort.direction === "asc" ? "ascending" : "descending");
        }
        const button = element("button", {
          type: "button",
          dataset: { column },
          text: `${columnLabel(column)}${
            column === sort.column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""
          }`,
        });
        button.addEventListener("click", () => {
          sort = {
            column,
            direction:
              sort.column === column && sort.direction === "asc" ? "desc" : "asc",
          };
          const matchingOrder = Object.entries(orderMap).find(
            ([, value]) =>
              value.column === sort.column && value.direction === sort.direction,
          );
          if (matchingOrder) order.value = matchingOrder[0];
          render(column);
        });
        th.append(button);
        head.append(th);
      });
      body.replaceChildren();
      trades.forEach((trade, index) => {
        cards.append(tradeCard(trade, index));
        const row = element("tr");
        columns.forEach((column) => {
          const className =
            column === "net_pnl" || column === "return_percent"
              ? valueClass(trade[column])
              : "";
          const cell = element("td", { className });
          cell.append(
            fieldValueNode(column, trade[column], tradeTimeMode, false),
          );
          row.append(cell);
        });
        body.append(row);
      });
      empty.hidden = trades.length > 0;
      output.textContent = `${trades.length} of ${allTrades.length} trades · ${columns.length} fields each · ${
        tradeTimeMode === "source"
          ? "exact source timestamps"
          : `local time (${localTimeZone})`
      }`;
      if (focusColumn) {
        [...head.querySelectorAll("button[data-column]")]
          .find((button) => button.dataset.column === focusColumn)
          ?.focus();
      }
    }

    search.addEventListener("input", render);
    order.addEventListener("change", () => {
      sort = { ...orderMap[order.value] };
      render();
    });
    timeDisplay.addEventListener("change", () => {
      tradeTimeMode = timeDisplay.value;
      render();
    });
    render();
    preserveFocusAcrossLayout(
      cards,
      body.closest(".desktop-trade-ledger"),
      search,
    );
  }

  function appendDefinition(list, term, description, link = null) {
    list.append(element("dt", { text: term }));
    const dd = element("dd");
    if (link) {
      dd.append(
        element("a", {
          href: link,
          text: description,
        }),
      );
    } else {
      dd.textContent = description || "Not recorded";
    }
    list.append(dd);
  }

  function safeGitHubUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "github.com"
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function renderProvenance(report) {
    const list = document.getElementById("provenance-list");
    const dataset = report.dataset || {};
    const provenance = report.provenance || {};
    appendDefinition(list, "Report ID", report.id);
    appendDefinition(list, "Result source", provenance.source_name);
    appendDefinition(list, "Result SHA-256", provenance.source_sha256);
    appendDefinition(list, "Configuration", provenance.config_name);
    appendDefinition(list, "Configuration SHA-256", provenance.config_sha256);
    appendDefinition(list, "Strategy fingerprint", report.strategy?.fingerprint);
    const automation = report.automation || {};
    if (Object.keys(automation).length) {
      appendDefinition(list, "Execution status", automation.status);
      appendDefinition(
        list,
        "Workflow run",
        automation.workflow_run_number
          ? `#${automation.workflow_run_number} / ID ${automation.workflow_run_id}`
          : automation.workflow_run_id,
        safeGitHubUrl(automation.run_url),
      );
      appendDefinition(list, "Requested by", automation.actor);
      appendDefinition(
        list,
        "Requested (UTC)",
        formatPreciseDate(automation.requested_at_utc),
      );
      appendDefinition(
        list,
        "Requested (project time)",
        automation.requested_at_project_time,
      );
      appendDefinition(list, "Source branch", automation.source_branch);
      appendDefinition(list, "Source commit", automation.source_commit_sha);
      appendDefinition(
        list,
        "Backtest script SHA-256",
        automation.backtest_script_sha256,
      );
      appendDefinition(list, "Dataset profile", automation.dataset_profile);
      appendDefinition(
        list,
        "Signal source",
        automation.selected_parameters?.signal_source ||
          report.extensions?.signal_source,
      );
      appendDefinition(
        list,
        "Dataset identifier",
        automation.dataset_identifier,
      );
      appendDefinition(list, "Data access", automation.data_access_mode);
      appendDefinition(
        list,
        "Provider API access",
        automation.provider_api_access === false
          ? "disabled"
          : automation.provider_api_access,
      );
      appendDefinition(
        list,
        "Project Python network",
        automation.project_python_network_access === false
          ? "blocked"
          : automation.project_python_network_access,
      );
      appendDefinition(list, "Python", automation.python_version);
      appendDefinition(
        list,
        "Application",
        automation.application_version,
      );
      appendDefinition(
        list,
        "Started",
        formatPreciseDate(automation.started_at_utc),
      );
      appendDefinition(
        list,
        "Ended",
        formatPreciseDate(automation.ended_at_utc),
      );
      appendDefinition(
        list,
        "Duration",
        automation.duration_seconds === undefined
          ? null
          : `${formatNumber(automation.duration_seconds)} seconds`,
      );
    }
    appendDefinition(
      list,
      "Dataset window",
      `${formatDate(dataset.first_timestamp)} → ${formatDate(dataset.last_timestamp)}`,
    );
    appendDefinition(
      list,
      "Dataset coverage",
      `${formatInteger(dataset.sessions)} sessions · ${formatInteger(
        dataset.option_bars,
      )} bars · ${formatInteger(dataset.option_quotes)} quotes`,
    );
    appendDefinition(list, "Report generated", formatDate(provenance.generated_at));
    appendDefinition(
      list,
      "Normalized data",
      `${report.id}.json`,
      `../data/reports/${encodeURIComponent(report.id)}.json`,
    );
  }

  function renderReport() {
    const report = readJson("report-data");
    if (!report) {
      document.getElementById("report-title").textContent =
        "Report data could not be loaded";
      return;
    }
    document.getElementById("report-title").textContent = report.title;
    const meta = document.getElementById("report-meta");
    meta.replaceChildren(
      statusNode(report.status),
      element("time", {
        className: "meta-token",
        datetime: report.created_at,
        text: formatDate(report.created_at),
      }),
      element("span", {
        className: "meta-token",
        text: (report.tags || []).join(" · ") || report.id,
      }),
    );
    const dataset = report.dataset || {};
    document.getElementById("report-dataset-range").textContent =
      `Dataset ${formatDate(dataset.first_timestamp)} → ${formatDate(
        dataset.last_timestamp,
      )} · ${formatInteger(dataset.sessions)} sessions`;
    const outcome = document.getElementById("report-outcome");
    outcome.replaceChildren(
      element("span", { text: "Net P&L / closed trades" }),
      element("strong", {
        className: valueClass(report.metrics.net_pnl),
        text: formatMoney(report.metrics.net_pnl),
      }),
      element("small", {
        text: `${formatInteger(report.metrics.closed_trades)} closed trades · ${formatPercent(
          report.metrics.win_rate,
        )} win rate`,
      }),
    );

    const qualityNotes = document.getElementById("quality-notes");
    const notes = report.quality?.notes || [];
    qualityNotes.replaceChildren(
      ...(notes.length
        ? notes.map((note) => element("li", { text: note }))
        : [element("li", { text: "No generator warnings were recorded." })]),
    );
    document.getElementById("quality-banner").dataset.status = report.status;

    const ribbon = document.getElementById("metric-ribbon");
    ribbon.replaceChildren(
      metricNode("Net P&L", formatMoney(report.metrics.net_pnl), valueClass(report.metrics.net_pnl)),
      metricNode("Win rate", formatPercent(report.metrics.win_rate)),
      metricNode("Avg return", formatPercent(report.metrics.average_return_percent, true), valueClass(report.metrics.average_return_percent)),
      metricNode("Profit factor", formatNumber(report.metrics.profit_factor)),
      metricNode("Max drawdown", formatMoney(-Math.abs(report.metrics.max_drawdown || 0)), "negative"),
      metricNode("Avg hold", report.metrics.average_holding_minutes === null ? "—" : `${formatNumber(report.metrics.average_holding_minutes)} min`),
    );

    renderDecisionTrace(report);
    renderBreakdowns(report);
    renderSettings(report);
    renderTrades(report);
    renderProvenance(report);

    const series = report.charts?.cumulative_pnl || [];
    const returns = report.charts?.returns || [];
    const equityCanvas = document.getElementById("equity-chart");
    const returnsCanvas = document.getElementById("returns-chart");
    const drawCharts = () => {
      lineChart(equityCanvas, series);
      barChart(returnsCanvas, returns);
    };
    drawCharts();
    window.addEventListener("mbbot:theme", drawCharts);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(drawCharts);
      observer.observe(equityCanvas.parentElement);
      observer.observe(returnsCanvas.parentElement);
    } else {
      window.addEventListener("resize", drawCharts);
    }
    const summary = document.getElementById("equity-summary");
    summary.textContent = series.length
      ? `${series.length} exits; ending at ${formatMoney(
          series[series.length - 1].cumulative_pnl,
        )}.`
      : "No closed-trade sequence.";
    const equityData = document.getElementById("equity-data");
    series.forEach((point) => {
      equityData.append(
        element("tr", {}, [
          element("td", { text: String(point.index) }),
          element("td", { text: formatDate(point.time) }),
          element("td", {
            className: valueClass(point.net_pnl),
            text: formatMoney(point.net_pnl),
          }),
          element("td", { text: formatMoney(point.cumulative_pnl) }),
          element("td", {
            className: "negative",
            text: formatMoney(-Math.abs(point.drawdown || 0)),
          }),
        ]),
      );
    });
  }

  const metricRows = [
    {
      label: "Net P&L",
      key: "net_pnl",
      format: formatMoney,
      formatDelta: formatMoney,
    },
    {
      label: "Closed trades",
      key: "closed_trades",
      format: formatInteger,
      formatDelta: (value) =>
        `${value > 0 ? "+" : ""}${formatInteger(value)}`,
    },
    {
      label: "Win rate",
      key: "win_rate",
      format: formatPercent,
      formatDelta: (value) => formatPercent(value, true),
    },
    {
      label: "Average return",
      key: "average_return_percent",
      format: (value) => formatPercent(value, true),
      formatDelta: (value) => formatPercent(value, true),
    },
    {
      label: "Median return",
      key: "median_return_percent",
      format: (value) => formatPercent(value, true),
      formatDelta: (value) => formatPercent(value, true),
    },
    {
      label: "Profit factor",
      key: "profit_factor",
      format: formatNumber,
      formatDelta: (value) =>
        `${value > 0 ? "+" : ""}${formatNumber(value)}`,
    },
    {
      label: "Max drawdown",
      key: "max_drawdown",
      format: (value) =>
        numeric(value) === null ? "—" : formatMoney(-Math.abs(value)),
      formatDelta: formatMoney,
    },
    {
      label: "Expectancy / trade",
      key: "expectancy",
      format: formatMoney,
      formatDelta: formatMoney,
    },
    {
      label: "Average hold",
      key: "average_holding_minutes",
      format: (value) =>
        numeric(value) === null ? "—" : `${formatNumber(value)} min`,
      formatDelta: (value) =>
        `${value > 0 ? "+" : ""}${formatNumber(value)} min`,
    },
  ];

  const comparisonSettingPresentations = Object.freeze({
    "backtest.bar_minutes": ["Replay", "Signal bar interval"],
    "backtest.commission_per_contract": ["Costs", "Commission per contract"],
    "backtest.contract_multiplier": ["Sizing", "Contract multiplier"],
    "backtest.contracts_per_trade": ["Sizing", "Contracts per trade"],
    "backtest.symbols": ["Universe", "Symbols"],
    "contract.allow_zero_dte": ["Contract selection", "Allow 0DTE"],
    "contract.fallback_to_next_expiration": [
      "Contract selection",
      "Next expiry fallback",
    ],
    "contract.max_premium": ["Contract selection", "Maximum ask"],
    "contract.max_premium_enabled": [
      "Contract selection",
      "Premium cap",
    ],
    "contract.max_spread_enabled": ["Contract selection", "Spread cap"],
    "contract.max_spread_percent": [
      "Contract selection",
      "Maximum spread",
    ],
    "contract.premium_field": [
      "Contract selection",
      "Premium eligibility field",
    ],
    "contract.scan_next_strike_if_nearest_fails": [
      "Contract selection",
      "Scan next strike",
    ],
    "contract.spread_denominator": [
      "Contract selection",
      "Spread denominator",
    ],
    "contract.strike_policy": ["Contract selection", "Strike policy"],
    "exit.entry_price_field": ["Fill model", "Entry price field"],
    "exit.opposite_macd_enabled": ["Exit", "Reverse MACD exit"],
    "exit.profit_price_field": ["Fill model", "Profit price field"],
    "exit.profit_target_enabled": ["Exit", "Profit target"],
    "exit.profit_target_percent": ["Exit", "Profit target percentage"],
    "exit.simultaneous_priority": ["Exit", "Same-event exit priority"],
    "macd.ema_seed_method": ["Signal", "EMA seed"],
    "macd.fast_period": ["Signal", "Fast EMA"],
    "macd.price_source": ["Signal", "MACD price source"],
    "macd.signal_period": ["Signal", "Signal EMA"],
    "macd.slow_period": ["Signal", "Slow EMA"],
    "macd.source": ["Signal", "MACD signal series"],
    "macd.zero_line_filter_enabled": ["Signal", "Zero-line filter"],
    "rsi.enabled": ["RSI", "RSI filter"],
    "rsi.maximum": ["RSI", "RSI maximum"],
    "rsi.minimum": ["RSI", "RSI minimum"],
    "rsi.period": ["RSI", "RSI period"],
    "smi.d_length": ["SMI", "%D smoothing"],
    "smi.ema_seed_method": ["SMI", "EMA seed"],
    "smi.enabled": ["SMI", "SMI entry logic"],
    "smi.entry_mode": ["SMI", "Entry behavior"],
    "smi.k_length": ["SMI", "%K length"],
    "smi.opposite_crossover_exit_enabled": [
      "SMI",
      "Opposite crossover exit",
    ],
    "smi.overbought": ["SMI", "Overbought threshold"],
    "smi.oversold": ["SMI", "Oversold threshold"],
    "smi.signal_length": ["SMI", "Signal EMA"],
    "smi.zone_filter_enabled": ["SMI", "Extreme-zone filter"],
    "schedule.entry_cutoff_minutes_before_close": [
      "Schedule",
      "Stop entries before close",
    ],
    "schedule.entry_delay_minutes_after_open": [
      "Schedule",
      "Entry delay after open",
    ],
    "schedule.entry_window_enabled": ["Schedule", "Entry window"],
    "schedule.force_exit_time_riyadh": [
      "Schedule",
      "Forced exit · Asia/Riyadh",
    ],
    "schedule.time_exit_enabled": ["Schedule", "Timed exit"],
  });

  function reportTitleParts(report) {
    const title = String(report?.title || report?.id || "Untitled experiment");
    const match = title.match(/^(.*?)\s*\/\s*(Workflow\s+#\d+)\s*$/i);
    return match
      ? { name: match[1].trim(), workflow: match[2].trim() }
      : { name: title, workflow: "" };
  }

  function compactReportTitle(report) {
    const parts = reportTitleParts(report);
    return parts.workflow
      ? `${parts.name} · ${parts.workflow.replace(/^Workflow\s+/i, "")}`
      : parts.name;
  }

  function comparisonSettingPresentation(path) {
    const known = comparisonSettingPresentations[path];
    if (known) return { group: known[0], label: known[1] };
    const segments = String(path).split(".");
    const label = (segments.pop() || "Setting")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const group = (segments.pop() || "Configuration")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    return { group, label };
  }

  function formatComparisonSetting(path, value) {
    const normalized = String(value ?? "not set");
    const lower = normalized.toLowerCase();
    if (lower === "enabled" || lower === "disabled") {
      return lower === "enabled" ? "Enabled" : "Disabled";
    }
    if (lower === "not set") return "Not set";
    if (
      path === "contract.max_spread_percent" ||
      path === "exit.profit_target_percent"
    ) {
      return `${formatNumber(value)}%`;
    }
    if (
      path === "contract.max_premium" ||
      path === "backtest.commission_per_contract"
    ) {
      return formatMoney(value);
    }
    if (
      path === "backtest.bar_minutes" ||
      path === "schedule.entry_cutoff_minutes_before_close" ||
      path === "schedule.entry_delay_minutes_after_open"
    ) {
      return `${formatNumber(value)} min`;
    }
    if (path === "schedule.force_exit_time_riyadh") {
      return `${normalized} Asia/Riyadh`;
    }
    if (
      [
        "backtest.contract_multiplier",
        "backtest.contracts_per_trade",
        "macd.fast_period",
        "macd.signal_period",
        "macd.slow_period",
        "rsi.maximum",
        "rsi.minimum",
        "rsi.period",
        "smi.d_length",
        "smi.k_length",
        "smi.overbought",
        "smi.oversold",
        "smi.signal_length",
      ].includes(path)
    ) {
      return formatNumber(value);
    }
    const namedValues = {
      first: "First close",
      sma: "SMA warm-up",
      underlying: "Stored underlying closes",
      option_contract: "Option-contract trade closes",
      close: "Close",
      trade_close: "Trade close",
      midpoint: "Midpoint",
      ask: "Ask",
      bid: "Bid",
      nearest_itm_atm: "Nearest ITM / ATM",
      reject_both: "Reject both",
      confirm_macd_state: "Confirm MACD with SMI state",
      require_same_bar_cross: "Require same-bar MACD + SMI cross",
      replace_macd: "SMI replaces MACD",
    };
    return namedValues[lower] || normalized;
  }

  function renderComparison() {
    const manifest = readJson("report-manifest");
    const reports = manifest?.reports || [];
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("runs") || "")
      .split(",")
      .filter(Boolean)
      .slice(0, 4);
    const selected = new Set(requested.filter((id) => reports.some((report) => report.id === id)));
    const options = document.getElementById("comparison-options");
    const output = document.getElementById("comparison-status");
    const search = document.getElementById("comparison-search");
    const runKey = document.getElementById("comparison-run-key");
    const compatibilityList = document.getElementById(
      "comparison-compatibility",
    );
    const metricCards = document.getElementById("metric-cards");
    const settingsCards = document.getElementById("settings-cards");
    if (!window.MBbotReportModel) {
      output.textContent = "Comparison model could not be loaded.";
      return;
    }

    function updateUrl() {
      const next = new URL(window.location.href);
      if (selected.size) next.searchParams.set("runs", [...selected].join(","));
      else next.searchParams.delete("runs");
      history.replaceState(null, "", next);
    }

    function activeReports() {
      return [...selected]
        .map((id) => reports.find((report) => report.id === id))
        .filter(Boolean);
    }

    function runLetter(index) {
      return String.fromCharCode(65 + index);
    }

    function runBadge(index) {
      return element("span", {
        className: "comparison-run-badge",
        text: runLetter(index),
        "aria-label": `Experiment ${runLetter(index)}`,
      });
    }

    function updateSelectionStatus() {
      const shown = [...options.querySelectorAll(".comparison-option")].filter(
        (option) => !option.hidden,
      ).length;
      output.textContent = `${selected.size} of 4 selected · ${shown} of ${reports.length} reports shown${
        selected.size < 2 ? " · choose at least two" : ""
      }`;
    }

    function syncOptionState() {
      const order = [...selected];
      options.querySelectorAll(".comparison-option").forEach((option) => {
        const index = order.indexOf(option.dataset.reportId);
        const checkbox = option.querySelector("input");
        const badge = option.querySelector(".comparison-option-key");
        checkbox.checked = index >= 0;
        option.classList.toggle("is-selected", index >= 0);
        badge.hidden = index < 0;
        badge.textContent = index < 0 ? "" : runLetter(index);
      });
      [...options.querySelectorAll(".comparison-option")]
        .sort((left, right) => {
          const leftIndex = order.indexOf(left.dataset.reportId);
          const rightIndex = order.indexOf(right.dataset.reportId);
          if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
          if (leftIndex >= 0) return -1;
          if (rightIndex >= 0) return 1;
          return 0;
        })
        .forEach((option) => options.append(option));
      updateSelectionStatus();
    }

    function filterOptions() {
      const query = search.value.trim().toLowerCase();
      options.querySelectorAll(".comparison-option").forEach((option) => {
        option.hidden =
          Boolean(query) && !option.dataset.searchText.includes(query);
      });
      updateSelectionStatus();
    }

    function renderOptions() {
      options.replaceChildren();
      reports.forEach((report) => {
        const title = reportTitleParts(report);
        const checkbox = element("input", {
          className: "compare-check",
          type: "checkbox",
          dataset: { reportId: report.id },
        });
        checkbox.checked = selected.has(report.id);
        checkbox.setAttribute("aria-label", `Include ${report.title}`);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked && selected.size >= 4) {
            checkbox.checked = false;
            output.textContent = "Choose no more than four reports.";
            return;
          }
          if (checkbox.checked) selected.add(report.id);
          else selected.delete(report.id);
          syncOptionState();
          updateUrl();
          renderResults();
        });
        const option = element(
          "label",
          {
            className: "comparison-option",
            dataset: {
              reportId: report.id,
              searchText: [
                report.title,
                report.id,
                report.status,
                ...(report.tags || []),
                settingsText(report),
              ]
                .join(" ")
                .toLowerCase(),
            },
          },
          [
            checkbox,
            element("span", {
              className: "comparison-option-key",
              hidden: "hidden",
            }),
            element("span", { className: "comparison-option-copy" }, [
              element("strong", { text: title.name }),
              element("small", {
                text: [
                  title.workflow,
                  formatDate(report.created_at),
                  report.status,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }),
            ]),
          ],
        );
        options.append(option);
      });
      syncOptionState();
    }

    function setReference(reportId) {
      const reordered = [
        reportId,
        ...[...selected].filter((id) => id !== reportId),
      ];
      selected.clear();
      reordered.forEach((id) => selected.add(id));
      syncOptionState();
      updateUrl();
      renderResults(reportId);
    }

    function renderRunKey(active, focusReportId = null) {
      runKey.replaceChildren();
      runKey.hidden = active.length === 0;
      active.forEach((report, index) => {
        const title = reportTitleParts(report);
        const controls =
          index === 0
            ? element("span", {
                className: "comparison-reference-label",
                text: "Reference",
              })
            : element("button", {
                className: "quiet-button comparison-reference-button",
                type: "button",
                text: "Make reference",
                "aria-label": `Use ${report.title} as comparison reference`,
              });
        if (index > 0) {
          controls.addEventListener("click", () => setReference(report.id));
        }
        runKey.append(
          element(
            "article",
            {
              className: "comparison-run-card",
              dataset: { reportId: report.id },
            },
            [
              runBadge(index),
              element("div", { className: "comparison-run-copy" }, [
                element("div", { className: "comparison-run-heading" }, [
                  element("div", { className: "comparison-run-title" }, [
                    element("h3", {}, [
                      element("a", {
                        href: report.url,
                        text: title.name,
                      }),
                    ]),
                    ...(title.workflow
                      ? [
                          element("span", {
                            className: "comparison-workflow-label",
                            text: title.workflow,
                          }),
                        ]
                      : []),
                  ]),
                  statusNode(report.status),
                ]),
                element("p", {
                  text: `${formatDate(report.created_at)} · ${formatInteger(
                    report.metrics?.closed_trades,
                  )} trades · ${formatMoney(report.metrics?.net_pnl)}`,
                }),
                controls,
              ]),
            ],
          ),
        );
      });
      if (focusReportId) {
        const target = [...runKey.querySelectorAll("[data-report-id]")].find(
          (card) => card.dataset.reportId === focusReportId,
        );
        target?.querySelector("a")?.focus();
      }
    }

    function comparableMetric(row, value) {
      const parsed = numeric(value);
      if (parsed === null) return null;
      return row.key === "max_drawdown" ? -Math.abs(parsed) : parsed;
    }

    function metricDeltaNode(row, report, reference, index) {
      if (index === 0) {
        return element("small", {
          className: "comparison-delta neutral",
          text: "Reference A",
        });
      }
      const current = comparableMetric(row, report.metrics?.[row.key]);
      const baseline = comparableMetric(row, reference.metrics?.[row.key]);
      if (current === null || baseline === null) {
        return element("small", {
          className: "comparison-delta neutral",
          text: "Δ unavailable",
        });
      }
      const delta = current - baseline;
      return element("small", {
        className: `comparison-delta ${valueClass(delta)}`,
        text: `Δ vs A ${row.formatDelta(delta)}`,
      });
    }

    function renderMetrics(active) {
      const metricsHead = document.getElementById("metrics-head");
      const metricsBody = document.getElementById("metrics-body");
      const metricsLedger = metricsBody.closest(
        ".desktop-comparison-ledger",
      );
      const reference = active[0];
      metricCards.hidden = active.length === 0;
      metricsLedger.hidden = active.length === 0;
      metricsHead.replaceChildren(
        element("th", { scope: "col", text: "Metric" }),
      );
      active.forEach((report, index) => {
        metricsHead.append(
          element("th", { scope: "col" }, [
            runBadge(index),
            element("a", {
              href: report.url,
              text: compactReportTitle(report),
            }),
          ]),
        );
      });
      metricsBody.replaceChildren();
      metricCards.replaceChildren();
      metricRows.forEach((row) => {
        const tableRow = element("tr", {}, [
          element("td", { text: row.label }),
        ]);
        const valueList = element("dl", {
          className: "comparison-value-list",
        });
        active.forEach((report, index) => {
          const value = report.metrics?.[row.key];
          const valueClassName =
            row.key === "net_pnl" ||
            row.key === "average_return_percent" ||
            row.key === "expectancy"
              ? valueClass(value)
              : "";
          const delta = reference
            ? metricDeltaNode(row, report, reference, index)
            : null;
          const cell = element("td", { className: valueClassName }, [
            element("strong", { text: row.format(value) }),
          ]);
          if (delta) cell.append(delta.cloneNode(true));
          tableRow.append(cell);
          valueList.append(
            element("div", {}, [
              element("dt", {}, [
                runBadge(index),
                element("span", { text: compactReportTitle(report) }),
              ]),
              element("dd", { className: valueClassName }, [
                element("strong", { text: row.format(value) }),
                ...(delta ? [delta] : []),
              ]),
            ]),
          );
        });
        metricsBody.append(tableRow);
        metricCards.append(
          element("article", { className: "comparison-metric-card" }, [
            element("h3", { text: row.label }),
            valueList,
          ]),
        );
      });
    }

    function formatCompatibilityNode(row, value) {
      if (value === null || value === undefined || value === "") {
        return element("span", { text: "Not recorded" });
      }
      if (row.kind === "date") {
        return element("time", {
          datetime: String(value),
          text: formatDate(value),
        });
      }
      if (row.kind === "integer") {
        return element("span", { text: formatInteger(value) });
      }
      if (row.kind === "money") {
        return element("span", { text: formatMoney(value) });
      }
      if (row.kind === "minutes") {
        return element("span", { text: `${formatNumber(value)} min` });
      }
      return element("span", {
        text:
          typeof value === "object" ? JSON.stringify(value) : String(value),
      });
    }

    function renderCompatibility(active) {
      compatibilityList.replaceChildren();
      compatibilityList.hidden = active.length < 2;
      const compatibility = document.getElementById("compatibility-note");
      if (active.length < 2) {
        compatibility.textContent = "Select at least two reports.";
        compatibility.className = "neutral";
        return;
      }
      const rows = window.MBbotReportModel.buildCompatibilityRows(active);
      const different = rows.filter((row) => row.state === "different");
      const missing = rows.filter((row) => row.state === "missing");
      const setupDifferences = different.filter(
        (row) => row.flag === "setup",
      );
      const contextDifferences = different.filter(
        (row) => row.flag === "context",
      );
      const orderedRows = [...rows].sort((left, right) => {
        const rank = (row) => {
          if (row.state === "different" && row.flag === "setup") return 0;
          if (row.state === "different") return 1;
          if (row.state === "missing") return 2;
          return 3;
        };
        return rank(left) - rank(right);
      });
      const firstFlagged = orderedRows.find(
        (row) => row.state !== "match",
      )?.id;
      orderedRows.forEach((row) => {
        const stateLabel =
          row.state === "match"
            ? "Match"
            : row.state === "missing"
              ? "Not verifiable"
              : row.flag === "context"
                ? "Coverage differs"
                : row.group === "Universe"
                  ? "Universe differs"
                  : "Setup differs";
        const details = element("details", {
          className: "compatibility-check",
          dataset: { state: row.state, flag: row.flag || "setup" },
        });
        details.open = row.id === firstFlagged;
        details.append(
          element("summary", {}, [
            element("span", {}, [
              element("small", { text: row.group }),
              element("strong", { text: row.label }),
            ]),
            element("span", {
              className: "compatibility-state",
              text: stateLabel,
            }),
          ]),
        );
        const values = element("dl", {
          className: "compatibility-values",
        });
        active.forEach((report, index) => {
          values.append(
            element("div", {}, [
              element("dt", {}, [
                runBadge(index),
                element("span", { text: compactReportTitle(report) }),
              ]),
              element("dd", {}, [
                formatCompatibilityNode(row, row.values[index]),
              ]),
            ]),
          );
        });
        details.append(values);
        if (row.guidance) {
          details.append(
            element("p", {
              className: "compatibility-guidance",
              text: row.guidance,
            }),
          );
        }
        compatibilityList.append(details);
      });
      if (setupDifferences.length) {
        const contextCopy = contextDifferences.length
          ? ` and ${contextDifferences.length} coverage ${
              contextDifferences.length === 1 ? "check differs" : "checks differ"
            }`
          : "";
        compatibility.textContent = `${setupDifferences.length} setup ${
          setupDifferences.length === 1 ? "check differs" : "checks differ"
        }${contextCopy}. Align the flagged setup before attributing metric deltas.`;
        compatibility.className = "negative";
      } else if (contextDifferences.length) {
        compatibility.textContent = `Recorded replay settings match; ${contextDifferences.length} coverage ${
          contextDifferences.length === 1 ? "check differs" : "checks differ"
        }. Compare aggregate totals with caution and inspect per-symbol results.`;
        compatibility.className = "caution";
      } else if (missing.length) {
        compatibility.textContent = `Recorded checks match; ${missing.length} of ${rows.length} could not be verified.`;
        compatibility.className = "neutral";
      } else {
        compatibility.textContent = `All ${rows.length} recorded comparability checks match. Confirm source provenance independently.`;
        compatibility.className = "positive";
      }
    }

    function renderSettings(active) {
      const settingsHead = document.getElementById("settings-head");
      const settingsBody = document.getElementById("settings-body");
      const settingsEmpty = document.getElementById("settings-empty");
      const settingsLedger = settingsBody.closest(
        ".desktop-comparison-ledger",
      );
      const emptyTitle = settingsEmpty.querySelector("h3");
      const emptyCopy = settingsEmpty.querySelector("p");
      settingsHead.replaceChildren(
        element("th", { scope: "col", text: "Setting" }),
      );
      active.forEach((report, index) => {
        settingsHead.append(
          element("th", { scope: "col" }, [
            runBadge(index),
            element("span", { text: compactReportTitle(report) }),
          ]),
        );
      });
      const differing =
        active.length < 2
          ? []
          : window.MBbotReportModel.differingSettings(active);
      settingsBody.replaceChildren();
      settingsCards.replaceChildren();
      settingsCards.hidden = active.length < 2;
      settingsLedger.hidden = active.length < 2;
      differing.forEach((difference, differenceIndex) => {
        const presentation = comparisonSettingPresentation(difference.path);
        const row = element("tr", {}, [
          element("td", {}, [
            element("span", { className: "comparison-setting-name" }, [
              element("small", { text: presentation.group }),
              element("strong", { text: presentation.label }),
              element("code", { text: difference.path }),
            ]),
          ]),
        ]);
        difference.values.forEach((value) => {
          row.append(
            element("td", {
              text: formatComparisonSetting(difference.path, value),
            }),
          );
        });
        settingsBody.append(row);

        const details = element("details", {
          className: "comparison-setting-card",
        });
        details.open = differenceIndex === 0;
        const variants = new Set(
          difference.values.map((value) => String(value)),
        ).size;
        details.append(
          element("summary", {}, [
            element("span", { className: "comparison-setting-summary" }, [
              element("small", { text: presentation.group }),
              element("strong", { text: presentation.label }),
            ]),
            element("span", {
              text: `${variants} recorded values`,
            }),
          ]),
        );
        details.append(
          element("p", { className: "comparison-setting-path" }, [
            element("span", { text: "Recorded field" }),
            element("code", { text: difference.path }),
          ]),
        );
        const values = element("dl", {
          className: "comparison-value-list",
        });
        active.forEach((report, index) => {
          values.append(
            element("div", {}, [
              element("dt", {}, [
                runBadge(index),
                element("span", { text: compactReportTitle(report) }),
              ]),
              element("dd", {}, [
                element("span", {
                  text: formatComparisonSetting(
                    difference.path,
                    difference.values[index],
                  ),
                }),
              ]),
            ]),
          );
        });
        details.append(values);
        settingsCards.append(details);
      });
      if (active.length < 2) {
        emptyTitle.textContent = "Select another experiment";
        emptyCopy.textContent =
          "Two or more runs are required to calculate setting differences.";
        settingsEmpty.hidden = false;
      } else {
        emptyTitle.textContent = "No recorded settings differ";
        emptyCopy.textContent =
          "The runs may share a configuration or lack complete snapshots.";
        settingsEmpty.hidden = differing.length > 0;
      }
    }

    function renderResults(focusReportId = null) {
      const active = activeReports();
      updateSelectionStatus();
      renderRunKey(active, focusReportId);
      renderCompatibility(active);
      renderMetrics(active);
      renderSettings(active);
    }

    renderOptions();
    search.addEventListener("input", filterOptions);
    renderResults();
  }

  initializeTheme();
  initializeBacktestControl();
  if (page === "home") renderHome();
  if (page === "report") renderReport();
  if (page === "compare") renderComparison();
})();
