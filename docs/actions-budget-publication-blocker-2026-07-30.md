# Actions budget and live-publication blocker

Date: 2026-07-30

Status: **BLOCKED before the authorized production smoke run**

## Requested outcome

Queue exactly one real v2 discovery-window backtest, publish its report under
`/v2/reports/`, open it from the live guided portal, and consume exactly one
GitHub Actions run.

## Exact blocker

The current publication route spans two repository workflows:

1. the private runner workflow executes the queued backtest and commits the
   generated report to the public site repository;
2. the public site's Pages workflow reacts to that commit and deploys the new
   site artifact.

The second workflow is a separate Actions run. A source commit by itself does
not alter the already-deployed GitHub Pages artifact, and `[skip ci]` would
prevent the deployment needed for the new report link to resolve on the live
site. GitHub Pages does not offer an Actions-free deployment path for this
workflow-based site.

Therefore the full requested route cannot simultaneously satisfy:

- exactly one Actions run consumed;
- a newly generated report reachable at the live Pages URL; and
- no workflow other than the queued report run.

## Safety action taken

- No production workflow was dispatched.
- No retry was attempted.
- Push-triggered workflows were disabled in the prepared source.
- The cosmetic wording fix and Step-4 engine-independent work were verified
  locally.
- Main was not changed because a live verification cannot follow without a
  Pages deployment run.

## Decision required

One of these constraints must change before the smoke can run:

1. authorize two Actions runs for this one publication
   (backtest/report plus Pages deploy); or
2. change hosting/publication architecture so the qualifying report workflow
   can deploy the final site within the same Actions run.

The parity-certified engine adapter is a separate execution blocker for the
new strategy controls, but it does not cause this publication-budget blocker.
