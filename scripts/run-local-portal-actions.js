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
        request.respond({
          status: 200,
          contentType: "application/json",
          headers,
          body: JSON.stringify({ run_id: "123456" }),
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
          .textContent.includes("Engine envelope valid"),
    );
    assert(
      await page.$eval("#queue-button", (button) => button.disabled),
      "Adapter-pending family incorrectly enabled Queue",
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

    process.stdout.write(
      `${JSON.stringify(
        {
          url,
          viewport: "360x800",
          next_buttons: nextButtons.length,
          risk_default: "disabled",
          risk_enable_disable: "passed",
          runner_key_editable: true,
          validate_keyboard: "passed",
          queue_pointer: "passed",
          intercepted_report_route: intercepted,
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
