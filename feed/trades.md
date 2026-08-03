# MBbot public paper-trade ledger

> Machine-generated, paper-only observations. No broker orders were placed.

- Feed schema: `mbbot.live-trades.feed.v1`
- Updated: `2026-08-03T15:59:01.837487+00:00`
- Records: 4
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
| A2 exact PT40/SL20 + combined keep filter | exploratory_post_hoc_paper | 4 | 3 | 1 | 1 | 0 | 0 | 100% | +$290.00 | +$290.00 |

## Workflow #125 trades

_No paper trades recorded yet._

## A2 PT40/SL20 combined trades

| Trade ID | Status | Contract | Entry time | Entry ask | Exit time | Exit bid | Result | Return | Net P&L | Exit reason |
|---|---|---|---|---:|---|---:|---|---:|---:|---|
| A2C-20260803-TSLA-1125 | open | TSLA 325.0 CALL 2026-08-07 | 2026-08-03T11:30:00-04:00 | +$6.75 | — | — | open | — | — | — |
| A2C-20260803-QQQ-1125 | open | QQQ 697.0 CALL 2026-08-04 | 2026-08-03T11:30:00-04:00 | +$3.06 | — | — | open | — | — | — |
| A2C-20260803-NVDA-1125 | open | NVDA 207.5 CALL 2026-08-07 | 2026-08-03T11:30:00-04:00 | +$3.60 | — | — | open | — | — | — |
| A2C-20260803-TSLA-1025 | closed | TSLA 320.0 CALL 2026-08-07 | 2026-08-03T10:30:00-04:00 | +$6.85 | 2026-08-03T11:23:00-04:00 | +$9.75 | win | 42.33576642335765384410464060% | +$290.00 | profit_target_40 |

## Analysis notes

- Do not combine the two strategy samples unless the analysis explicitly models strategy identity.
- Use `net_pnl` in the CSV for comparable realized P&L; Workflow #125 commission is already deducted.
- Open trades have no exit, result, return, or realized P&L yet.
- This is an observational paper ledger, not evidence of executable live fills or a persistent edge.
