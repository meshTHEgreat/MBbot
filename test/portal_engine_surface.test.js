const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const engine = require("../v2/portal-engine-model.js");
const results = require("../v2/results-model.js");

function baseValues(overrides = {}) {
  return {
    dataset_version: "v1",
    window_preset: "discovery",
    start_date: "2026-04-27",
    end_date: "2026-05-22",
    symbols: ["SPY", "QQQ"],
    holdout_burn_acknowledgement: false,
    warmup_requirement: "12 trigger bars = 60 minutes.",
    trigger_family: "trend_persistence",
    trigger_timeframe_minutes: 5,
    fast_ma_snapshots: 3,
    slow_ma_snapshots: 12,
    ma_gap_percent: 0.15,
    momentum_window_minutes: 15,
    momentum_percent: 0.1,
    orb_range_minutes: 30,
    orb_buffer_percent: 0.1,
    orb_regime_enabled: true,
    order_flow_window_bars: 3,
    order_flow_threshold: 0.2,
    order_flow_underlying_agreement: true,
    divergence_underlying_velocity_min: 0.2,
    divergence_premium_velocity_max: 0,
    divergence_window_minutes: 15,
    mean_reversion_rsi_period: 14,
    mean_reversion_rsi_extreme: 30,
    mean_reversion_reversal_confirm: true,
    legacy_macd_fast: 12,
    legacy_macd_slow: 26,
    legacy_macd_signal: 9,
    spread_cap_percent: 10,
    spread_denominator: "midpoint",
    premium_floor: 0.5,
    premium_cap: "",
    valid_nbbo_required: true,
    rsi_gate_enabled: false,
    smi_gate_enabled: false,
    momentum_gate_enabled: false,
    velocity_gate_enabled: false,
    activity_gate_enabled: false,
    trade_side_gate_enabled: false,
    delta_minimum: 0.5,
    delta_target: 0.6,
    delta_maximum: 0.7,
    dte_minimum: 1,
    dte_maximum: 4,
    allow_zero_dte: false,
    expiration_fallback: true,
    next_strike_scan: true,
    commission_preset: "reference",
    unrealistic_costs_acknowledged: false,
    contracts_per_trade: 1,
    maximum_trades_per_symbol_day: 3,
    reentry_cooldown_minutes: 30,
    same_direction_spy_qqq_single_exposure: true,
    invalidation_stop_enabled: true,
    invalidation_formula: "slow 60-minute MA structure",
    profit_target_enabled: true,
    profit_target_mode: "friction_multiple",
    profit_friction_multiple: 3,
    profit_legacy_percent: 20,
    time_stop_enabled: true,
    time_stop_minutes: 60,
    premium_stop_enabled: false,
    premium_stop_percent: 10,
    opposite_smi_exit: false,
    ...overrides,
  };
}

