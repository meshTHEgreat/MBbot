(function initializePortalV2() {
  "use strict";

  const legacyModel = window.MBbotPortalV2ControlModel;
  const engineModel = window.MBbotPortalEngineModel;
  const resultsModel = window.MBbotPortalResultsModel;
  const form = document.getElementById("safety-form");
  if (!legacyModel || !engineModel || !resultsModel || !form) return;

  const validateButton = document.getElementById("validate-button");
  const queueButton = document.getElementById("queue-button");
  const queueActionHelp = document.getElementById("queue-action-help");
  const status = document.getElementById("run-status");
  const error = document.getElementById("form-error");
  const sentence = document.getElementById("config-sentence");
  const hash = document.getElementById("config-hash");
  const envelopePreview = document.getElementById("engine-envelope");
  const resultLink = document.getElementById("result-link");
  const routeModeBanner = document.getElementById("route-mode-banner");
  const reviewRouteBanner = document.getElementById("review-route-banner");
  const reviewRows = document.getElementById("review-rows");
  const effectiveConfigTitle = document.getElementById(
    "effective-config-title",
  );
  const configDatasetBadge = document.getElementById(
    "config-dataset-badge",
  );
  const configPresetProvenance = document.getElementById(
    "config-preset-provenance",
  );
  const legendItems = document.getElementById("state-legend-items");
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
  const modeLockedControls = new Set();
  const modeDisplayOriginals = new Map();
  const optionalStageState = new Map();
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

  function createStateIcon(state) {
    const configured = dependencyConfig?.state_legend.find(
      (item) => item.id === state.id,
    );
    const icon = document.createElement("span");
    icon.className = "control-state-symbol";
    icon.dataset.icon = state.icon || configured?.icon || "circle-dashed";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

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
      risk_enabled: value("risk_enabled"),
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

  function updateQueueGuidance() {
    if (!dependencyConfig || !queueActionHelp) return;
    if (currentRunModeName() !== "legacy_macd") {
      queueActionHelp.textContent =
        "To generate a report today, select Legacy MACD in Stage 2, enter the access key, then validate.";
      return;
    }
    queueActionHelp.textContent = queueButton.disabled
      ? "Legacy MACD can generate a report now. Enter the access key, then select Validate only."
      : "Validation passed. Queue backtest is ready to generate the report.";
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

  function controlsForTarget(targetName) {
    return [
      ...new Set(
        targetElements(targetName).flatMap((target) => controlsInside(target)),
      ),
    ];
  }

  function currentRunModeName() {
    const selector = dependencyConfig?.control_state_model?.selector;
    return selector && namedValue(selector) === "legacy_macd"
      ? "legacy_macd"
      : "adapter_pending";
  }

  function currentRunMode() {
    return dependencyConfig?.control_state_model?.modes?.[
      currentRunModeName()
    ];
  }

  function appendDescription(control, descriptionId) {
    const ids = new Set(
      String(control.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    ids.add(descriptionId);
    control.setAttribute("aria-describedby", [...ids].join(" "));
  }

  function markerHost(targetName) {
    const targets = targetElements(targetName);
    if (!targets.length) return null;
    if (targets.length > 1) {
      const fieldset = targets[0].closest("fieldset");
      if (fieldset && targets.every((target) => target.closest("fieldset") === fieldset)) {
        return fieldset;
      }
    }
    const target = targets[0];
    if (
      target.matches(
        "fieldset,.read-only-card,.slider-stack,.parameter-group",
      )
    ) {
      return target;
    }
    const host =
      target.closest(".field,.choice,label,.read-only-card,.control-group") ||
      target.parentElement;
    if (host?.matches("label")) {
      if (host.parentElement?.dataset.stateWrapperFor === targetName) {
        return host.parentElement;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "state-control-wrap";
      wrapper.dataset.stateWrapperFor = targetName;
      host.parentElement.insertBefore(wrapper, host);
      wrapper.append(host);
      return wrapper;
    }
    return host;
  }

  function markerId(targetName) {
    return `control-state-${targetName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function dependencyReasonFor(targetName) {
    if (dependencyReasons.get(targetName)) {
      return dependencyReasons.get(targetName);
    }
    const target = targetElements(targetName)[0];
    const group = target?.closest(".parameter-group,.unavailable-group");
    if (group?.id && dependencyReasons.get(group.id)) {
      return dependencyReasons.get(group.id);
    }
    return (
      target
        ?.closest(".field,.choice,.parameter-group,.unavailable-group,.read-only-card")
        ?.querySelector(".dependency-reason,.reason")
        ?.textContent.trim() || ""
    );
  }

  function renderControlMarker(targetName, state) {
    const host = markerHost(targetName);
    if (!host) return;
    const id = markerId(targetName);
    let marker = document.getElementById(id);
    if (!marker) {
      marker = document.createElement("span");
      marker.id = id;
      marker.className = "control-state-marker";
      host.append(marker);
    }
    marker.dataset.state = state.id;
    marker.replaceChildren();
    const heading = document.createElement("span");
    heading.className = "control-state-marker-heading";
    const symbol = createStateIcon(state);
    const label = document.createElement("strong");
    label.textContent = state.label;
    heading.append(symbol, label);
    const copy = document.createElement("span");
    copy.className = "control-state-copy";
    copy.textContent = state.description;
    marker.append(heading, copy);
    for (const control of controlsForTarget(targetName)) {
      appendDescription(control, id);
    }
    host.dataset.controlState = state.id;
  }

  function clearRunModeLocks() {
    for (const [control, original] of modeDisplayOriginals.entries()) {
      if (Object.hasOwn(original, "checked")) {
        control.checked = original.checked;
      }
      if (Object.hasOwn(original, "value")) {
        control.value = original.value;
      }
    }
    modeDisplayOriginals.clear();
    for (const control of modeLockedControls) {
      if (control.dataset.modeReadonly === "true") {
        control.readOnly = false;
        delete control.dataset.modeReadonly;
      }
      if (control.dataset.modeDisabled === "true") {
        control.disabled = originalDisabled.get(control) || false;
        delete control.dataset.modeDisabled;
      }
      control.removeAttribute("aria-readonly");
    }
    modeLockedControls.clear();
  }

  function applyRunModeDisplayValues() {
    const displayValues = currentRunMode()?.display_values || {};
    for (const [targetName, value] of Object.entries(displayValues)) {
      for (const control of controlsForTarget(targetName)) {
        if (!modeDisplayOriginals.has(control)) {
          modeDisplayOriginals.set(
            control,
            control.type === "checkbox" || control.type === "radio"
              ? { checked: control.checked }
              : { value: control.value },
          );
        }
        if (control.type === "checkbox") {
          control.checked = Boolean(value);
        } else if (control.type === "radio") {
          control.checked = String(control.value) === String(value);
        } else if ("value" in control) {
          control.value = String(value);
        }
      }
    }
  }

  function lockForRunMode(targetName) {
    for (const control of controlsForTarget(targetName)) {
      rememberDisabled(control);
      const canUseReadonly =
        control.matches("input:not([type]),input[type='text'],input[type='number'],input[type='password'],input[type='date'],textarea");
      if (canUseReadonly) {
        control.readOnly = true;
        control.dataset.modeReadonly = "true";
        control.setAttribute("aria-readonly", "true");
      } else {
        control.disabled = true;
        control.dataset.modeDisabled = "true";
        control.removeAttribute("aria-readonly");
      }
      modeLockedControls.add(control);
    }
  }

  function warningForTarget(targetName, modeName) {
    for (const rule of dependencyConfig.control_state_model.warning_rules || []) {
      if (!rule.targets.includes(targetName)) continue;
      const cause = readCause(rule.cause);
      if (!conditionMatches(rule.condition, cause)) continue;
      if (
        modeName === "legacy_macd" &&
        currentRunMode().adapter_only_targets.includes(targetName)
      ) {
        continue;
      }
      return rule.description;
    }
    return "";
  }

  function applyRunModeState() {
    const model = dependencyConfig.control_state_model;
    const modeName = currentRunModeName();
    const mode = currentRunMode();
    const readOnlyTargets = new Set(model.read_only_targets || []);
    const queueTargets = new Set(mode.queue_effective_targets || []);
    const adapterTargets =
      mode.adapter_only_targets === "*"
        ? new Set(model.elements.map((element) => element.target))
        : new Set(mode.adapter_only_targets || []);
    const lockedTargets = new Set(mode.locked_targets || []);
    const disabledOptions = mode.disabled_options || {};
    routeModeBanner.textContent = mode.banner;
    reviewRouteBanner.textContent = mode.banner;
    routeModeBanner.dataset.mode = modeName;
    reviewRouteBanner.dataset.mode = modeName;

    for (const element of model.elements) {
      const targetName = element.target;
      const controls = controlsForTarget(targetName);
      const dependencyLocked = controls.some((control) => control.disabled);
      const dependencyReason = dependencyReasonFor(targetName);
      const warning = warningForTarget(targetName, modeName);
      let state;

      if (Object.hasOwn(disabledOptions, targetName)) {
        state = {
          id: "locked",
          label: "Unavailable on this route",
          description: disabledOptions[targetName],
        };
        lockForRunMode(targetName);
      } else if (readOnlyTargets.has(targetName) || lockedTargets.has(targetName)) {
        state = {
          id: "locked",
          label: "Read-only",
          description:
            lockedTargets.has(targetName) && modeName === "adapter_pending"
              ? "Queue is unavailable until the adapter engine connects, so no access key is needed."
              : dependencyReason || "This value is derived or fixed and cannot be changed here.",
        };
        if (lockedTargets.has(targetName)) lockForRunMode(targetName);
      } else if (dependencyLocked) {
        state = {
          id: "locked",
          label: queueTargets.has(targetName)
            ? "Read-only · queue-effective"
            : "Unavailable in this state",
          description:
            dependencyReason ||
            "Another visible choice controls whether this setting is available.",
        };
      } else if (adapterTargets.has(targetName)) {
        const readOnly = modeName === "legacy_macd";
        state = {
          id: "adapter_only",
          label: readOnly
            ? "Adapter-only · read-only"
            : "Adapter-only · editable",
          description: readOnly
            ? `Does not affect this run. ${
                mode.effective_values?.[targetName] ||
                "The legacy compatibility runner does not read this value."
              }`
            : "Saved to portal-engine-params.v1; queueable when the adapter engine connects.",
        };
        if (readOnly) lockForRunMode(targetName);
      } else if (queueTargets.has(targetName)) {
        state = {
          id: "queue_effective",
          label: "Queue-effective now",
          description:
            targetName === "runner-access-key"
              ? "Authorizes dispatch only; it never enters the request, report, or index."
              : "Changing this value changes the current queued run or its report provenance.",
        };
      } else {
        state = {
          id: "locked",
          label: "Read-only",
          description:
            dependencyReason ||
            "This value is fixed or unavailable in the current state.",
        };
      }

      if (warning) {
        state = {
          id: "warning",
          label: `${state.label} · explicit acknowledgement`,
          description: `${state.description} ${warning}`,
        };
      }
      const override = mode.state_overrides?.[targetName];
      if (override) state = { ...state, ...override };
      renderControlMarker(targetName, state);
    }
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
            : effect.inactive_reason ||
                `Unavailable because ${changedCause || "its prerequisite"} is not active.`,
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
    clearRunModeLocks();
    applyRunModeDisplayValues();
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
    applyRunModeState();
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

  function renderStateLegend() {
    legendItems.replaceChildren();
    for (const item of dependencyConfig.state_legend) {
      const entry = document.createElement("div");
      entry.className = "state-legend-item";
      entry.dataset.state = item.id;
      const heading = document.createElement("span");
      heading.className = "control-state-marker-heading";
      const symbol = createStateIcon(item);
      const label = document.createElement("strong");
      label.textContent = item.label;
      heading.append(symbol, label);
      const copy = document.createElement("span");
      copy.className = "control-state-copy";
      copy.textContent = item.description;
      entry.append(heading, copy);
      legendItems.append(entry);
    }
  }

  function optionalConfig(stage) {
    return dependencyConfig.optional_stages.find(
      (item) => item.stage === stage,
    );
  }

  function optionalState(stage) {
    return optionalStageState.get(stage) || {
      customized: false,
      expanded: false,
    };
  }

  function setOptionalControlDefault(targetName, value) {
    const controls = targetElements(targetName);
    for (const control of controls) {
      if (control.type === "checkbox") {
        control.checked = Boolean(value);
      } else if (control.type === "radio") {
        control.checked = String(control.value) === String(value);
      } else if ("value" in control) {
        control.value = String(value);
      }
    }
  }

  function renderOptionalStage(stage) {
    const config = optionalConfig(stage);
    const state = optionalState(stage);
    const optIn = config.activation === "opt_in";
    const controls = document.getElementById(config.controls_target);
    const gate = document.querySelector(
      `[data-optional-stage="${stage}"]`,
    );
    controls.hidden = !state.expanded;
    gate.replaceChildren();
    const statusCopy = document.createElement("span");
    statusCopy.className = "optional-stage-status";
    const statusTitle = document.createElement("strong");
    statusTitle.textContent = optIn
      ? state.customized
        ? config.active_title
        : config.inactive_title
      : config.read_only
        ? "Using family defaults"
        : state.customized
          ? "Using customized values"
          : "Using defaults";
    const statusDetail = document.createElement("span");
    statusDetail.textContent = optIn
      ? state.customized
        ? config.active_description
        : config.inactive_description
      : config.read_only
        ? "This optional stage is visible and read-only."
        : state.customized
          ? "These values replace the stated defaults in the adapter envelope."
          : "The stated defaults apply even while the controls are collapsed.";
    statusCopy.append(statusTitle, statusDetail);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "button tertiary optional-toggle";
    toggle.setAttribute("aria-expanded", String(state.expanded));
    toggle.setAttribute("aria-controls", config.controls_target);
    toggle.textContent = state.expanded
      ? "Hide details"
      : config.read_only
        ? config.button_label
        : state.customized
          ? "Continue customizing"
          : config.button_label;
    toggle.addEventListener("click", () => {
      const next = optionalState(stage);
      if (!config.read_only && !next.customized) {
        next.customized = true;
        if (optIn) {
          setOptionalControlDefault(config.activation_target, true);
        }
      }
      next.expanded = !next.expanded;
      optionalStageState.set(stage, next);
      renderOptionalStage(stage);
      updateSummaries();
      if (next.expanded) {
        document.getElementById(config.controls_target).focus({
          preventScroll: true,
        });
      }
    });
    gate.append(statusCopy, toggle);

    const resetSlot = document.querySelector(
      `[data-optional-reset-stage="${stage}"]`,
    );
    resetSlot.replaceChildren();
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "button text-button";
    reset.textContent = config.reset_label;
    reset.addEventListener("click", () => {
      if (!config.read_only) {
        for (const [targetName, value] of Object.entries(config.defaults)) {
          setOptionalControlDefault(targetName, value);
        }
        syncDelta(deltaMinimum);
        syncDelta(deltaMaximum);
      }
      optionalStageState.set(stage, {
        customized: false,
        expanded: false,
      });
      applyDependencies();
      if (!config.read_only) invalidate();
      renderOptionalStage(stage);
      document
        .querySelector(`[data-optional-stage="${stage}"] button`)
        ?.focus();
    });
    resetSlot.append(reset);
  }

  function initializeOptionalStages() {
    for (const config of dependencyConfig.optional_stages) {
      optionalStageState.set(config.stage, {
        customized: false,
        expanded: false,
      });
      const controls = document.getElementById(config.controls_target);
      controls.tabIndex = -1;
      renderOptionalStage(config.stage);
    }
  }

  function focusStageHeading(stage) {
    showStage(stage, { focus: false });
    const heading = panels[stage].querySelector("h2");
    heading?.focus();
  }

  function renderStageFlow() {
    for (const definition of dependencyConfig.stage_flow) {
      const tab = tabs[definition.stage];
      if (!tab.querySelector(".stage-requirement")) {
        const requirement = document.createElement("small");
        requirement.className = "stage-requirement";
        requirement.textContent = definition.requirement;
        tab.append(requirement);
      }
      const heading = panels[definition.stage].querySelector("h2");
      heading.tabIndex = -1;
      if (definition.stage === 8) continue;
      const actions = document.createElement("div");
      actions.className = "stage-flow-actions";
      const next = document.createElement("button");
      next.type = "button";
      next.className = "button stage-next";
      next.textContent = definition.next_label;
      const advance = () => focusStageHeading(definition.stage + 1);
      next.addEventListener("click", advance);
      next.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        advance();
      });
      actions.append(next);
      if (definition.fast_review_label) {
        const review = document.createElement("button");
        review.type = "button";
        review.className = "button secondary";
        review.textContent = definition.fast_review_label;
        const reviewDefaults = () => focusStageHeading(8);
        review.addEventListener("click", reviewDefaults);
        review.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          reviewDefaults();
        });
        actions.append(review);
      }
      panels[definition.stage].append(actions);
    }
    showStage(activeStage, { focus: false });
  }

  function reviewSummary(stage) {
    const modeName = currentRunModeName();
    const mode = currentRunMode();
    if (
      modeName === "legacy_macd" &&
      Object.hasOwn(mode.review_values || {}, String(stage))
    ) {
      return mode.review_values[String(stage)];
    }
    const optional = optionalConfig(stage);
    if (optional && !optionalState(stage).customized) {
      return `Defaults — ${optional.default_summary.replace(
        /^Optional\s+—\s+defaults:\s*/i,
        "",
      )}`;
    }
    return document.getElementById(`stage_${stage}_summary`).textContent;
  }

  function renderReview() {
    if (!reviewRows || !dependencyConfig) return;
    const modeName = currentRunModeName();
    const mode = currentRunMode();
    const ignored = new Set(mode.ignored_review_stages || []);
    reviewRows.replaceChildren();
    for (const definition of dependencyConfig.stage_flow.slice(0, 8)) {
      const row = document.createElement("tr");
      const isIgnored = modeName === "legacy_macd" && ignored.has(definition.stage);
      row.classList.toggle("review-row-ignored", isIgnored);
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = `${definition.stage} · ${definition.name}`;
      const values = document.createElement("td");
      values.textContent = reviewSummary(definition.stage);
      const state = document.createElement("td");
      const stateBadge = document.createElement("span");
      stateBadge.className = "review-state-badge";
      stateBadge.dataset.state = isIgnored
        ? "adapter_only"
        : modeName === "legacy_macd"
          ? "queue_effective"
          : "adapter_only";
      const stateSymbol = createStateIcon({
        id:
          isIgnored || modeName !== "legacy_macd"
            ? "adapter_only"
            : "queue_effective",
      });
      const stateText = document.createElement("span");
      stateText.textContent = isIgnored
        ? "Adapter-only · ignored by this run"
        : modeName === "legacy_macd"
          ? "Queue-effective"
          : "Envelope-only";
      stateBadge.append(stateSymbol, stateText);
      state.append(stateBadge);
      const action = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button text-button review-edit";
      edit.textContent = "Edit";
      edit.setAttribute(
        "aria-label",
        `Edit Stage ${definition.stage}: ${definition.name}`,
      );
      edit.addEventListener("click", () =>
        focusStageHeading(definition.stage),
      );
      action.append(edit);
      row.append(name, values, state, action);
      reviewRows.append(row);
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
      payload.schema_version !== "mbbot.portal.config-dependencies.v2" ||
      !Array.isArray(payload.rules)
    ) {
      throw new Error("Dependency graph schema is unsupported.");
    }
    dependencyConfig = payload;
    renderStateLegend();
    initializeOptionalStages();
    renderStageFlow();
    renderAffectsChips();
    applyDependencies();
    dependenciesReady = true;
    form.removeAttribute("data-initializing");
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
    const modeName = currentRunModeName();
    const mode = currentRunMode();
    const familyValue = form.elements.trigger_family.value;
    const family = familyValue.replaceAll("_", " ");
    const optionalByStage = new Map(
      dependencyConfig.optional_stages.map((item) => [item.stage, item]),
    );
    const optionalSummary = (stage, configured) => {
      if (
        modeName === "legacy_macd" &&
        Object.hasOwn(mode.review_values || {}, String(stage))
      ) {
        return `Optional · adapter-only — ${mode.review_values[String(stage)]}`;
      }
      return optionalState(stage).customized
        ? configured
        : optionalByStage.get(stage).default_summary;
    };
    document.getElementById("stage_1_summary").textContent = optionalSummary(
      1,
      `Regime: ${document.getElementById("regime-rule").textContent.trim()}`,
    );
    document.getElementById("stage_2_summary").textContent =
      familyValue === "legacy_macd"
        ? "Trigger: legacy MACD baseline · fixed EMA 12/26/9 · 5m option-premium signal"
        : `Trigger: ${family} · ${form.elements.trigger_timeframe_minutes.value}m bars`;
    const spread = form.elements.spread_cap_percent.value;
    document.getElementById("stage_3_summary").textContent = optionalSummary(
      3,
      `Filters: ${spread}% ${form.elements.spread_denominator.value} spread · $${form.elements.premium_floor.value} floor`,
    );
    document.getElementById("stage_4_summary").textContent = optionalSummary(
      4,
      `Contract: |Delta| ${form.elements.delta_target.value} · band ${form.elements.delta_minimum.value}–${form.elements.delta_maximum.value} · ${form.elements.dte_minimum.value}–${form.elements.dte_maximum.value} DTE`,
    );
    const costLabels = {
      reference: "$0.65 reference per contract per side",
      stress: "$1.30 stress per contract per side",
      both: "$0.65 + $1.30 dual-cost report",
      zero: "$0 comparison · ZERO-COST SIMULATION",
    };
    document.getElementById("stage_5_summary").textContent =
      `Costs: ${costLabels[selected("commission_preset")]}`;
    document.getElementById("stage_6_summary").textContent = optionalSummary(
      6,
      `Risk enabled: ${form.elements.contracts_per_trade.value} contract(s) · ${form.elements.maximum_trades_per_symbol_day.value} trades/symbol/day · ${form.elements.reentry_cooldown_minutes.value}m cooldown`,
    );
    document.getElementById("stage_7_summary").textContent = optionalSummary(
      7,
      `Exits: ${form.elements.profit_target_mode.value.replaceAll("_", " ")} · ${form.elements.time_stop_minutes.value}m · 15:55 ET`,
    );
    document.getElementById("stage_8_summary").textContent =
      modeName === "legacy_macd"
        ? "Review: queue-effective legacy compatibility request"
        : "Review: envelope valid locally · queue waits for the adapter engine";
    renderReview();
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
    let envelope = null;
    try {
      envelope = engineModel.buildEnvelope(engineValues());
      const canonical = engineModel.canonicalJson(envelope);
      currentEngineHash = await sha256(canonical);
      envelopePreview.textContent = JSON.stringify(envelope, null, 2);
    } catch (reason) {
      currentEngineHash = null;
      envelopePreview.textContent =
        reason instanceof Error ? reason.message : "Envelope is invalid.";
    }
    currentLegacyHash = null;
    let legacyInputs = null;
    try {
      legacyInputs = legacyModel.buildInputs(legacyValues(), false);
      currentLegacyHash = await sha256(
        legacyModel.canonicalJson(legacyInputs),
      );
    } catch {
      // The engine surface intentionally includes values the legacy route cannot run.
    }
    const legacyRoute = currentRunModeName() === "legacy_macd";
    configDatasetBadge.textContent = form.elements.dataset_version.value;
    if (legacyRoute) {
      effectiveConfigTitle.textContent =
        "Exact legacy compatibility request";
      sentence.textContent = legacyInputs
        ? legacyModel.sentence(legacyInputs)
        : "Legacy compatibility request needs attention.";
      hash.textContent = currentLegacyHash || "Not available";
      configPresetProvenance.textContent =
        "report-85 legacy comparison · compatibility runner";
    } else {
      effectiveConfigTitle.textContent =
        "Exact adapter envelope · not queueable yet";
      sentence.textContent = envelope
        ? engineSentence(envelope)
        : "Engine envelope needs attention.";
      hash.textContent = currentEngineHash || "Not available";
      configPresetProvenance.textContent =
        envelope?.provenance?.preset || "Not available";
    }
    const allStagesValid = updateStepperValidity();
    queueButton.disabled =
      !dependenciesReady ||
      !legacyRoute ||
      !allStagesValid ||
      !validatedLegacyHash ||
      validatedLegacyHash !== currentLegacyHash;
    updateQueueGuidance();
  }

  function invalidate() {
    validatedLegacyHash = null;
    queueButton.disabled = true;
    updateQueueGuidance();
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
    const definition = dependencyConfig?.stage_flow?.[activeStage];
    currentStageIndicator.textContent = definition
      ? `Stage ${activeStage} of 8 · ${definition.name} · ${definition.requirement}`
      : `Stage ${activeStage} of 8`;
    tabs[activeStage].scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
      inline: "center",
    });
    if (focus) tabs[activeStage].focus();
  }

  function stageIsValid(index) {
    const optional = optionalConfig(index);
    if (optional && !optionalState(index).customized) {
      return true;
    }
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
    const stageValidity = panels
      .slice(0, 8)
      .map((panel, index) => stageIsValid(index));
    const allConfigurationStagesValid = stageValidity.every(Boolean);
    tabs.forEach((tab, index) => {
      const valid =
        index === 8 ? allConfigurationStagesValid : stageValidity[index];
      const definition = dependencyConfig.stage_flow[index];
      tab.dataset.valid = String(valid);
      tab.setAttribute(
        "aria-label",
        `Stage ${index}: ${definition.name} (${definition.requirement}) — ${
          valid ? "valid" : "needs attention"
        }`,
      );
    });
    validateButton.disabled =
      !dependenciesReady || !allConfigurationStagesValid;
    return allConfigurationStagesValid;
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
    if (!updateStepperValidity()) {
      showError(
        new Error(
          "Complete the required stages marked needs attention before validation.",
        ),
      );
      return;
    }
    try {
      if (currentRunModeName() !== "legacy_macd") {
        const envelope = engineModel.buildEnvelope(engineValues());
        currentEngineHash = await sha256(engineModel.canonicalJson(envelope));
        validatedLegacyHash = null;
        queueButton.disabled = true;
        setStatus(
          "success",
          "Engine envelope valid",
          "No runner was started. Queue remains disabled until the parity-certified adapter arrives.",
        );
        updateQueueGuidance();
        return;
      }
      const inputs = legacyModel.buildInputs(legacyValues(), false);
      currentLegacyHash = await sha256(legacyModel.canonicalJson(inputs));
      validatedLegacyHash = currentLegacyHash;
      queueButton.disabled = false;
      setStatus(
        "success",
        "Legacy compatibility validation passed",
        "No runner was started. Queue is enabled only for this exact effective request.",
      );
      updateQueueGuidance();
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
    queueActionHelp.textContent =
      "Submitting the validated request. Keep this tab open until the report link appears.";
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
      updateQueueGuidance();
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
    const toggleDisclosure = () => {
      const target = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      target.hidden = expanded;
    };
    button.addEventListener("click", toggleDisclosure);
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleDisclosure();
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
    if (name === "runner_access_key") return;
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
    if ((event.target.name || event.target.id) === "runner_access_key") {
      return;
    }
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
  validateButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void validateLocally();
  });
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
      form.removeAttribute("data-initializing");
      showError(reason);
      validateButton.disabled = true;
      queueButton.disabled = true;
    });
})();
