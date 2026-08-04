# MBbot public paper-trade ledger

> Machine-generated, paper-only observations. No broker orders were placed.

- Feed schema: `mbbot.live-trades.feed.v1`
- Updated: `2026-08-04T19:50:16.506532+00:00`
- Records: 20
- Companion files: `trades.csv` for flat analysis and `trades.json` for the full nested record.

This public projection intentionally excludes API keys, Telegram credentials, Telegram message text, and private provider receipts. Entry and exit records map through the same permanent Trade ID. All timestamps use ISO 8601 offsets; empty values mean unavailable or not applicable.

## Strategy and execution boundaries

### Workflow #125

Baseline replay / Workflow #125. One paper contract enters at the recorded ask. Exits use recorded bids at the configured +50% target, -75% stop, signal exits, or time exit. Net P&L includes the configured $0.65 commission per side.

### A2 PT40/SL20 combined

Exploratory post-hoc paper candidate; no edge is established. One contract enters at the actual observed ask. Starting one minute later, it exits at the first valid observed bid at or above +40% or at or below -20%; otherwise it uses the exact 15:55 ET bid. No commission is charged.

Frozen keep filter:

```text
(D <= 0.498850002885 AND A <= -0.0710410289466)
OR
(D > 0.498850002885 AND V > -1.96682864428 AND P <= 181.800003052)
OR
(D > 0.498850002885 AND V <= -1.96682864428 AND O <= 0.0215988149866)
```

`D` is absolute entry Delta; `A` is underlying five-minute acceleration in percentage points; `V` is option close versus VWAP percent; `P` is the observation underlying price; `O` is opening-range-low distance percent.

## Separate strategy summaries

| Strategy | Research status | Trades | Open | Closed | Wins | Losses | Flats | Win rate | Realized P&L | Expectancy |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline replay / Workflow #125 | baseline_replay | 0 | 0 | 0 | 0 | 0 | 0 | — | $0.00 | — |
| A2 exact PT40/SL20 + combined keep filter | exploratory_post_hoc_paper | 20 | 1 | 19 | 5 | 13 | 1 | 26.31578947368421052631578947% | -$450.00 | -$23.68 |

## Workflow #125 trades

_No paper trades recorded yet._

## A2 PT40/SL20 combined trades

