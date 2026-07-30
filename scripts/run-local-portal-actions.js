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
          .textContent.includes("Report generated"),
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
          .textContent.includes("Report generated"),
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
      adapterEnvelope.provenance?.dataset === "v2-year" &&
        adapterEnvelope.provenance?.window_preset === "all" &&
        adapterEnvelope.provenance?.holdout_burn_acknowledgement === true &&
        adapterEnvelope.window?.start === "2025-07-25" &&
        adapterEnvelope.window?.end === "2026-07-29",
      "Queued adapter request did not preserve v2-year All-window evidence",
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
          runner_key_editable: true,
          validate_keyboard: "passed",
          queue_pointer: "adapter and legacy passed",
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
