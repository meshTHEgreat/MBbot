#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const puppeteer = require("puppeteer-core");

const url =
  process.env.MBBOT_PORTAL_URL ||
  "http://127.0.0.1:8765/v2/index.html";
const chromePath =
  process.env.MBBOT_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const axeSource = fs.readFileSync(
  require.resolve("axe-core/axe.min.js"),
  "utf8",
);

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    timeout: 10000,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--window-size=360,800",
    ],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.setViewport({ width: 360, height: 800 });
  const audits = [];
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    await page.waitForFunction(
      () =>
        document
          .getElementById("route-mode-banner")
          ?.textContent.includes("Envelope-only"),
      { timeout: 10000 },
    );
    await page.addScriptTag({ content: axeSource });

    async function audit(label) {
      const result = await page.evaluate(async () => {
        try {
          const axeResult = await axe.run(document, {
            resultTypes: ["violations"],
          });
          return {
            violations: axeResult.violations.map((item) => ({
              id: item.id,
              impact: item.impact,
              help: item.help,
              nodes: item.nodes.map((node) => ({
                target: node.target,
                html: node.html,
                failure_summary: node.failureSummary,
              })),
            })),
          };
        } catch (error) {
          return { error: String(error) };
        }
      });
      if (result.error) throw new Error(`${label}: ${result.error}`);
      audits.push({ label, violations: result.violations });
    }

    async function openStage(stage) {
      await page.click(`[data-stage="${stage}"]`);
      await page.waitForFunction(
        (stageNumber) =>
          !document.getElementById(`stage-panel-${stageNumber}`).hidden,
        { timeout: 5000 },
        stage,
      );
    }

    async function auditStages(routeLabel) {
      for (let stage = 0; stage <= 8; stage += 1) {
        await openStage(stage);
        await audit(`${routeLabel}:stage-${stage}:collapsed`);
        const optional = await page.$(
          `[data-optional-stage="${stage}"] button`,
        );
        if (optional) {
          await optional.click();
          await audit(`${routeLabel}:stage-${stage}:expanded`);
        }
      }
    }

    await auditStages("adapter-pending");

    await openStage(0);
    await page.click('input[name="window_preset"][value="holdout"]');
    await page.waitForFunction(
      () => document.getElementById("burn-dialog")?.open,
      { timeout: 5000 },
    );
    await audit("holdout-alertdialog");
    await page.click("#burn-cancel");

    await openStage(2);
    await page.select("#trigger_family", "legacy_macd");
    await page.waitForFunction(
      () =>
        document
          .getElementById("route-mode-banner")
          ?.textContent.includes("Queue-effective legacy"),
      { timeout: 5000 },
    );
    await auditStages("legacy-compatibility");

    const allViolations = audits.flatMap((entry) =>
      entry.violations.map((violation) => ({
        audit: entry.label,
        ...violation,
      })),
    );
    const critical = allViolations.filter(
      (violation) => violation.impact === "critical",
    );
    const serious = allViolations.filter(
      (violation) => violation.impact === "serious",
    );
    const report = {
      url,
      viewport: "360x800",
      audits: audits.length,
      unique_violation_ids: [
        ...new Set(allViolations.map((violation) => violation.id)),
      ],
      total_violations_across_states: allViolations.length,
      critical_violations: critical,
      serious_violations: serious,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (critical.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
