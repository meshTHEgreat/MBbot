(function initializePortalV2() {
  "use strict";

  const legacyModel = window.MBbotPortalV2ControlModel;
  const engineModel = window.MBbotPortalEngineModel;
  const resultsModel = window.MBbotPortalResultsModel;
  const form = document.getElementById("safety-form");
  if (!legacyModel || !engineModel || !resultsModel || !form) return;

  const validateButton = document.getElementById("validate-button");
  const queueButton = document.getElementById("queue-button");
  const status = document.getElementById("run-status");
  const error = document.getElementById("form-error");
  const sentence = document.getElementById("config-sentence");
  const hash = document.getElementById("config-hash");
  const envelopePreview = document.getElementById("engine-envelope");
  const resultLink = document.getElementById("result-link");
  const burnDialog = document.getElementById("burn-dialog");
  const burnAck = document.getElementById("burn-ack");
  const burnConfirm = document.getElementById("burn-confirm");
  const burnCancel = document.getElementById("burn-cancel");
  const tabs = [...document.querySelectorAll('[role="tab"][data-stage]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"][data-stage]')];
  const currentStageIndicator = document.getElementById(
    "current-stage-indicator",
  );
  const deltaMinimum = document.getElementById("delta_minimum");
  const deltaMaximum = document.getElementById("delta_maximum");
  const deltaMinSlider = document.getElementById("delta-min-slider");
  const deltaMaxSlider = document.getElementById("delta-max-slider");
  const originalDisabled = new WeakMap();
  const dependencyReasons = new Map();
  let dependencyConfig = null;
  let dependenciesReady = false;
  let validatedLegacyHash = null;
  let currentLegacyHash = null;
  let currentEngineHash = null;
  let dialogReturnFocus = null;
  let activeStage = 0;

  const delay = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function rememberDisabled(control) {
    if (!originalDisabled.has(control)) {
      originalDisabled.set(control, Boolean(control.disabled));
    }
  }

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function namedValue(name) {
    const controls = [...document.querySelectorAll(`[name="${name}"]`)];
    if (!controls.length) return undefined;
    const radios = controls.filter((control) => control.type === "radio");
    if (radios.length) {
      return radios.find((control) => control.checked)?.value || "";
    }
    if (controls.length === 1 && controls[0].type === "checkbox") {
      return controls[0].checked;
    }
    if (controls.every((control) => control.type === "checkbox")) {
      return controls
        .filter((control) => control.checked)
        .map((control) => control.value);
    }
    return controls[0].value;
  }

  function engineValues() {
    const value = (name) => namedValue(name);
    return {
      dataset_version: value("dataset_version"),
      window_preset: value("window_preset"),
      start_date: value("start_date"),
      end_date: value("end_date"),
      symbols: [...form.querySelectorAll('input[name="symbol"]:checked')].map(
        (input) => input.value,
      ),
      holdout_burn_acknowledgement: burnAck.checked,
      warmup_requirement:
        document.getElementById("warmup_requirement").textContent.trim(),
      trigger_family: value("trigger_family"),
      trigger_timeframe_minutes: value("trigger_timeframe_minutes"),
      fast_ma_snapshots: value("fast_ma_snapshots"),
      slow_ma_snapshots: value("slow_ma_snapshots"),
      ma_gap_percent: value("ma_gap_percent"),
      momentum_window_minutes: value("momentum_window_minutes"),
      momentum_percent: value("momentum_percent"),
      orb_range_minutes: value("orb_range_minutes"),
      orb_buffer_percent: value("orb_buffer_percent"),
      orb_regime_enabled: value("orb_regime_enabled"),
      order_flow_window_bars: value("order_flow_window_bars"),
      order_flow_threshold: value("order_flow_threshold"),
      order_flow_underlying_agreement: value(
        "order_flow_underlying_agreement",
      ),
      divergence_underlying_velocity_min: value(
        "divergence_underlying_velocity_min",
      ),
      divergence_premium_velocity_max: value(
        "divergence_premium_velocity_max",
      ),
      divergence_window_minutes: value("divergence_window_minutes"),
      mean_reversion_rsi_period: value("mean_reversion_rsi_period"),
      mean_reversion_rsi_extreme: value("mean_reversion_rsi_extreme"),
      mean_reversion_reversal_confirm: value(
        "mean_reversion_reversal_confirm",
      ),
      legacy_macd_fast: value("legacy_macd_fast"),
      legacy_macd_slow: value("legacy_macd_slow"),
      legacy_macd_signal: value("legacy_macd_signal"),
      spread_cap_percent: value("spread_cap_percent"),
      spread_denominator: value("spread_denominator"),
      premium_floor: value("premium_floor"),
      premium_cap: value("premium_cap"),
      valid_nbbo_required: value("valid_nbbo_required"),
      rsi_gate_enabled: value("rsi_gate_enabled"),
      smi_gate_enabled: value("smi_gate_enabled"),
      momentum_gate_enabled: value("momentum_gate_enabled"),
      velocity_gate_enabled: value("velocity_gate_enabled"),
      activity_gate_enabled: value("activity_gate_enabled"),
      trade_side_gate_enabled: value("trade_side_gate_enabled"),
      delta_minimum: value("delta_minimum"),
      delta_target: value("delta_target"),
      delta_maximum: value("delta_maximum"),
      dte_minimum: value("dte_minimum"),
      dte_maximum: value("dte_maximum"),
      allow_zero_dte: value("allow_zero_dte"),
      expiration_fallback: value("expiration_fallback"),
      next_strike_scan: value("next_strike_scan"),
      commission_preset: value("commission_preset"),
      unrealistic_costs_acknowledged: value(
        "unrealistic_costs_acknowledged",
      ),
      contracts_per_trade: value("contracts_per_trade"),
      maximum_trades_per_symbol_day: value(
        "maximum_trades_per_symbol_day",
      ),
      reentry_cooldown_minutes: value("reentry_cooldown_minutes"),
      same_direction_spy_qqq_single_exposure: value(
        "same_direction_spy_qqq_single_exposure",
      ),
      invalidation_stop_enabled: value("invalidation_stop_enabled"),
      invalidation_formula:
        document.getElementById("invalidation_formula").textContent.trim(),
      profit_target_enabled: value("profit_target_enabled"),
      profit_target_mode: value("profit_target_mode"),
      profit_friction_multiple: value("profit_friction_multiple"),
      profit_legacy_percent: value("profit_legacy_percent"),
      time_stop_enabled: value("time_stop_enabled"),
      time_stop_minutes: value("time_stop_minutes"),
      premium_stop_enabled: value("premium_stop_enabled"),
      premium_stop_percent: value("premium_stop_percent"),
      opposite_smi_exit: value("opposite_smi_exit"),
    };
  }

  function legacyValues() {
    return {
      experiment_label: form.elements.experiment_label.value,
      symbols: [...form.querySelectorAll('input[name="symbol"]:checked')].map(
        (input) => input.value,
      ),
      window_preset: selected("window_preset"),
      start_date: form.elements.start_date.value,
      end_date: form.elements.end_date.value,
      holdout_burn_acknowledgement: burnAck.checked,
      commission_preset: selected("commission_preset"),
      unrealistic_costs_acknowledged:
        form.elements.unrealistic_costs_acknowledged.checked,
    };
  }

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  function setStatus(state, title, copy) {
    status.dataset.state = state;
    status.querySelector("strong").textContent = title;
    status.querySelector("span").textContent = copy;
  }

  function clearError() {
    error.hidden = true;
    error.textContent = "";
    form
      .querySelectorAll('[aria-invalid="true"]')
      .forEach((control) => control.removeAttribute("aria-invalid"));
  }

  function showError(reason) {
    const message =
      reason instanceof Error ? reason.message : "The request failed.";
    error.textContent = message;
    error.hidden = false;
    const field = reason?.field;
    const target =
      field === "symbols"
        ? form.querySelector('input[name="symbol"]')
        : field
          ? document.querySelector(`[name="${field}"],#${field}`)
          : null;
    target?.setAttribute("aria-invalid", "true");
    error.focus();
    setStatus("error", "Needs attention", "Nothing was queued.");
  }

  function readCause(name) {
    const named = namedValue(name);
    if (named !== undefined) return named;
    const target = document.getElementById(name);
    if (!target) return undefined;
    if (target.dataset.value !== undefined) return target.dataset.value;
    if ("value" in target) return target.value;
    return target.textContent.trim();
  }

  function conditionMatches(condition, causeValue) {
    if (!condition) return true;
    if (Array.isArray(condition.all)) {
      return condition.all.every((item) =>
        conditionMatches(item, readCause(item.control)),
      );
    }
    if (Object.hasOwn(condition, "equals")) {
      return String(causeValue) === String(condition.equals);
    }
    if (condition.truthy === true) return Boolean(causeValue);
    if (Object.hasOwn(condition, "less_than")) {
      return causeValue !== "" && Number(causeValue) < condition.less_than;
    }
    if (Object.hasOwn(condition, "greater_than")) {
      return causeValue !== "" && Number(causeValue) > condition.greater_than;
    }
    return true;
  }

  function targetElements(targetName) {
    const byId = document.getElementById(targetName);
    if (byId) return [byId];
    return [...document.querySelectorAll(`[name="${targetName}"]`)];
  }

  function controlsInside(target) {
    if (target.matches("input,select,textarea,button")) return [target];
    return [...target.querySelectorAll("input,select,textarea,button")];
  }

  function setDependencyReason(targetName, copy) {
    dependencyReasons.set(targetName, copy || "");
    document
      .querySelectorAll(`[data-dependency-reason-for="${targetName}"]`)
      .forEach((node) => {
        node.textContent = copy || "";
      });
  }

  function ripple(targetName) {
    if (!dependencyConfig) return;
    for (const target of targetElements(targetName)) {
      target.classList.remove("dependency-ripple");
      window.requestAnimationFrame(() => {
        target.classList.add("dependency-ripple");
        window.setTimeout(
          () => target.classList.remove("dependency-ripple"),
          dependencyConfig.ripple_duration_ms,
        );
      });
    }
  }

  function mappedValue(effect, causeValue, targetName) {
    return effect.values?.[String(causeValue)]?.[targetName];
  }

  function applyEffect(effect, active, causeValue, changedCause) {
    for (const targetName of effect.targets) {
      const targets = targetElements(targetName);
      if (changedCause) ripple(targetName);
      if (effect.behavior === "ripple_only") continue;
      if (effect.behavior === "disable") {
        for (const target of targets) {
          target.classList.toggle("dependency-disabled", active);
          for (const control of controlsInside(target)) {
            rememberDisabled(control);
            control.disabled = active || originalDisabled.get(control);
          }
        }
        if (active) setDependencyReason(targetName, effect.reason);
      } else if (effect.behavior === "enable") {
        for (const target of targets) {
          target.classList.toggle("dependency-disabled", !active);
          for (const control of controlsInside(target)) {
            rememberDisabled(control);
            if (
              !active &&
              effect.reset_when_inactive &&
              "checked" in control
            ) {
              control.checked = false;
            }
            control.disabled = active ? false : true;
          }
        }
        setDependencyReason(
          targetName,
          active
            ? effect.reason
            : `Unavailable because ${changedCause || "its prerequisite"} is not active.`,
        );
      } else if (effect.behavior === "activate") {
        for (const target of targets) {
          target.hidden = !active;
          target.dataset.active = String(active);
        }
        if (active) setDependencyReason(targetName, effect.reason);
      } else if (effect.behavior === "activate_matching_group") {
        for (const target of targets) {
          const matching = target.dataset.family === String(causeValue);
          target.classList.toggle("dependency-disabled", !matching);
          target.setAttribute("aria-disabled", String(!matching));
          for (const control of controlsInside(target)) {
            control.disabled = !matching;
          }
          setDependencyReason(
            target.id,
            matching
              ? `Set by Trigger family: ${causeValue.replaceAll("_", " ")}.`
              : effect.reason_template.replace(
                  "{label}",
                  target.dataset.family.replaceAll("_", " "),
                ),
          );
        }
      } else if (effect.behavior === "mapped_content") {
        for (const target of targets) {
          const copy = mappedValue(effect, causeValue, targetName);
          if (copy !== undefined) target.textContent = copy;
        }
      } else if (effect.behavior === "mapped_text") {
        for (const target of targets) {
          const copy = effect.values?.[String(causeValue)];
          if (copy !== undefined) target.textContent = copy;
        }
      } else if (effect.behavior === "spread_semantics") {
        const spread = namedValue("spread_cap_percent");
        const denominator = namedValue("spread_denominator");
        for (const target of targets) {
          target.textContent = `${spread}% of ${denominator}`;
        }
      } else if (effect.behavior === "mapped_value") {
        for (const target of targets) {
          const copy = mappedValue(effect, causeValue, targetName);
          if (copy !== undefined && "value" in target) {
            target.value = String(copy);
          }
        }
      } else if (effect.behavior === "timeframe_conversion" && active) {
        const minutes = Number(causeValue);
        const family = selectedValue("trigger_family");
        if (family === "trend_persistence") {
          document.getElementById("warmup_requirement").textContent =
            `${effect.bars.slow_ma_snapshots} trigger bars = ${
              effect.bars.slow_ma_snapshots * minutes
            } minutes.`;
          document.getElementById("momentum_conversion").textContent =
            `${Math.max(
              1,
              Math.ceil(effect.bars.momentum_window_minutes / minutes),
            )} bars ≈ ${effect.bars.momentum_window_minutes} minutes.`;
        }
      } else if (effect.behavior === "set_value") {
        for (const target of targets) {
          if (!("value" in target)) continue;
          if (active) target.value = String(effect.value);
          else if (targetName === "dte_minimum") target.value = "1";
        }
        if (active) setDependencyReason(targetName, effect.reason);
      } else if (effect.behavior === "dataset_binding" && active) {
        const binding = effect.values?.[String(causeValue)];
        if (binding) {
          form.elements.start_date.min = binding.discovery_start;
          form.elements.start_date.max = binding.discovery_end;
          form.elements.end_date.min = binding.discovery_start;
          form.elements.end_date.max = binding.discovery_end;
        }
      } else if (
        effect.behavior === "require_acknowledgement" &&
        active &&
        changedCause === "window_preset" &&
        !burnAck.checked
      ) {
        openBurnDialog();
      }
    }
  }

  function selectedValue(name) {
    return namedValue(name);
  }

  function applyDependencies(changedCause = null) {
    if (!dependencyConfig) return;
    for (const rule of dependencyConfig.rules) {
      const causeValue = readCause(rule.cause);
      const active = conditionMatches(rule.condition, causeValue);
      for (const effect of rule.effects) {
        applyEffect(
          effect,
          active,
          causeValue,
          changedCause === rule.cause ? changedCause : null,
        );
      }
    }
    updateSummaries();
  }

  function renderAffectsChips() {
    const downstream = new Map();
    for (const rule of dependencyConfig.rules) {
      const targets = rule.effects.flatMap((effect) => effect.targets);
      downstream.set(rule.cause, [
        ...new Set([...(downstream.get(rule.cause) || []), ...targets]),
      ]);
    }
    for (const [cause, targets] of downstream.entries()) {
      document.querySelectorAll(`[data-affects-for="${cause}"]`).forEach(
        (chip) => {
          const labels = targets
            .filter((target) => !target.includes("report_"))
            .slice(0, 4)
            .map((target) => target.replaceAll("_", " "));
          chip.textContent = labels.length
            ? `affects: ${labels.join(", ")}${targets.length > 4 ? "…" : ""}`
            : "";
        },
      );
    }
  }

  async function loadDependencies() {
    const response = await fetch("../ui/config-dependencies.json", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Dependency graph returned HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (
      payload.schema_version !== "mbbot.portal.config-dependencies.v1" ||
      !Array.isArray(payload.rules)
    ) {
      throw new Error("Dependency graph schema is unsupported.");
    }
    dependencyConfig = payload;
    renderAffectsChips();
    applyDependencies();
    dependenciesReady = true;
    validateButton.disabled = false;
  }

  function updateSummaries() {
    const symbols = [...form.querySelectorAll('input[name="symbol"]:checked')]
      .map((input) => input.value)
      .join(" + ");
    const windowLabel = selected("window_preset").replaceAll("_", " ");
    document.getElementById("stage_0_summary").textContent =
      `Data: ${form.elements.dataset_version.value} · ${windowLabel} · ${
        symbols || "no symbols"
      }`;
    const family = form.elements.trigger_family.value.replaceAll("_", " ");
    document.getElementById("stage_2_summary").textContent =
      `Trigger: ${family} · ${form.elements.trigger_timeframe_minutes.value}m bars`;
    const spread = form.elements.spread_cap_percent.value;
    document.getElementById("stage_3_summary").textContent =
      `Filters: ${spread}% ${form.elements.spread_denominator.value} spread · $${form.elements.premium_floor.value} floor`;
    document.getElementById("stage_4_summary").textContent =
      `Contract: |Delta| ${form.elements.delta_target.value} · band ${form.elements.delta_minimum.value}–${form.elements.delta_maximum.value} · ${form.elements.dte_minimum.value}–${form.elements.dte_maximum.value} DTE`;
    document.getElementById("stage_5_summary").textContent =
      `Costs: ${selected("commission_preset").replaceAll("_", " ")}`;
  }

  function engineSentence(envelope) {
    const symbols = envelope.dataset.symbols.join(" + ");
    const family = envelope.setup_trigger.family.replaceAll("_", " ");
    const costs = envelope.execution_costs.commission_preset === "both"
      ? "$0.65 and $1.30 per side"
      : `$${envelope.execution_costs.commission_per_contract_per_side} per side`;
    return `${family} on ${symbols}, ${envelope.dataset.window_preset.replaceAll(
      "_",
      " ",
    )} ${envelope.dataset.start_date} through ${envelope.dataset.end_date}, ${costs}.`;
  }

  async function renderConfig() {
    resultLink.hidden = true;
    try {
      const envelope = engineModel.buildEnvelope(engineValues());
      const canonical = engineModel.canonicalJson(envelope);
      currentEngineHash = await sha256(canonical);
      envelopePreview.textContent = JSON.stringify(envelope, null, 2);
      sentence.textContent = engineSentence(envelope);
      hash.textContent = currentEngineHash;
    } catch (reason) {
      currentEngineHash = null;
      envelopePreview.textContent =
        reason instanceof Error ? reason.message : "Envelope is invalid.";
      sentence.textContent = "Engine envelope needs attention.";
      hash.textContent = "Not available";
    }
    currentLegacyHash = null;
    try {
      const legacyInputs = legacyModel.buildInputs(legacyValues(), false);
      currentLegacyHash = await sha256(
        legacyModel.canonicalJson(legacyInputs),
      );
    } catch {
      // The engine surface intentionally includes values the legacy route cannot run.
    }
    queueButton.disabled =
      !dependenciesReady ||
      form.elements.trigger_family.value !== "legacy_macd" ||
      !validatedLegacyHash ||
      validatedLegacyHash !== currentLegacyHash;
    updateStepperValidity();
  }

  function invalidate() {
    validatedLegacyHash = null;
    queueButton.disabled = true;
    setStatus(
      "ready",
      "Ready to validate",
      "Validation is required again after every configuration change.",
    );
    void renderConfig();
  }

  function openBurnDialog() {
    if (burnDialog.open) return;
    dialogReturnFocus = document.activeElement;
    burnAck.checked = false;
    burnConfirm.disabled = true;
    burnDialog.hidden = false;
    burnDialog.showModal();
    burnAck.focus();
  }

  function closeBurnDialog(accepted) {
    burnDialog.close();
    burnDialog.hidden = true;
    if (!accepted) {
      burnAck.checked = false;
      form.querySelector(
        'input[name="window_preset"][value="discovery"]',
      ).checked = true;
      applyDependencies("window_preset");
    }
    applyDependencies("holdout_burn_acknowledgement");
    dialogReturnFocus?.focus();
    invalidate();
  }

  function showStage(index, { focus = true } = {}) {
    activeStage = Math.max(0, Math.min(tabs.length - 1, index));
    tabs.forEach((tab, tabIndex) => {
      const selectedTab = tabIndex === activeStage;
      tab.setAttribute("aria-selected", String(selectedTab));
      tab.tabIndex = selectedTab ? 0 : -1;
    });
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== activeStage;
    });
    const label = tabs[activeStage].textContent.replace(/\s+/g, " ").trim();
    currentStageIndicator.textContent =
      `Stage ${activeStage} of 8 · ${label.replace(/^\d+\s*/, "")}`;
    tabs[activeStage].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    if (focus) tabs[activeStage].focus();
  }

  function stageIsValid(index) {
    const panel = panels[index];
    if ([...panel.querySelectorAll(":invalid")].some((node) => !node.disabled)) {
      return false;
    }
    if (
      index === 0 &&
      !form.querySelector('input[name="symbol"]:checked')
    ) {
      return false;
    }
    if (
      index === 0 &&
      selected("window_preset") === "holdout" &&
      !burnAck.checked
    ) {
      return false;
    }
    if (
      index === 4 &&
      !(
        Number(deltaMinimum.value) <= Number(form.elements.delta_target.value) &&
        Number(form.elements.delta_target.value) <= Number(deltaMaximum.value)
      )
    ) {
      return false;
    }
    if (
      index === 5 &&
      selected("commission_preset") === "zero" &&
      !form.elements.unrealistic_costs_acknowledged.checked
    ) {
      return false;
    }
    return true;
  }

  function updateStepperValidity() {
    tabs.forEach((tab, index) => {
      tab.dataset.valid = String(stageIsValid(index));
      tab.setAttribute(
        "aria-label",
        `${tab.textContent.trim()} — ${stageIsValid(index) ? "valid" : "needs attention"}`,
      );
    });
  }

  function syncDelta(source) {
    if (source === deltaMinSlider) deltaMinimum.value = deltaMinSlider.value;
    if (source === deltaMaxSlider) deltaMaximum.value = deltaMaxSlider.value;
    if (source === deltaMinimum) deltaMinSlider.value = deltaMinimum.value;
    if (source === deltaMaximum) deltaMaxSlider.value = deltaMaximum.value;
  }

  function renderResults(payload) {
    const result = resultsModel.normalizeResult(payload);
    const tradeCountSource = document.getElementById("result_trade_count");
    if (tradeCountSource) tradeCountSource.dataset.value = String(result.trade_count);
    document.getElementById("results-empty").hidden = true;
    document.getElementById("result-trades").textContent =
      String(result.trade_count);
    document.getElementById("result-mae").textContent =
      resultsModel.percent(result.average_mae_percent);
    document.getElementById("result-mfe").textContent =
      resultsModel.percent(result.average_mfe_percent);
    const costBody = document.getElementById("cost-results-body");
    costBody.replaceChildren();
    const reference = result.costs.find((item) => item.key === "reference_0.65");
    const stress = result.costs.find((item) => item.key === "stress_1.30");
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = "Friction-applied P&L";
    row.append(heading);
    for (const copy of [
      resultsModel.money(reference?.friction_applied_pnl),
      resultsModel.money(stress?.friction_applied_pnl),
      resultsModel.money(reference?.mid_to_mid_pnl),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = copy;
      row.append(cell);
    }
    costBody.append(row);
    const symbolBody = document.getElementById("per-symbol-results-body");
    symbolBody.replaceChildren();
    for (const item of result.per_symbol) {
      const symbolRow = document.createElement("tr");
      for (const copy of [
        item.symbol,
        String(
          Math.max(item.reference.trades, item.stress.trades),
        ),
        resultsModel.money(item.reference.friction_applied_pnl),
        resultsModel.money(item.stress.friction_applied_pnl),
        resultsModel.money(item.reference.mid_to_mid_pnl),
      ]) {
        const cell = document.createElement("td");
        cell.textContent = copy;
        symbolRow.append(cell);
      }
      symbolBody.append(symbolRow);
    }
    const exitBody = document.getElementById("exit-reason-results-body");
    exitBody.replaceChildren();
    for (const item of result.exit_reasons) {
      const exitRow = document.createElement("tr");
      const reason = document.createElement("th");
      reason.scope = "row";
      reason.textContent = item.reason.replaceAll("_", " ");
      const count = document.createElement("td");
      count.textContent = String(item.count);
      exitRow.append(reason, count);
      exitBody.append(exitRow);
    }
    applyDependencies("result_trade_count");
  }

  function gatewayUrl() {
    const configured =
      window.MBbotPortalV2Config?.backtestDispatchUrl || "";
    const parsed = new URL(configured);
    const loopback =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" && !loopback) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("Gateway URL is not safe.");
    }
    return parsed.href.replace(/\/+$/, "");
  }

  async function gatewayRequest(path, key, options = {}) {
    const response = await fetch(`${gatewayUrl()}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(
        payload.message || `Gateway returned HTTP ${response.status}.`,
      );
    }
    return payload;
  }

  async function followRun(runId, key) {
    for (let attempt = 0; attempt < 1080; attempt += 1) {
      const payload = await gatewayRequest(
        `/api/backtests/${encodeURIComponent(runId)}`,
        key,
      );
      if (payload.status === "queued") {
        setStatus("queued", "Queued", "Waiting for the local report runner.");
      } else if (payload.status === "in_progress") {
        setStatus(
          "running",
          "Running legacy compatibility backtest",
          "The production runner is using only the verified offline archive.",
        );
      } else if (payload.status === "completed") {
        if (payload.conclusion !== "success") {
          throw new Error(
            `The runner finished with ${payload.conclusion || "unknown"} status.`,
          );
        }
        const path = String(payload.report_path || "");
        if (!/^v2\/reports\/github-\d+-\d+\.html$/.test(path)) {
          throw new Error("The runner returned an invalid v2 report path.");
        }
        resultLink.href = path.replace(/^v2\//, "");
        resultLink.hidden = false;
        setStatus(
          "success",
          "Report generated",
          "The ui: v2 report is publishing under /v2/reports.",
        );
        return;
      }
      await delay(payload.status === "queued" ? 15000 : 10000);
    }
    throw new Error("The run exceeded the three-hour monitoring window.");
  }

  async function validateLocally() {
    clearError();
    if (!dependenciesReady) {
      showError(new Error("Dependency graph has not loaded."));
      return;
    }
    try {
      const envelope = engineModel.buildEnvelope(engineValues());
      currentEngineHash = await sha256(engineModel.canonicalJson(envelope));
      if (form.elements.trigger_family.value !== "legacy_macd") {
        validatedLegacyHash = null;
        queueButton.disabled = true;
        setStatus(
          "success",
          "Engine envelope valid",
          "No runner was started. Queue remains disabled until the parity-certified adapter arrives.",
        );
        return;
      }
      const inputs = legacyModel.buildInputs(legacyValues(), false);
      currentLegacyHash = await sha256(legacyModel.canonicalJson(inputs));
      validatedLegacyHash = currentLegacyHash;
      queueButton.disabled = false;
      setStatus(
        "success",
        "Legacy compatibility validation passed",
        "No runner was started. Queue is enabled for this exact legacy comparison.",
      );
    } catch (reason) {
      showError(reason);
    }
  }

  async function submit() {
    clearError();
    if (form.elements.trigger_family.value !== "legacy_macd") {
      showError(
        new Error(
          "Queue requires the parity-certified adapter for this trigger family.",
        ),
      );
      return;
    }
    const key = form.elements.runner_access_key.value;
    if (!key) {
      const reason = new Error("Enter the runner access key.");
      reason.field = "runner_access_key";
      showError(reason);
      return;
    }
    let inputs;
    try {
      inputs = legacyModel.buildInputs(legacyValues(), false);
      const fingerprint = await sha256(legacyModel.canonicalJson(inputs));
      if (fingerprint !== validatedLegacyHash) {
        throw new Error(
          "This legacy configuration changed after validation. Validate it again.",
        );
      }
      currentLegacyHash = fingerprint;
    } catch (reason) {
      showError(reason);
      return;
    }
    validateButton.disabled = true;
    queueButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    setStatus(
      "authorizing",
      "Authorizing",
      "Submitting the versioned safety envelope to the production report runner.",
    );
    try {
      const payload = await gatewayRequest("/api/backtests", key, {
        method: "POST",
        body: JSON.stringify({ inputs }),
      });
      if (!payload.run_id) {
        throw new Error("The gateway accepted the request without a run ID.");
      }
      await followRun(payload.run_id, key);
    } catch (reason) {
      showError(reason);
    } finally {
      validateButton.disabled = false;
      queueButton.disabled = validatedLegacyHash !== currentLegacyHash;
      form.removeAttribute("aria-busy");
    }
  }

  burnAck.addEventListener("change", () => {
    burnConfirm.disabled = !burnAck.checked;
  });
  burnConfirm.addEventListener("click", () => {
    if (burnAck.checked) closeBurnDialog(true);
  });
  burnCancel.addEventListener("click", () => closeBurnDialog(false));
  burnDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBurnDialog(false);
  });

  document.querySelectorAll(".info-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      target.hidden = expanded;
    });
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStage(index));
    tab.addEventListener("keydown", (event) => {
      let destination = null;
      if (event.key === "ArrowRight") destination = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") {
        destination = (index - 1 + tabs.length) % tabs.length;
      }
      if (event.key === "Home") destination = 0;
      if (event.key === "End") destination = tabs.length - 1;
      if (destination !== null) {
        event.preventDefault();
        showStage(destination);
      }
    });
  });

  form.addEventListener("change", (event) => {
    const name = event.target.name || event.target.id;
    if (
      event.target === deltaMinimum ||
      event.target === deltaMaximum ||
      event.target === deltaMinSlider ||
      event.target === deltaMaxSlider
    ) {
      syncDelta(event.target);
    }
    applyDependencies(name);
    invalidate();
  });
  form.addEventListener("input", (event) => {
    if (
      event.target === deltaMinimum ||
      event.target === deltaMaximum ||
      event.target === deltaMinSlider ||
      event.target === deltaMaxSlider
    ) {
      syncDelta(event.target);
    }
    applyDependencies(event.target.name || event.target.id);
    invalidate();
  });

  validateButton.addEventListener("click", () => void validateLocally());
  queueButton.addEventListener("click", () => void submit());

  window.MBbotPortalV2 = Object.freeze({
    buildEngineEnvelope: () => engineModel.buildEnvelope(engineValues()),
    renderResults,
    applyDependencies,
  });

  validateButton.disabled = true;
  showStage(0, { focus: false });
  void loadDependencies()
    .then(() => renderConfig())
    .catch((reason) => {
      showError(reason);
      validateButton.disabled = true;
      queueButton.disabled = true;
    });
})();
