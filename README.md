# MBbot Research Desk

This repository is a generated, static MBbot backtest report portal. Open the
deployed GitHub Pages URL to browse and compare reports.

The site contains research or synthetic backtests only. It is not financial
advice, and simulated performance does not predict future results.

## Update

Generate this directory from the MBbot source project:

```powershell
python scripts/build_report_site.py <result-json-or-directory> `
  --config backtest.toml `
  --site <path-to-this-repository>
```

Commit and push the changed files. The included GitHub Actions workflow deploys
the site automatically.

## Direct backtest control

`assets/site-config.js` contains the single public
`backtestDispatchUrl` setting. It points to the HTTPS dispatch gateway, not
GitHub. The page validates an experiment and submits it without navigation,
then shows queued, running, publishing, and completed states. A trusted tester
uses a shared runner access key that is never saved by the page. Never add that
key, its digest, a GitHub token, or another credential to the static site.

The prepared private runner is locked to `offline-only`: it accepts only
allowlisted local replay datasets, removes provider credentials, and blocks
network access in every project Python subprocess. The public Pages workflow
only deploys generated static files and cannot request fresh market data.
Changing this behavior requires a reviewed manual change to the private
control repository; it is not a workflow or website input.

Before publishing, confirm that every report is safe to share publicly. The
generator redacts secret-like configuration keys, but the publisher remains
responsible for licensed market data, private notes, identifiers, and any new
fields.
