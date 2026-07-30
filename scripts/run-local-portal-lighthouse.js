#!/usr/bin/env node
"use strict";

const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer-core");

const url =
  process.env.MBBOT_PORTAL_URL ||
  "http://127.0.0.1:8765/v2/index.html";
const chromePath =
  process.env.MBBOT_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const lighthouseModule = await import(
    pathToFileURL(require.resolve("lighthouse")).href
  );
  const lighthouse = lighthouseModule.default;
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    timeout: 10000,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-sandbox",
      "--remote-debugging-port=0",
    ],
  });
  try {
    const port = Number(new URL(browser.wsEndpoint()).port);
    const result = await lighthouse(url, {
      port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 800,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    const report = {
      url,
      viewport: "360x800 mobile",
      performance: Math.round(
        result.lhr.categories.performance.score * 100,
      ),
      accessibility: Math.round(
        result.lhr.categories.accessibility.score * 100,
      ),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.performance < 90 || report.accessibility < 95) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