| Trade ID | Status | Contract | Entry time | Entry ask | Exit time | Exit bid | Result | Return | Net P&L | Exit reason |
|---|---|---|---|---:|---|---:|---|---:|---:|---|
| A2C-20260804-AAPL-1425 | closed | AAPL 310.0 PUT 2026-08-07 | 2026-08-04T14:30:00-04:00 | +$3.90 | 2026-08-04T15:50:00-04:00 | +$2.86 | loss | -26.66666666666666666666666667% | -$104.00 | stop_loss_20 |
| A2C-20260804-NVDA-1325 | open | NVDA 212.5 CALL 2026-08-07 | 2026-08-04T13:30:00-04:00 | +$2.92 | — | — | open | — | — | — |
| A2C-20260804-AAPL-1325 | closed | AAPL 310.0 PUT 2026-08-07 | 2026-08-04T13:30:00-04:00 | +$4.20 | 2026-08-04T15:38:00-04:00 | +$3.35 | loss | -20.23809523809523809523809524% | -$85.00 | stop_loss_20 |
| A2C-20260804-TSLA-1225 | closed | TSLA 325.0 PUT 2026-08-05 | 2026-08-04T12:30:00-04:00 | +$4.50 | 2026-08-04T13:22:00-04:00 | +$3.45 | loss | -23.33333333333333333333333333% | -$105.00 | stop_loss_20 |
| A2C-20260804-NVDA-1225 | closed | NVDA 210.0 CALL 2026-08-07 | 2026-08-04T12:30:00-04:00 | +$3.60 | 2026-08-04T14:37:00-04:00 | +$5.15 | win | 43.05555555555555555555555560% | +$155.00 | profit_target_40 |
| A2C-20260804-TSLA-1125 | closed | TSLA 325.0 PUT 2026-08-07 | 2026-08-04T11:30:00-04:00 | +$7.05 | 2026-08-04T13:22:00-04:00 | +$5.55 | loss | -21.27659574468085106382978723% | -$150.00 | stop_loss_20 |
| A2C-20260804-NVDA-1125 | closed | NVDA 210.0 CALL 2026-08-05 | 2026-08-04T11:30:00-04:00 | +$2.14 | 2026-08-04T13:38:00-04:00 | +$3.00 | win | 40.18691588785046728971962620% | +$86.00 | profit_target_40 |
| A2C-20260804-TSLA-1025 | closed | TSLA 325.0 PUT 2026-08-07 | 2026-08-04T10:30:00-04:00 | +$7.25 | 2026-08-04T13:12:00-04:00 | +$5.80 | loss | -20.0% | -$145.00 | stop_loss_20 |
| A2C-20260804-SPY-1025 | closed | SPY 765.0 PUT 2026-08-07 | 2026-08-04T10:30:00-04:00 | +$3.62 | 2026-08-04T10:59:00-04:00 | +$2.83 | loss | -21.82320441988950276243093923% | -$79.00 | stop_loss_20 |
| A2C-20260804-AAPL-1025 | closed | AAPL 307.5 CALL 2026-08-07 | 2026-08-04T10:30:00-04:00 | +$3.55 | 2026-08-04T10:41:00-04:00 | +$2.80 | loss | -21.12676056338027990478079746% | -$75.00 | stop_loss_20 |
| A2C-20260803-TSLA-1425 | closed | TSLA 322.5 PUT 2026-08-07 | 2026-08-03T14:30:00-04:00 | +$7.60 | 2026-08-03T15:55:00-04:00 | +$7.60 | flat | 0% | $0.00 | end_of_session_1555 |
| A2C-20260803-SPY-1425 | closed | SPY 758.0 PUT 2026-08-04 | 2026-08-03T14:30:00-04:00 | +$1.90 | 2026-08-03T15:03:00-04:00 | +$1.48 | loss | -22.10526315789474094182825485% | -$42.00 | stop_loss_20 |
| A2C-20260803-QQQ-1425 | closed | QQQ 701.0 PUT 2026-08-07 | 2026-08-03T14:30:00-04:00 | +$7.24 | 2026-08-03T15:55:00-04:00 | +$6.87 | loss | -5.110497237569060773480662980% | -$37.00 | end_of_session_1555 |
| A2C-20260803-AAPL-1425 | closed | AAPL 307.5 PUT 2026-08-07 | 2026-08-03T14:30:00-04:00 | +$5.25 | 2026-08-03T15:55:00-04:00 | +$6.40 | win | 21.90476190476190476190476190% | +$115.00 | end_of_session_1555 |
| A2C-20260803-TSLA-1225 | closed | TSLA 322.5 PUT 2026-08-05 | 2026-08-03T12:30:00-04:00 | +$5.85 | 2026-08-03T15:02:00-04:00 | +$4.55 | loss | -22.22222222222222886989553656% | -$130.00 | stop_loss_20 |
| A2C-20260803-NVDA-1225 | closed | NVDA 207.5 PUT 2026-08-07 | 2026-08-03T12:30:00-04:00 | +$4.05 | 2026-08-03T13:28:00-04:00 | +$3.20 | loss | -20.98765432098765432098765432% | -$85.00 | stop_loss_20 |
| A2C-20260803-TSLA-1125 | closed | TSLA 325.0 CALL 2026-08-07 | 2026-08-03T11:30:00-04:00 | +$6.75 | 2026-08-03T12:42:00-04:00 | +$5.35 | loss | -20.74074074074073333333333333% | -$140.00 | stop_loss_20 |
| A2C-20260803-QQQ-1125 | closed | QQQ 697.0 CALL 2026-08-04 | 2026-08-03T11:30:00-04:00 | +$3.06 | 2026-08-03T12:18:00-04:00 | +$4.32 | win | 41.17647058823529411764705880% | +$126.00 | profit_target_40 |
| A2C-20260803-NVDA-1125 | closed | NVDA 207.5 CALL 2026-08-07 | 2026-08-03T11:30:00-04:00 | +$3.60 | 2026-08-03T15:55:00-04:00 | +$3.15 | loss | -12.500% | -$45.00 | end_of_session_1555 |
| A2C-20260803-TSLA-1025 | closed | TSLA 320.0 CALL 2026-08-07 | 2026-08-03T10:30:00-04:00 | +$6.85 | 2026-08-03T11:23:00-04:00 | +$9.75 | win | 42.33576642335765384410464060% | +$290.00 | profit_target_40 |

## Analysis notes

- Do not combine the two strategy samples unless the analysis explicitly models strategy identity.
- Use `net_pnl` in the CSV for comparable realized P&L; Workflow #125 commission is already deducted.
- Open trades have no exit, result, return, or realized P&L yet.
- This is an observational paper ledger, not evidence of executable live fills or a persistent edge.
