const assert = require("node:assert/strict");
const test = require("node:test");

const model = require("../v2/control-model.js");

function values(overrides = {}) {
  return {
    experiment_label: "Safety preview",
    symbols: ["SPY", "QQQ"],
    window_preset: "discovery",
    start_date: "2026-04-27",
    end_date: "2026-05-22",
    holdout_burn_acknowledgement: false,
    commission_preset: "reference",
    unrealistic_costs_acknowledged: false,
    ...overrides,
  };
}

test("builds the exact 25-field v2 request", () => {
  const inputs = model.buildInputs(values(), true);
  assert.equal(Object.keys(inputs).length, 25);
  assert.deepEqual(
    Object.keys(inputs).sort(),
    [...model.WORKFLOW_INPUT_NAMES].sort(),
  );
  assert.equal(inputs.start_date, "2026-04-27");
  assert.equal(inputs.end_date, "2026-05-22");
  assert.equal(inputs.commission_per_contract, 0.65);
  assert.equal(inputs.validate_only, true);
});

test("safe preview requests never default to a validation-only runner run", () => {
  assert.equal(model.buildInputs(values()).validate_only, false);
});

test("custom discovery dates cannot cross the discovery boundary", () => {
  assert.throws(
    () =>
      model.buildInputs(
        values({
          window_preset: "custom_discovery",
          end_date: "2026-05-26",
        }),
      ),
    /inside/,
  );
});

test("holdout requires explicit acknowledgement", () => {
  assert.throws(
    () =>
      model.buildInputs(
        values({
          window_preset: "holdout",
        }),
      ),
    /Acknowledge/,
  );
  const inputs = model.buildInputs(
    values({
      window_preset: "holdout",
      holdout_burn_acknowledgement: true,
    }),
  );
  assert.equal(inputs.start_date, "2026-05-26");
  assert.equal(inputs.end_date, "2026-07-24");
});

test("zero cost requires explicit unrealistic-cost acknowledgement", () => {
  assert.throws(
    () =>
      model.buildInputs(
        values({
          commission_preset: "zero",
        }),
      ),
    /unrealistic/,
  );
  const inputs = model.buildInputs(
    values({
      commission_preset: "zero",
      unrealistic_costs_acknowledged: true,
    }),
  );
  assert.equal(inputs.commission_per_contract, 0);
  assert.match(model.sentence(inputs), /ZERO-COST SIMULATION/);
});

test("both is visible in UI but honestly refused by the legacy model", () => {
  assert.throws(
    () =>
      model.buildInputs(
        values({
          commission_preset: "both",
        }),
      ),
    /Dual-cost/,
  );
});
