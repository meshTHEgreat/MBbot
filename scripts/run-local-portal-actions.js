#!/usr/bin/env node
"use strict";

const puppeteer = require("puppeteer-core");

const url =
  process.env.MBBOT_PORTAL_URL ||
  "http://127.0.0.1:8765/v2/index.html";
const chromePath =
  process.env.MBBOT_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    timeout: 10000,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  await page.setViewport({
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const intercepted = [];
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const parsed = new URL(request.url());
    if (parsed.pathname.endsWith("/v2/reports/github-123456-1.html")) {
      request.respond({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Published test report</title>",
      });
      return;
    }
    if (parsed.pathname.endsWith("/reports/report-index.md")) {
      request.respond({
        status: 200,
        contentType: "text/markdown",
        body: "[Open](../v2/reports/github-123456-1.html)",
      });
      return;
    }
    if (
      parsed.hostname === "mbbot-backtest-dispatch.alhazmimeshari.workers.dev"
    ) {
      intercepted.push({
        method: request.method(),
        pathname: parsed.pathname,
      });
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, OPTIONS",
      };
      if (request.method() === "OPTIONS") {
        request.respond({
          status: 204,
          headers,
        });
        return;
      }
      if (request.method() === "POST") {
        intercepted.at(-1).body = JSON.parse(request.postData() || "{}");
        request.respond({
          status: 200,
          contentType: "application/json",
          headers,
          body: JSON.stringify({ run_id: "123456" }),
        });
      } else if (parsed.pathname === "/api/dataset-capabilities") {
        request.respond({
          status: 200,
          contentType: "application/json",
          headers,
          body: JSON.stringify({
            schema_version:
              "mbbot.backtest-control.dataset-capabilities.v1",
            generated_at_utc: "2026-07-30T16:45:35Z",
            datasets: [
              {
                id: "v1",
                available: true,
                validated: true,
                sessions: 62,
                latest_session: "2026-07-24",
                symbols: ["AAPL", "NVDA", "QQQ", "SPY", "TSLA"],
                windows: [
                  {
                    id: "discovery",
                    start: "2026-04-27",
                    end: "2026-05-22",
                  },
                  {
                    id: "holdout",
                    start: "2026-05-26",
                    end: "2026-07-24",
                  },
                ],
              },
              {
                id: "v2-year",
                available: true,
                validated: true,
                sessions: 254,
                latest_session: "2026-07-29",
                symbols: ["AAPL", "NVDA", "QQQ", "SPY", "TSLA"],
                windows: [
                  {
                    id: "discovery",
                    start: "2025-07-25",
                    end: "2026-05-22",
                  },
                  {
                    id: "validation",
                    start: "2026-05-26",
                    end: "2026-06-26",
                  },
                  {
                    id: "holdout",
                    start: "2026-06-29",
                    end: "2026-07-29",
                  },
                ],
              },
            ],
          }),
        });
      } else {
        request.respond({
          status: 200,
          contentType: "application/json",
          headers,
          body: JSON.stringify({
            status: "completed",
            conclusion: "success",
            report_path: "v2/reports/github-123456-1.html",
          }),
        });
      }
      return;
    }
    request.continue();
  });

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    await page.waitForFunction(
      () => document.getElementById("safety-form")?.dataset.initializing !== "true",
    );

    assert(
      !(await page.$eval(
        '#dataset_version option[value="v2-year"]',
        (option) => option.disabled,
      )),
      "Certified v2-year dataset stayed disabled",
    );
    const recommendedV1Window = await page.evaluate(() => ({
      title: document
        .querySelector('[data-window-title="discovery"]')
        .textContent.trim(),
      start: document.getElementById("start_date").value,
      end: document.getElementById("end_date").value,
    }));
    assert(
      recommendedV1Window.title === "Recommended — 4-week discovery" &&
        recommendedV1Window.start === "2026-04-27" &&
        recommendedV1Window.end === "2026-05-22",
      "v1 did not bind its recommended 4-week discovery block",
    );
    await page.select("#dataset_version", "v2-year");
    const recommendedWindow = await page.evaluate(() => ({
      title: document
        .querySelector('[data-window-title="discovery"]')
        .textContent.trim(),
      description: document
        .querySelector('[data-window-description="discovery"]')
        .textContent.trim(),
      start: document.getElementById("start_date").value,
      end: document.getElementById("end_date").value,
    }));
    assert(
      recommendedWindow.title === "Recommended — 10-month discovery",
      "Year dataset did not name its recommended 10-month block",
    );
    assert(
      recommendedWindow.start === "2025-07-25" &&
        recommendedWindow.end === "2026-05-22",
      "Year recommended dates did not match the capability manifest",
    );

    await page.click(
      'input[name="window_preset"][value="custom_discovery"]',
    );
    await page.$eval("#start_date", (input) => {
      input.value = "2025-11-03";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.$eval("#end_date", (input) => {
      input.value = "2025-12-15";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert(
      await page.evaluate(
        () =>
          document.getElementById("start_date").value === "2025-11-03" &&
          document.getElementById("end_date").value === "2025-12-15",
      ),
      "Custom dates were overwritten by the dependency renderer",
    );
    await page.$eval("#end_date", (input) => {
      input.value = "2025-10-01";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert(
      await page.evaluate(
        () =>
          !document.getElementById("window-date-error").hidden &&
          document
            .querySelector('[role="tab"][data-stage="0"]')
            .getAttribute("data-valid") === "false" &&
          document.getElementById("validate-button").disabled,
      ),
      "Reversed custom dates did not fail closed with a visible message",
    );

    await page.click('input[name="window_preset"][value="all"]');
    await page.waitForFunction(
      () => document.getElementById("burn-dialog").open,
    );
    assert(
      await page.$eval(
        "#burn-copy",
        (copy) =>
          copy.textContent.includes("includes Validation and Holdout") &&
          copy.textContent.includes("permanently burns it"),
      ),
      "All-data dialog did not explain the protected-evidence burn",
    );
    await page.click("#burn-ack");
    await page.click("#burn-confirm");
    assert(
      await page.evaluate(
        () =>
          document.getElementById("start_date").value === "2025-07-25" &&
          document.getElementById("end_date").value === "2026-07-29" &&
          !document.getElementById("holdout_page_watermark").hidden &&
          !document.getElementById("holdout_report_watermark").hidden &&
          !document.getElementById("holdout_run_log_stamp").hidden,
      ),
      "All-data acknowledgement did not bind dates and audit stamps",
    );

    await page.select("#dataset_version", "v1");
    const queuedThreeMonthWindow = await page.evaluate(() => ({
      dataset: document.getElementById("dataset_version").value,
      preset: document.querySelector(
        'input[name="window_preset"]:checked',
      ).value,
      start: document.getElementById("start_date").value,
      end: document.getElementById("end_date").value,
    }));
    assert(
      queuedThreeMonthWindow.dataset === "v1" &&
        queuedThreeMonthWindow.preset === "discovery" &&
        queuedThreeMonthWindow.start === "2026-04-27" &&
        queuedThreeMonthWindow.end === "2026-05-22",
      "Switching back to the three-month dataset did not reset the exact discovery window",
    );

    const nextButtons = [];
    for (let stage = 0; stage < 8; stage += 1) {
      await page.click(`[role="tab"][data-stage="${stage}"]`);
      const label = await page.$eval(
        `#stage-panel-${stage} .stage-next`,
        (button) => button.textContent.trim(),
      );
      await page.click(`#stage-panel-${stage} .stage-next`);
      const moved = await page.evaluate(
        (nextStage) =>
          !document.getElementById(`stage-panel-${nextStage}`).hidden &&
          document.activeElement ===
            document.querySelector(`#stage-panel-${nextStage} h2`),
        stage + 1,
      );
      assert(moved, `Stage ${stage} Next button did not advance and focus`);
      nextButtons.push(label);
    }

    await page.click('[role="tab"][data-stage="2"]');
    const fixedTimeframes = await page.evaluate(() => ({
      hiddenRequestValue:
        document.getElementById("trigger_timeframe_minutes").type === "hidden" &&
        document.getElementById("trigger_timeframe_minutes").value === "5",
      triggerCopy: document
        .getElementById("trigger_timeframe_display")
        .textContent.replace(/\s+/g, " ")
        .trim(),
      executionCopy: document
        .getElementById("execution_timeframe")
        .textContent.replace(/\s+/g, " ")
        .trim(),
    }));
    assert(
      fixedTimeframes.hiddenRequestValue &&
        fixedTimeframes.triggerCopy.includes("Fixed by the certified feature store"),
      "Fixed trigger timeframe still presents as a writable control",
    );
    assert(
      fixedTimeframes.executionCopy.includes("first valid 1-minute quote"),
      "Execution timeframe does not explain its fixed evidence",
    );

    const familyControlSets = {
      trend_persistence: [
        "fast_ma_snapshots",
        "slow_ma_snapshots",
        "ma_gap_percent",
        "momentum_window_minutes",
        "momentum_percent",
      ],
      opening_range_breakout: [
        "orb_range_minutes",
        "orb_buffer_percent",
        "orb_regime_enabled",
      ],
      order_flow_imbalance: [
        "order_flow_window_bars",
        "order_flow_threshold",
        "order_flow_underlying_agreement",
      ],
      premium_underlying_divergence: [
        "divergence_underlying_velocity_min",
        "divergence_premium_velocity_max",
        "divergence_window_minutes",
      ],
      mean_reversion_fade: [
        "mean_reversion_rsi_period",
        "mean_reversion_rsi_extreme",
        "mean_reversion_reversal_confirm",
      ],
    };
    for (const [family, names] of Object.entries(familyControlSets)) {
      await page.select("#trigger_family", family);
      const locked = await page.evaluate(
        (controlNames) =>
          controlNames.filter((name) => {
            const control = document.querySelector(`[name="${name}"]`);
            return !control || control.disabled || control.readOnly;
          }),
        names,
      );
      assert(
        locked.length === 0,
        `${family} has queue-effective controls locked: ${locked.join(", ")}`,
      );
    }

    await page.select("#trigger_family", "opening_range_breakout");
    await page.click('[role="tab"][data-stage="1"]');
    await page.click('[data-optional-stage="1"] button');
    const regimeGuidance = await page
      .$eval("#regime-guidance", (node) => node.textContent.trim());
    assert(
      regimeGuidance.includes("Queue-effective option available"),
      "Regime stage does not identify the configurable ORB regime option",
    );
    await page.click("#regime-settings-button");
    assert(
      await page.evaluate(
        () =>
          !document.getElementById("stage-panel-2").hidden &&
          document.activeElement ===
            document.querySelector("#stage-panel-2 h2"),
      ),
      "Regime settings button did not open and focus Setup & Trigger",
    );
    await page.select("#trigger_family", "trend_persistence");

    await page.click('[role="tab"][data-stage="6"]');
    const riskBefore = await page.evaluate(() => ({
      enabled: document.getElementById("risk_enabled").checked,
      controlsHidden: document.getElementById("optional-controls-6").hidden,
      summary: document.getElementById("stage_6_summary").textContent.trim(),
      button: document
        .querySelector('[data-optional-stage="6"] button')
        .textContent.trim(),
    }));
    assert(!riskBefore.enabled, "Risk must default to disabled");
    assert(riskBefore.controlsHidden, "Disabled risk controls must be collapsed");
    assert(
      riskBefore.summary.includes("disabled"),
      "Risk summary must name the disabled state",
    );
    assert(
      riskBefore.button === "Enable & customize",
      "Risk activation button label is incorrect",
    );

    await page.click('[data-optional-stage="6"] button');
    const riskEnabled = await page.evaluate(() => ({
      enabled: document.getElementById("risk_enabled").checked,
      controlsHidden: document.getElementById("optional-controls-6").hidden,
      title: document
        .querySelector('[data-optional-stage="6"] strong')
        .textContent.trim(),
    }));
    assert(riskEnabled.enabled, "Risk activation button did not enable risk");
    assert(!riskEnabled.controlsHidden, "Risk controls did not open");
    assert(riskEnabled.title === "Risk enabled", "Risk enabled state is unclear");

    await page.click('[data-optional-reset-stage="6"] button');
    const riskReset = await page.evaluate(() => ({
      enabled: document.getElementById("risk_enabled").checked,
      controlsHidden: document.getElementById("optional-controls-6").hidden,
    }));
    assert(!riskReset.enabled, "Disable risk controls did not clear activation");
    assert(riskReset.controlsHidden, "Disabled risk controls did not collapse");

    await page.click('[role="tab"][data-stage="8"]');
    const defaultActions = await page.evaluate(() => {
      const key = document.getElementById("runner-access-key");
      return {
        keyDisabled: key.disabled,
        keyReadOnly: key.readOnly,
        validateDisabled: document.getElementById("validate-button").disabled,
        queueDisabled: document.getElementById("queue-button").disabled,
      };
    });
    assert(!defaultActions.keyDisabled, "Runner access key is disabled");
    assert(!defaultActions.keyReadOnly, "Runner access key is read-only");
    assert(!defaultActions.validateDisabled, "Validate button is disabled");
    assert(defaultActions.queueDisabled, "Queue must wait for a queueable route");
    await page.type("#runner-access-key", "local-interaction-test-key");

    await page.focus("#validate-button");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document
          .querySelector("#run-status strong")
          .textContent.includes("Adapter request validation passed"),
    );
    assert(
      !(await page.$eval("#queue-button", (button) => button.disabled)),
      "Certified adapter family did not enable Queue",
    );
    await page.click("#queue-button");
    await page.waitForFunction(
      () =>
        !document.getElementById("result-link").hidden &&
        document
          .querySelector("#run-status strong")
          .textContent.includes("Report published"),
    );

    await page.click('[role="tab"][data-stage="2"]');
    await page.select("#trigger_family", "legacy_macd");
    await page.waitForFunction(() =>
      document
        .getElementById("route-mode-banner")
        .textContent.includes("Queue-effective legacy"),
    );
    await page.click('[role="tab"][data-stage="8"]');
    const legacyKey = await page.$eval("#runner-access-key", (key) => ({
      disabled: key.disabled,
      readOnly: key.readOnly,
      valuePreserved: key.value === "local-interaction-test-key",
    }));
    assert(!legacyKey.disabled && !legacyKey.readOnly, "Legacy key is not editable");
    assert(legacyKey.valuePreserved, "Route change discarded the access key");

    await page.click("#validate-button");
    await page.waitForFunction(
      () => !document.getElementById("queue-button").disabled,
    );
    await page.click("#queue-button");
    await page.waitForFunction(
      () =>
        !document.getElementById("result-link").hidden &&
        document
          .querySelector("#run-status strong")
          .textContent.includes("Report published"),
    );

    assert(
      intercepted.some(
        (request) =>
          request.method === "POST" &&
          request.pathname === "/api/backtests",
      ),
      "Queue button did not submit the report request",
    );
    assert(
      intercepted.some(
        (request) =>
          request.method === "GET" &&
          request.pathname === "/api/backtests/123456",
      ),
      "Queued report was not followed to completion",
    );
    const adapterPost = intercepted.find(
      (request) =>
        request.method === "POST" &&
        request.pathname === "/api/backtests" &&
        Boolean(request.body?.inputs?.request_envelope),
    );
    const adapterEnvelope = JSON.parse(
      adapterPost?.body?.inputs?.request_envelope || "{}",
    );
    assert(adapterPost, "Adapter request body was not captured");
    assert(
      adapterEnvelope.provenance?.dataset === "v1" &&
        adapterEnvelope.provenance?.dataset_label === "v1-study" &&
        adapterEnvelope.provenance?.window_preset === "discovery" &&
        adapterEnvelope.provenance?.holdout_burn_acknowledgement === false &&
        adapterEnvelope.window?.start === "2026-04-27" &&
        adapterEnvelope.window?.end === "2026-05-22" &&
        adapterPost.body.inputs.dataset_profile === "portal-adapter-v1-study",
      "Queued adapter request did not preserve the three-month v1 discovery route",
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          url,
          viewport: "360x800",
          next_buttons: nextButtons.length,
          recommended_v1_window: recommendedV1Window,
          recommended_year_window: recommendedWindow,
          custom_date_validation: "passed",
          protected_all_window: "passed",
          risk_default: "disabled",
          risk_enable_disable: "passed",
          fixed_timeframe_presentation: "passed",
          active_family_controls_editable: "passed",
          regime_settings_route: "passed",
          runner_key_editable: true,
          validate_keyboard: "passed",
          queue_pointer: "adapter and legacy passed",
          protected_year_window_ui: {
            dataset: "v2-year",
            preset: "all",
            start: "2025-07-25",
            end: "2026-07-29",
          },
          queued_adapter_window: {
            dataset: adapterEnvelope.provenance.dataset,
            preset: adapterEnvelope.provenance.window_preset,
            start: adapterEnvelope.window.start,
            end: adapterEnvelope.window.end,
            watermarks: adapterEnvelope.provenance.report_watermarks,
            run_log_stamps: adapterEnvelope.provenance.run_log_stamps,
          },
          intercepted_report_route: intercepted.map(
            ({ method, pathname }) => ({ method, pathname }),
          ),
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
