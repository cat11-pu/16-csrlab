// app.js：把事件流跑成压缩行报表，供页面显示
import { nonzeroCount, at } from "./csr.js";
import { set, drop, transpose, mul } from "./ops.js";

function copyState(state) {
  const src = state || {};
  return {
    rows: src.rows || 0,
    cols: src.cols || 0,
    rowptr: (src.rowptr || []).slice(),
    colidx: (src.colidx || []).slice(),
    values: (src.values || []).slice(),
    sets: src.sets || 0,
    updates: src.updates || 0,
    erases: src.erases || 0,
    shifts: src.shifts || 0,
    transposes: src.transposes || 0,
    muls: (src.muls || []).map(function (pair) {
      return [pair[0].slice(), pair[1].slice()];
    })
  };
}

function fingerprint(state) {
  return JSON.stringify({ rows: state.rows, cols: state.cols, rowptr: state.rowptr,
                          colidx: state.colidx, values: state.values, sets: state.sets,
                          updates: state.updates, erases: state.erases, shifts: state.shifts,
                          transposes: state.transposes, muls: state.muls });
}

function apply(one, event) {
  if (event.kind === "set") { return set(one, event.row, event.col, event.value); }
  if (event.kind === "drop") { return drop(one, event.row, event.col); }
  if (event.kind === "transpose") { return transpose(one); }
  if (event.kind === "mul") { return mul(one, event.vec); }
  throw Object.assign(new Error("E_BAD_EVENT"), { code: "E_BAD_EVENT" });
}

function runEvents(seed, events) {
  let one = copyState(seed);
  let failed = 0;
  const marks = [];
  for (const event of events || []) {
    try {
      one = apply(one, event);
    } catch (error) {
      failed += 1;
      marks.push([event.kind, error && error.code ? error.code : "E_BAD_EVENT"]);
    }
  }
  return { state: one, failed: failed, marks: marks };
}

export function render(spec) {
  const events = (spec && spec.events) || [];
  const first = runEvents(spec && spec.state, events);
  const state = first.state;
  const perRow = [];
  for (let r = 0; r < state.rows; r += 1) { perRow.push(nonzeroCount(state, r)); }
  let ptrOk = state.rowptr.length === state.rows + 1 && (state.rowptr[0] || 0) === 0
    && (state.rowptr[state.rows] || 0) === state.colidx.length;
  for (let r = 0; r < state.rows; r += 1) {
    if ((state.rowptr[r] || 0) > (state.rowptr[r + 1] || 0)) { ptrOk = false; }
  }
  let colsOk = true;
  for (let r = 0; r < state.rows; r += 1) {
    for (let i = state.rowptr[r] || 0; i < (state.rowptr[r + 1] || 0); i += 1) {
      if (i > (state.rowptr[r] || 0) && state.colidx[i - 1] >= state.colidx[i]) { colsOk = false; }
      if (state.colidx[i] < 0 || state.colidx[i] >= state.cols) { colsOk = false; }
    }
  }
  let valueOk = state.values.length === state.colidx.length;
  for (const value of state.values) { if (!value) { valueOk = false; } }
  let countOk = (state.rowptr[state.rows] || 0) === state.colidx.length;
  let total = 0;
  for (const row of perRow) { total += row; }
  if (total !== state.colidx.length) { countOk = false; }
  const half = Math.ceil(events.length / 2);
  const left = runEvents(spec && spec.state, events.slice(0, half));
  const mid = fingerprint(left.state);
  const right = runEvents(left.state, events.slice(half));
  const again = runEvents(spec && spec.state, events);
  return { rows: state.rows, cols: state.cols,
           rowptr: state.rowptr.slice(), colidx: state.colidx.slice(), values: state.values.slice(),
           per_row: perRow, nnz: state.colidx.length,
           sets: state.sets, updates: state.updates, erases: state.erases,
           shifts: state.shifts, transposes: state.transposes,
           muls: state.muls.map(function (pair) { return [pair[0].slice(), pair[1].slice()]; }),
           ptr_ok: ptrOk, cols_ok: colsOk, value_ok: valueOk, count_ok: countOk,
           replay_new: fingerprint(again.state) === fingerprint(state) ? 0 : 1,
           replay_failed: again.failed,
           mid_differs: mid !== fingerprint(state),
           split_equal: fingerprint(right.state) === fingerprint(state),
           failed_events: first.failed, failed_marks: first.marks,
           count_events: events.length, cell: at(state, 0, 0) };
}