function validateSchema(value, schema, location = "$", rootSchema = schema) {
  if (schema === false) throw new Error(`${location} is forbidden`);
  if (schema.$ref) {
    const resolved = schema.$ref
      .replace(/^#\//, "")
      .split("/")
      .reduce((node, key) => node[key], rootSchema);
    validateSchema(value, resolved, location, rootSchema);
    return;
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => {
      try {
        validateSchema(value, candidate, location, rootSchema);
        return true;
      } catch {
        return false;
      }
    });
    assert.equal(matches.length, 1, `${location} must match exactly one schema`);
    return;
  }
  for (const candidate of schema.allOf || []) {
    validateSchema(value, candidate, location, rootSchema);
  }
  if (schema.if) {
    let conditionPassed = true;
    try {
      validateSchema(value, schema.if, location, rootSchema);
    } catch {
      conditionPassed = false;
    }
    if (conditionPassed && schema.then) {
      validateSchema(value, schema.then, location, rootSchema);
    } else if (!conditionPassed && schema.else) {
      validateSchema(value, schema.else, location, rootSchema);
    }
  }
  if (Object.hasOwn(schema, "const")) {
    assert.deepEqual(value, schema.const, `${location} const`);
  }
  if (schema.enum) {
    assert.ok(
      schema.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value)),
      `${location} enum`,
    );
  }
  const types = schema.type
    ? Array.isArray(schema.type)
      ? schema.type
      : [schema.type]
    : [];
  if (types.length) {
    const actual =
      value === null
        ? "null"
        : Array.isArray(value)
          ? "array"
          : Number.isInteger(value)
            ? "integer"
            : typeof value;
    assert.ok(
      types.includes(actual) || (actual === "integer" && types.includes("number")),
      `${location} expected ${types.join("|")}, got ${actual}`,
    );
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      assert.ok(Object.hasOwn(value, required), `${location}.${required} is required`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(Object.hasOwn(schema.properties || {}, key), `${location}.${key} is not allowed`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) {
        validateSchema(value[key], childSchema, `${location}.${key}`, rootSchema);
      }
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) {
      assert.ok(value.length >= schema.minItems, `${location} minItems`);
    }
    if (schema.uniqueItems) {
      assert.equal(new Set(value.map(JSON.stringify)).size, value.length, `${location} uniqueItems`);
    }
    for (let index = 0; index < (schema.prefixItems || []).length; index += 1) {
      validateSchema(
        value[index],
        schema.prefixItems[index],
        `${location}[${index}]`,
        rootSchema,
      );
    }
    if (schema.items === false) {
      assert.ok(value.length <= (schema.prefixItems || []).length, `${location} extra items`);
    } else if (schema.items) {
      value.forEach((item, index) =>
        validateSchema(item, schema.items, `${location}[${index}]`, rootSchema),
      );
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, `${location} minimum`);
    if (schema.exclusiveMinimum !== undefined) {
      assert.ok(value > schema.exclusiveMinimum, `${location} exclusiveMinimum`);
    }
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, `${location} maximum`);
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined) assert.ok(value.length >= schema.minLength, `${location} minLength`);
    if (schema.format === "date") assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${location} date`);
  }
}

test("default envelope reproduces the preregistered P1 surface", () => {
  const envelope = engine.buildEnvelope(baseValues());
  assert.equal(envelope.schema_version, "portal-engine-params.v1");
  assert.deepEqual(envelope.dataset.symbols, ["SPY", "QQQ"]);
  assert.deepEqual(envelope.setup_trigger.parameters, {
    fast_ma_snapshots: 3,
    slow_ma_snapshots: 12,
    ma_gap_percent: 0.15,
    momentum_window_minutes: 15,
    momentum_percent: 0.1,
  });
  assert.deepEqual(envelope.contract_selection, {
    target_absolute_delta: 0.6,
    minimum_absolute_delta: 0.5,
    maximum_absolute_delta: 0.7,
    minimum_dte: 1,
    maximum_dte: 4,
    allow_zero_dte: false,
    expiration_fallback: true,
    next_strike_scan: true,
  });
  assert.deepEqual(envelope.risk, {
    contracts_per_trade: 1,
    maximum_trades_per_symbol_day: 3,
    reentry_cooldown_minutes: 30,
    same_direction_spy_qqq_single_exposure: true,
  });
  assert.equal(
    envelope.provenance.adapter_command,
    "python -m portal_engine.cli --request request.json --out-dir DIR",
  );
  assert.equal(envelope.provenance.adapter_status, "pending_parity_certified_package");
});

test("portal-engine-params.v1 envelopes pass the versioned JSON Schema", () => {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(root, "ui", "portal-engine-params-v1.schema.json"),
      "utf8",
    ),
  );
  for (const values of [
    baseValues(),
    ...[
      "opening_range_breakout",
      "order_flow_imbalance",
      "premium_underlying_divergence",
      "mean_reversion_fade",
      "legacy_macd",
    ].map((trigger_family) => baseValues({ trigger_family })),
    baseValues({ commission_preset: "both" }),
    baseValues({
      commission_preset: "zero",
      unrealistic_costs_acknowledged: true,
    }),
    baseValues({
      window_preset: "holdout",
      start_date: "2026-05-26",
      end_date: "2026-07-24",
      holdout_burn_acknowledgement: true,
    }),
  ]) {
    validateSchema(engine.buildEnvelope(values), schema);
  }
});

test("holdout audit stamps survive into report and run-log provenance", () => {
  const envelope = engine.buildEnvelope(
    baseValues({
      window_preset: "holdout",
      start_date: "2026-05-26",
      end_date: "2026-07-24",
      holdout_burn_acknowledgement: true,
    }),
  );
  assert.deepEqual(envelope.provenance.report_watermarks, ["HOLDOUT RUN"]);
  assert.deepEqual(envelope.provenance.run_log_stamps, [
    "holdout_burn_acknowledged=true",
  ]);
});

test("all six trigger families emit their agreed parameter groups", () => {
  const families = {
    trend_persistence: "fast_ma_snapshots",
    opening_range_breakout: "range_minutes",
    order_flow_imbalance: "rolling_window_bars",
    premium_underlying_divergence: "window_minutes",
    mean_reversion_fade: "rsi_period",
    legacy_macd: "fast_period",
  };
  for (const [family, expectedParameter] of Object.entries(families)) {
    const envelope = engine.buildEnvelope(baseValues({ trigger_family: family }));
    assert.ok(
      Object.hasOwn(envelope.setup_trigger.parameters, expectedParameter),
      `${family} should emit ${expectedParameter}`,
    );
  }
});

test("holdout, zero costs, Delta order, and opposite SMI fail closed", () => {
  assert.throws(
    () =>
      engine.buildEnvelope(
        baseValues({
          window_preset: "holdout",
          start_date: "2026-05-26",
          end_date: "2026-07-24",
        }),
      ),
    /Acknowledge the one-time holdout/,
  );
  assert.throws(
    () => engine.buildEnvelope(baseValues({ commission_preset: "zero" })),
    /Acknowledge unrealistic costs/,
  );
  assert.throws(
    () => engine.buildEnvelope(baseValues({ delta_target: 0.8 })),
    /inside the acceptance band/,
  );
  assert.throws(
    () => engine.buildEnvelope(baseValues({ opposite_smi_exit: true })),
    /Enable the SMI gate/,
  );
});

test("dual-cost and evidence result model exposes the requested columns", () => {
  const model = results.normalizeResult({
    schema_version: "mbbot.phase2.backtest-result.v1",
    family: "P1",
    pooled: {
      "reference_0.65": {
        trades: 42,
        mid_to_mid_pnl: 100,
        friction_applied_pnl: 60,
        wins: 24,
        losses: 18,
      },
      "stress_1.30": {
        trades: 42,
        mid_to_mid_pnl: 100,
        friction_applied_pnl: 5.4,
        wins: 20,
        losses: 22,
      },
    },
    excursions: {
      average_mae_percent: 18.5,
      average_mfe_percent: 26.25,
    },
    per_symbol: {
      SPY: {
        "reference_0.65": { trades: 20, friction_applied_pnl: 35, mid_to_mid_pnl: 50 },
        "stress_1.30": { trades: 20, friction_applied_pnl: 9, mid_to_mid_pnl: 50 },
      },
      QQQ: {
        "reference_0.65": { trades: 22, friction_applied_pnl: 25, mid_to_mid_pnl: 50 },
        "stress_1.30": { trades: 22, friction_applied_pnl: -3.6, mid_to_mid_pnl: 50 },
      },
    },
    exit_reasons: { profit_target: 20, time_exit: 22 },
  });
  assert.equal(model.insufficient_evidence, true);
  assert.equal(model.costs.length, 2);
  assert.equal(model.costs[0].mid_to_mid_pnl, 100);
  assert.equal(model.average_mae_percent, 18.5);
  assert.equal(model.average_mfe_percent, 26.25);
  assert.deepEqual(
    model.per_symbol.map((item) => item.symbol),
    ["QQQ", "SPY"],
  );
  assert.deepEqual(model.exit_reasons, [
    { reason: "profit_target", count: 20 },
    { reason: "time_exit", count: 22 },
  ]);
});

test("dependency graph declares every authoritative cross-control rule", () => {
  const graph = JSON.parse(
    fs.readFileSync(path.join(root, "ui", "config-dependencies.json"), "utf8"),
  );
  const html = fs.readFileSync(path.join(root, "v2", "index.html"), "utf8");
  assert.equal(graph.schema_version, "mbbot.portal.config-dependencies.v1");
  const identifiers = new Set(graph.rules.map((rule) => rule.id));
  for (const expected of [
    "dataset-tier-one-features",
    "dataset-window-bindings",
    "trigger-family-parameters",
    "legacy-macd-warning",
    "smi-opposite-exit",
    "timeframe-conversions",
    "zero-dte-scope",
    "spread-denominator-semantics",
    "dual-cost-results",
    "holdout-burn-guard",
    "insufficient-evidence",
  ]) {
    assert.ok(identifiers.has(expected), `missing dependency ${expected}`);
  }
  for (const rule of graph.rules) {
    assert.equal(typeof rule.cause, "string");
    assert.ok(rule.effects.length > 0);
    for (const effect of rule.effects) {
      assert.ok(effect.targets.length > 0);
      assert.equal(typeof effect.behavior, "string");
      for (const target of effect.targets) {
        assert.ok(
          html.includes(`id="${target}"`) || html.includes(`name="${target}"`),
          `${rule.id} target ${target} must render in the portal`,
        );
      }
    }
  }
});

test("HTML contains nine APG tabs, result surfaces, and production wording", () => {
  const html = fs.readFileSync(path.join(root, "v2", "index.html"), "utf8");
  assert.equal((html.match(/role="tab"/g) || []).length, 9);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 9);
  assert.match(html, /Mid-to-mid P&amp;L/);
  assert.match(html, /Average MAE/);
  assert.match(html, /Average MFE/);
  assert.match(html, /Per-symbol evidence/);
  assert.match(html, /Insufficient evidence/);
  assert.doesNotMatch(html, /preview runner/i);
});

test("only report-file pushes trigger the public Pages workflow", () => {
  const pagesWorkflow = fs.readFileSync(
    path.join(root, ".github/workflows/pages.yml"),
    "utf8",
  );
  assert.match(pagesWorkflow, /^\s+push:/m);
  assert.match(pagesWorkflow, /^\s+- main$/m);
  for (const reportPath of [
    '"data/**"',
    '"reports/**"',
    '"v2/data/**"',
    '"v2/reports/**"',
  ]) {
    assert.ok(pagesWorkflow.includes(reportPath), reportPath);
  }

  for (const relative of [
    ".github/workflows/portal-v2-preview.yml",
    "v2/.github/workflows/pages.yml",
  ]) {
    const workflow = fs.readFileSync(path.join(root, relative), "utf8");
    assert.doesNotMatch(workflow, /^\s+push:/m, relative);
    assert.match(workflow, /workflow_dispatch:/, relative);
  }
});
