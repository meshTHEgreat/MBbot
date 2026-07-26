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

## Backtest control link

`assets/site-config.js` contains the single public
`backtestWorkflowUrl` setting. It points to the authenticated manual workflow
form in the separate private control repository. Change only that URL if the
private repository is renamed. Never add a GitHub token or other credential to
the static site.

Before publishing, confirm that every report is safe to share publicly. The
generator redacts secret-like configuration keys, but the publisher remains
responsible for licensed market data, private notes, identifiers, and any new
fields.
