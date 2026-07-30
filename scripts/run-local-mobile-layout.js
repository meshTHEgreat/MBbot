#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const url =
  process.env.MBBOT_PORTAL_URL ||
  "http://127.0.0.1:8765/v2/index.html";
const chromePath =
  process.env.MBBOT_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const screenshotDir = process.env.MBBOT_SCREENSHOT_DIR || "";
const label = process.env.MBBOT_AUDIT_LABEL || "mobile";

function safeFilename(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

async function main() {
  process.stderr.write("Launching Chrome for the 360px audit\n");
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
  process.stderr.write("Chrome launched\n");
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.setViewport({
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const states = [];
  const infoDisclosures = [];
  try {
    process.stderr.write(`Opening ${url}\n`);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    process.stderr.write("Portal document loaded\n");
    await page.waitForFunction(
      () =>
        document.getElementById("safety-form")?.dataset.initializing !==
        "true",
      { timeout: 10000 },
    );

    async function inspect(state) {
      const evidence = await page.evaluate(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const selector = (element) => {
          if (element.id) return `#${element.id}`;
          const classes = [...element.classList].slice(0, 3).join(".");
          return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
        };
        const overflow = [...document.querySelectorAll("body *")]
          .filter(visible)
          .filter((element) => {
            const style = getComputedStyle(element);
            const managed = ["auto", "scroll"].includes(style.overflowX);
            const managedDescendant = [...element.querySelectorAll("*")].some(
              (child) => {
                const childStyle = getComputedStyle(child);
                return (
                  ["auto", "scroll"].includes(childStyle.overflowX) &&
                  child.scrollWidth > child.clientWidth
                );
              },
            );
            return (
              element.tagName !== "SELECT" &&
              !managed &&
              !managedDescendant &&
              element.scrollWidth > element.clientWidth + 2
            );
          })
          .map((element) => ({
            selector: selector(element),
            text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 140),
            client_width: element.clientWidth,
            scroll_width: element.scrollWidth,
          }));
        const targets = [
          ...document.querySelectorAll(
            'button,a[href],input:not([type="hidden"]),select,summary',
          ),
        ]
          .filter(visible)
          .filter(
            (element) =>
              !element.matches(".skip-link") || element.matches(":focus"),
          )
          .map((element) => {
            const interactiveSurface =
              ["checkbox", "radio"].includes(element.type) &&
              element.closest("label")
                ? element.closest("label")
                : element;
            const rect = interactiveSurface.getBoundingClientRect();
            return {
              selector: selector(interactiveSurface),
              label:
                element.getAttribute("aria-label") ||
                element.textContent.trim().replace(/\s+/g, " ").slice(0, 80) ||
                element.getAttribute("name") ||
                element.type,
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
            };
          })
          .filter((target) => target.width < 44 || target.height < 44);
        return {
          body_client_width: document.documentElement.clientWidth,
          body_scroll_width: document.documentElement.scrollWidth,
          overflow,
          undersized_targets: targets,
        };
      });
      states.push({ state, ...evidence });
    }

    async function openStage(stage) {
      await page.click(`[role="tab"][data-stage="${stage}"]`);
      await page.waitForFunction(
        (value) => !document.getElementById(`stage-panel-${value}`).hidden,
        { timeout: 5000 },
        stage,
      );
    }

    for (let stage = 0; stage <= 8; stage += 1) {
      process.stderr.write(`Inspecting mobile stage ${stage}\n`);
      await openStage(stage);
      const disclosures = await page.evaluate((stageNumber) => {
        const panel = document.getElementById(`stage-panel-${stageNumber}`);
        return [...panel.querySelectorAll(".info-button[aria-controls]")].map(
          (button) => {
            const target = document.getElementById(
              button.getAttribute("aria-controls"),
            );
            button.click();
            const passed =
              button.getAttribute("aria-expanded") === "true" &&
              target &&
              !target.hidden;
            button.click();
            return {
              label: button.getAttribute("aria-label"),
              passed,
            };
          },
        );
      }, stage);
      infoDisclosures.push(...disclosures);
      await inspect(`stage-${stage}-collapsed`);
      const optional = await page.$(
        `[data-optional-stage="${stage}"] button`,
      );
      if (optional) {
        await optional.click();
        await inspect(`stage-${stage}-expanded`);
      }
      if (screenshotDir) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({
          path: path.join(
            screenshotDir,
            `${safeFilename(label)}-stage-${stage}.png`,
          ),
          fullPage: true,
        });
      }
    }

    const bodyOverflow = states.filter(
      (state) => state.body_scroll_width > state.body_client_width,
    );
    const uniqueOverflow = [
      ...new Map(
        states
          .flatMap((state) =>
            state.overflow.map((item) => [
              `${item.selector}|${item.text}`,
              item,
            ]),
          )
          .values(),
      ),
    ];
    const uniqueTargets = [
      ...new Map(
        states
          .flatMap((state) =>
            state.undersized_targets.map((item) => [
              `${item.selector}|${item.label}`,
              item,
            ]),
          )
          .values(),
      ),
    ];
    const report = {
      url,
      viewport: "360x800",
      states: states.length,
      body_overflow_states: bodyOverflow.map((state) => state.state),
      overflowing_elements: uniqueOverflow,
      undersized_targets: uniqueTargets,
      info_disclosures: infoDisclosures,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (
      report.body_overflow_states.length ||
      report.overflowing_elements.length ||
      report.undersized_targets.length ||
      report.info_disclosures.length !== 5 ||
      report.info_disclosures.some((item) => !item.passed)
    ) {
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
