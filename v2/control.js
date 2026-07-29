(function initializePortalV2() {
  "use strict";

  const model = window.MBbotPortalV2ControlModel;
  const form = document.getElementById("safety-form");
  if (!model || !form) return;

  const validateButton = document.getElementById("validate-button");
  const queueButton = document.getElementById("queue-button");
  const status = document.getElementById("run-status");
  const error = document.getElementById("form-error");
  const sentence = document.getElementById("config-sentence");
  const hash = document.getElementById("config-hash");
  const watermark = document.getElementById("safety-watermark");
  const resultLink = document.getElementById("result-link");
  const burnDialog = document.getElementById("burn-dialog");
  const burnAck = document.getElementById("burn-ack");
  const burnConfirm = document.getElementById("burn-confirm");
  const burnCancel = document.getElementById("burn-cancel");
  const customDates = document.getElementById("custom-dates");
  const customReason = document.getElementById("custom-date-reason");
  const zeroAck = document.getElementById("zero-cost-ack");
  const zeroReason = document.getElementById("zero-cost-reason");
  const runCounter = document.getElementById("window-run-count");
  let burnAcknowledged = false;
  let validatedHash = null;
  let currentHash = null;
  let dialogReturnFocus = null;

  const delay = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function values() {
    return {
      experiment_label: form.elements.experiment_label.value,
      symbols: [...form.querySelectorAll('input[name="symbol"]:checked')].map(
        (input) => input.value,
      ),
      window_preset: selected("window_preset"),
      start_date: form.elements.start_date.value,
      end_date: form.elements.end_date.value,
      holdout_burn_acknowledgement: burnAcknowledged,
      commission_preset: selected("commission_preset"),
      unrealistic_costs_acknowledged: zeroAck.checked,
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
    if (field === "symbols") {
      form.querySelector('input[name="symbol"]')?.setAttribute(
        "aria-invalid",
        "true",
      );
    } else if (field && form.elements[field] instanceof HTMLElement) {
      form.elements[field].setAttribute("aria-invalid", "true");
    }
    error.focus();
    setStatus("error", "Needs attention", "Nothing was queued.");
  }

  function applyWindowState({ openBurn = true } = {}) {
    const preset = selected("window_preset");
    const custom = preset === "custom_discovery";
    form.elements.start_date.disabled = !custom;
    form.elements.end_date.disabled = !custom;
    customDates.dataset.enabled = String(custom);
    customReason.textContent = custom
      ? "Custom dates are clamped to the discovery boundary."
      : "Set by Window preset; choose Custom inside discovery to edit.";
    if (preset === "discovery") {
      form.elements.start_date.value = model.WINDOWS.discovery.start;
      form.elements.end_date.value = model.WINDOWS.discovery.end;
      burnAcknowledged = false;
      runCounter.textContent = "You have run 14 configs on this window.";
    } else if (preset === "holdout") {
      form.elements.start_date.value = model.WINDOWS.holdout.start;
      form.elements.end_date.value = model.WINDOWS.holdout.end;
      runCounter.textContent =
        "Holdout results are a one-time strategy-family decision.";
      if (!burnAcknowledged && openBurn) openBurnDialog();
    } else {
      burnAcknowledged = false;
      runCounter.textContent =
        "The counter is recorded against this custom discovery window.";
    }
  }

  function applyCostState() {
    const preset = selected("commission_preset");
    const zero = preset === "zero";
    zeroAck.disabled = !zero;
    if (!zero) zeroAck.checked = false;
    zeroReason.textContent = zero
      ? "Required: the report will be watermarked ZERO-COST SIMULATION."
      : "Available only after selecting the $0 comparison preset.";
  }

  function updateWatermark() {
    const flags = [];
    if (selected("window_preset") === "holdout" && burnAcknowledged) {
      flags.push("HOLDOUT RUN");
    }
    if (
      selected("commission_preset") === "zero" &&
      zeroAck.checked
    ) {
      flags.push("ZERO-COST SIMULATION");
    }
    watermark.textContent = flags.join(" · ");
    watermark.hidden = flags.length === 0;
  }

  async function renderConfig() {
    clearError();
    queueButton.disabled = true;
    resultLink.hidden = true;
    try {
      const inputs = model.buildInputs(values(), false);
      const canonical = model.canonicalJson(inputs);
      currentHash = await sha256(canonical);
      sentence.textContent = model.sentence(inputs);
      hash.textContent = currentHash;
      queueButton.disabled = validatedHash !== currentHash;
    } catch (reason) {
      currentHash = null;
      sentence.textContent =
        reason instanceof Error ? reason.message : "Configuration is invalid.";
      hash.textContent = "Not available until the safety checks pass";
    }
    updateWatermark();
  }

  function invalidate() {
    validatedHash = null;
    queueButton.disabled = true;
    setStatus(
      "ready",
      "Ready to validate",
      "Validation is required again after every configuration change.",
    );
    void renderConfig();
  }

  function openBurnDialog() {
    dialogReturnFocus = document.activeElement;
    burnAck.checked = false;
    burnConfirm.disabled = true;
    burnDialog.hidden = false;
    burnDialog.showModal();
    burnAck.focus();
  }

  function closeBurnDialog({ accepted }) {
    burnDialog.close();
    burnDialog.hidden = true;
    if (!accepted) {
      burnAcknowledged = false;
      form.querySelector(
        'input[name="window_preset"][value="discovery"]',
      ).checked = true;
      applyWindowState({ openBurn: false });
    }
    dialogReturnFocus?.focus();
    invalidate();
  }

  burnAck.addEventListener("change", () => {
    burnConfirm.disabled = !burnAck.checked;
  });
  burnConfirm.addEventListener("click", () => {
    if (!burnAck.checked) return;
    burnAcknowledged = true;
    closeBurnDialog({ accepted: true });
  });
  burnCancel.addEventListener("click", () => {
    closeBurnDialog({ accepted: false });
  });
  burnDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBurnDialog({ accepted: false });
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

  form.querySelectorAll('input[name="window_preset"]').forEach((input) => {
    input.addEventListener("change", () => {
      applyWindowState();
      invalidate();
    });
  });
  form
    .querySelectorAll('input[name="commission_preset"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        applyCostState();
        invalidate();
      });
    });
  form.addEventListener("input", (event) => {
    invalidate();
  });

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

  async function followRun(runId, key, validationOnly) {
    for (let attempt = 0; attempt < 1080; attempt += 1) {
      const payload = await gatewayRequest(
        `/api/backtests/${encodeURIComponent(runId)}`,
        key,
      );
      if (payload.status === "queued") {
        setStatus("queued", "Queued", "Waiting for the local runner.");
      } else if (payload.status === "in_progress") {
        setStatus(
          "running",
          validationOnly ? "Validating" : "Running backtest",
          "The local runner is using only the verified offline archive.",
        );
      } else if (payload.status === "completed") {
        if (payload.conclusion !== "success") {
          throw new Error(
            `The runner finished with ${payload.conclusion || "unknown"} status.`,
          );
        }
        if (validationOnly) {
          validatedHash = currentHash;
          queueButton.disabled = false;
          setStatus(
            "success",
            "Validation passed",
            "Queue is enabled for this exact SHA-256 configuration.",
          );
          return;
        }
        const path = String(payload.report_path || "");
        if (!/^v2\/reports\/github-\d+-\d+\.html$/.test(path)) {
          throw new Error("The runner returned an invalid preview report path.");
        }
        resultLink.href = path.replace(/^v2\//, "");
        resultLink.hidden = false;
        setStatus(
          "success",
          "Report generated",
          "The guided-portal report is publishing under /v2.",
        );
        return;
      }
      await delay(payload.status === "queued" ? 15000 : 10000);
    }
    throw new Error("The run exceeded the three-hour monitoring window.");
  }

  async function validateLocally() {
    clearError();
    try {
      const inputs = model.buildInputs(values(), false);
      const fingerprint = await sha256(model.canonicalJson({
        ...inputs,
        validate_only: false,
      }));
      currentHash = fingerprint;
      validatedHash = fingerprint;
      queueButton.disabled = false;
      setStatus(
        "success",
        "Validation passed",
        "No runner was started. Queue is enabled for this exact SHA-256 configuration.",
      );
    } catch (reason) {
      showError(reason);
    }
  }

  async function submit() {
    clearError();
    const key = form.elements.runner_access_key.value;
    if (!key) {
      showError(
        Object.assign(new Error("Enter the runner access key."), {
          field: "runner_access_key",
        }),
      );
      return;
    }
    let inputs;
    try {
      inputs = model.buildInputs(values(), false);
      const fingerprint = await sha256(model.canonicalJson(inputs));
      if (fingerprint !== validatedHash) {
        throw new Error(
          "This configuration changed after validation. Validate it again.",
        );
      }
      currentHash = fingerprint;
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
      "Submitting the versioned safety envelope to the preview runner.",
    );
    try {
      const payload = await gatewayRequest("/api/backtests", key, {
        method: "POST",
        body: JSON.stringify({ inputs }),
      });
      if (!payload.run_id) {
        throw new Error("The gateway accepted the request without a run ID.");
      }
      await followRun(payload.run_id, key, false);
    } catch (reason) {
      showError(reason);
    } finally {
      validateButton.disabled = false;
      queueButton.disabled = validatedHash !== currentHash;
      form.removeAttribute("aria-busy");
    }
  }

  validateButton.addEventListener("click", () => void validateLocally());
  queueButton.addEventListener("click", () => void submit());

  applyWindowState({ openBurn: false });
  applyCostState();
  void renderConfig();
})();
