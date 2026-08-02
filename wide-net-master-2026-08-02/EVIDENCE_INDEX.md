# Wide-net study evidence index

This directory is independent from the earlier `research-story/` publication. It
supports the exploratory wide-net report dated 2026-08-02.

## Interpretation

The study covers 3,487 accepted entries across 209 unsealed sessions from
2025-07-25 through 2026-05-22. The headline PT40/SL20 plus combined-condition
candidate ended at $116,331 from $100,000, but train-to-held-out expectancy fell
91.6%. Treat the result as an exploratory candidate, not an established edge.
The prescribed next test is to freeze the rule unchanged, paper-trade at least
40 new sessions, and then perform one sealed evaluation.

- [Open the interactive master report](https://meshthegreat.github.io/MBbot/wide-net-master-2026-08-02/)
- HTML source SHA-256: `930ba014455caa9baf9958c1282debf40ba655eec18fb62ac870e577afe17925`
- CSV links below open as raw text suitable for review or programmatic analysis.
- XLSX links below download the original multi-sheet workbooks.

## Suggested review sequence

Start with `00_study_index.xlsx`, verify provenance and leakage controls with
`01_data_verification.xlsx`, inspect candidate metrics in
`07_setup_performance.csv` and `09_balance_summary.csv`, then challenge stability
with `19_effect_stability.csv`. The remaining files provide row-level and
diagnostic evidence.

## Evidence files

| File | Format and size | What it contains | Review context |
|---|---|---|---|
| [00_study_index.xlsx](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/00_study_index.xlsx) | XLSX, 24,801 bytes, 7 sheets | Index, formulas, source scope, key results, limitations, and environment. | Start here for the study map and headline definitions. |
| [01_data_verification.xlsx](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/01_data_verification.xlsx) | XLSX, 326,206 bytes, 12 sheets | Input hashes, every used source file, schemas, value domains, selection funnel, split sessions, timezone, and no-lookahead checks. | Audit data lineage, eligibility, and leakage controls before interpreting performance. |
| [02_wide_net_entries.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/02_wide_net_entries.csv) | CSV, 5,709,720 bytes, 3,487 rows | One row per accepted entry with entry-time predictors and contract/fill fields. | Primary row-level entry population for independent feature or selection analysis. |
| [03_exit_outcomes.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/03_exit_outcomes.csv) | CSV, 3,235,294 bytes, 24,409 rows | One row per trade/exit-rule combination with bid exit, reason, P&L, return, and label. | Recalculate exit-rule outcomes and compare the seven baselines. |
| [04_effect_sizes_numeric.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/04_effect_sizes_numeric.csv) | CSV, 437,175 bytes, 1,806 rows | Winner/loser numeric effects by exit and split: Cliff's delta, Hedges' g, medians, p-values, and q-values. | Assess magnitude, direction, and multiple-testing-adjusted significance of numeric discriminants. |
| [05_effect_sizes_categorical.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/05_effect_sizes_categorical.csv) | CSV, 81,380 bytes, 441 rows | Categorical counts, rates, odds ratios, Cramer's V, p-values, and q-values by exit and split. | Evaluate categorical discriminants without relying on model importance alone. |
| [06_rules_and_leaves.xlsx](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/06_rules_and_leaves.xlsx) | XLSX, 58,159 bytes, 5 sheets | Tree summaries, exact rule expressions, leaf statistics and membership, feature importance, and encoders. | Reproduce the candidate definitions and inspect how the combined rule was formed. |
| [07_setup_performance.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/07_setup_performance.csv) | CSV, 36,480 bytes, 105 rows | Baseline, inclusion, exclusion, combined, and quality metrics for train, held-out, and full samples by exit. | Main comparison table for performance and overfitting checks. |
| [08_exit_label_sensitivity.xlsx](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/08_exit_label_sensitivity.xlsx) | XLSX, 14,386 bytes, 4 sheets | Exit-specific labels, pairwise agreement, Cohen's kappa, confusion counts, and exit reasons. | Determine whether conclusions depend on how a win/loss exit is labeled. |
| [09_balance_summary.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/09_balance_summary.csv) | CSV, 6,941 bytes, 35 rows | Shared-account ending balance, P&L, drawdown, cash use, and capital skips per exit/setup. | Source for the $100,000 to $116,331 headline and portfolio-level risk comparison. |
| [10_balance_paths.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/10_balance_paths.csv) | CSV, 13,369,809 bytes, 123,888 rows | Every account entry and exit ledger event with cash and realized balance. | Reconstruct equity paths, drawdowns, overlap, and capital constraints event by event. |
| [11_monthly_results.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/11_monthly_results.csv) | CSV, 96,873 bytes, 384 rows | Executed-trade metrics and cumulative balance by month, exit, and setup. | Check time concentration, regime dependence, and whether gains are persistent. |
| [12_selected_setup_trades.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/12_selected_setup_trades.csv) | CSV, 136,392 bytes, 75 rows | All train-selected headline setup trades with features, outcomes, and execution status. | Audit the train-selected fixed-30m rule that subsequently lost $542 held-out. |
| [13_symbol_results.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/13_symbol_results.csv) | CSV, 42,607 bytes, 171 rows | Executed metrics by symbol, exit, and setup. | Identify symbol concentration and cross-symbol consistency. |
| [14_rule_membership.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/14_rule_membership.csv) | CSV, 1,421,799 bytes, 24,409 rows | Leaf, inclusion, exclusion, combined, and quality membership for every trade/exit pair. | Reproduce which trades each conditioning rule admits or rejects. |
| [15_source_file_verification.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/15_source_file_verification.csv) | CSV, 807,278 bytes, 3,260 rows | Expected and actual SHA-256, byte count, and row count for every source Parquet file read. | Verify source immutability and completeness at file level. |
| [16_exit_reason_summary.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/16_exit_reason_summary.csv) | CSV, 811 bytes, 17 rows | Counts by exit status and exit reason. | Quantify target, stop, fallback, invalidation, and unavailable-quote paths. |
| [17_rule_feature_importance.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/17_rule_feature_importance.csv) | CSV, 2,664 bytes, 43 rows | Nonzero shallow-tree feature importances by exit. | Inspect which predictors drove the exploratory tree rules; do not treat importance as causal. |
| [18_selection_funnel.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/18_selection_funnel.csv) | CSV, 189 bytes, 6 rows | Scheduled slots, accepted entries, and every skip reason. | Reconcile the 4,805 scheduled slots to the 3,487 accepted entries. |
| [19_effect_stability.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/19_effect_stability.csv) | CSV, 88,054 bytes, 602 rows | Training-versus-held-out Cliff's-delta direction and magnitude survival. | Primary evidence for the 91.6% expectancy decay and overfitting warning. |
| [SPREADSHEET_INDEX.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/SPREADSHEET_INDEX.csv) | CSV, 2,322 bytes, 22 rows | Machine-readable catalog of all evidence spreadsheets. | Use for automated discovery of the evidence bundle. |
| [20_output_validation.csv](https://raw.githubusercontent.com/meshTHEgreat/MBbot/main/wide-net-master-2026-08-02/exploratory-wide-net-discriminant-2026-08-01-codex-5kkgue/20_output_validation.csv) | CSV, 1,689 bytes, 22 rows | Read-back verification, byte counts, and structural details for every indexed spreadsheet. | Confirm that all published evidence files passed the source study's read-back validation. |

## Scope boundaries

This evidence is exploratory and uses only the eligible A2 period. Sealed data
was not read. The evidence does not establish a production-ready trading edge
and should not be interpreted as investment advice.
