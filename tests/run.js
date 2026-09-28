import assert from "node:assert";
import { nonzeroCount, at, transposed } from "../csr.js";
import { set, drop, transpose, mul } from "../ops.js";
import { render } from "../app.js";

const base = {
  state: { rows: 1, cols: 1, rowptr: [0, 0], colidx: [], values: [],
           sets: 0, updates: 0, erases: 0, shifts: 0, transposes: 0, muls: [] },
  events: [{ kind: "set", row: 0, col: 0, value: 1 }]
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("nonzeroCount gives a number", () => {
  assert.strictEqual(typeof nonzeroCount(base.state, 0), "number");
});

check("at gives a number", () => {
  assert.strictEqual(typeof at(base.state, 0, 0), "number");
});

check("transposed gives three arrays", () => {
  const view = transposed(base.state);
  assert.ok(Array.isArray(view.rowptr) && Array.isArray(view.colidx) && Array.isArray(view.values));
});

check("set gives a state", () => {
  assert.ok(Array.isArray(set(base.state, 0, 0, 2).rowptr));
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
