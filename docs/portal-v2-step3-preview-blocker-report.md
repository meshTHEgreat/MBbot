# Portal v2 Step 3 preview blocker report

Date: 2026-07-29

Branch: `portal-v2`

Blocked build-order step: 3 — real preview deployment and runner validation

## Completed locally

- The live `index.html` is byte-unchanged from `origin/main`:
  - Git blob: `d85fc39a95f709b657de5e81a8c26e9f5e7b97a1`
  - SHA-256:
    `a231a70ae6a1658999e9a133a029d8858929583fce3379a41771a3caf9ebac4f`
- `/v2/index.html` implements the early safety slice for Stage 0 Data &
  Window and Stage 5 Execution & Costs.
- Validate-only is browser-local and starts no runner. Queue remains disabled
  until the exact SHA-256 configuration passes.
- Holdout requires an explicit acknowledgement; zero commission requires its
  acknowledgement; both flags remain visible in the sentence and watermark.
- The dual-cost choice remains visible but disabled until Stage 8 exists.
- Interactive browser checks passed at 360, 768, 1024, and 1440 px:
  no horizontal body overflow, effective targets at least 44 px, inputs at
  least 16 px, sticky mobile actions, full-screen mobile alertdialog, and no
  console errors.
- Preview model tests: 6/6.
- Gateway tests: 12/12.
- Runner policy tests: 10/10.
- The complete offline release gate passed with byte-identical X00 parity,
  340 trades, and 71/71 engine tests.

## Exact blocker

The existing branch preview workflow is triggered by any push to
`portal-v2` that changes `/v2`, `/ui`, or the workflow itself:

```yaml
on:
  push:
    branches: ["portal-v2"]
    paths:
      - ".github/workflows/portal-v2-preview.yml"
      - "v2/**"
      - "ui/**"
```

Publishing the completed preview branch would therefore start a GitHub
Actions run. The user explicitly reserved runner/Actions budget for report
generation from the page and instructed that no CI or other GitHub run be
started. No push, deploy, or workflow dispatch was attempted.

The preview also cannot be validated end-to-end against the real runner until
its static UI is reachable and the preview gateway/runner branches are
published. The authoritative build order requires that validation before
Step 4. Continuing into the nine-stage controls would bypass that gate.

## Exact unblock condition

One of these must be explicitly authorized:

1. allow the single branch-preview artifact run; or
2. approve a non-GitHub preview host and its required deployment credentials.

After the preview is reachable, the next action is one deliberate report
generation from the page to verify the real runner path. No standalone
validation workflow is needed because validation is local in the browser.
