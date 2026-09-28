// ops.js：置值、擦除、转置、乘向量
import { transposed } from "./csr.js";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function clone(state) {
  return {
    rows: state.rows,
    cols: state.cols,
    rowptr: state.rowptr.slice(),
    colidx: state.colidx.slice(),
    values: state.values.slice(),
    sets: state.sets,
    updates: state.updates,
    erases: state.erases,
    shifts: state.shifts,
    transposes: state.transposes,
    muls: state.muls.map(function (pair) {
      return [pair[0].slice(), pair[1].slice()];
    })
  };
}

function isNonZeroInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value !== 0;
}

function inRange(index, size) {
  return Number.isInteger(index) && index >= 0 && index < size;
}

export function set(state, row, col, value) {
  if (!inRange(row, state.rows)) { fail("E_BAD_ROW"); }
  if (!inRange(col, state.cols)) { fail("E_BAD_COL"); }
  if (!isNonZeroInteger(value)) { fail("E_BAD_VALUE"); }
  const next = clone(state);
  const start = next.rowptr[row];
  const end = next.rowptr[row + 1];
  let pos = end;
  for (let i = start; i < end; i += 1) {
    if (next.colidx[i] === col) {
      next.values[i] = value;
      next.updates += 1;
      return next;
    }
    if (next.colidx[i] > col) { pos = i; break; }
  }
  next.colidx.splice(pos, 0, col);
  next.values.splice(pos, 0, value);
  for (let r = row + 1; r <= next.rows; r += 1) { next.rowptr[r] += 1; }
  next.shifts += end - pos;
  next.sets += 1;
  return next;
}

export function drop(state, row, col) {
  if (!inRange(row, state.rows)) { fail("E_BAD_ROW"); }
  if (!inRange(col, state.cols)) { fail("E_BAD_COL"); }
  const next = clone(state);
  const start = next.rowptr[row];
  const end = next.rowptr[row + 1];
  let pos = -1;
  for (let i = start; i < end; i += 1) {
    if (next.colidx[i] === col) { pos = i; break; }
  }
  if (pos < 0) { fail("E_NO_NNZ"); }
  next.colidx.splice(pos, 1);
  next.values.splice(pos, 1);
  for (let r = row + 1; r <= next.rows; r += 1) { next.rowptr[r] -= 1; }
  next.erases += 1;
  return next;
}

export function transpose(state) {
  const view = transposed(state);
  const next = clone(state);
  next.rows = view.rows;
  next.cols = view.cols;
  next.rowptr = view.rowptr;
  next.colidx = view.colidx;
  next.values = view.values;
  next.transposes += 1;
  return next;
}

export function mul(state, vec) {
  if (!Array.isArray(vec) || vec.length !== state.cols) { fail("E_DIM"); }
  const next = clone(state);
  const result = new Array(next.rows).fill(0);
  for (let r = 0; r < next.rows; r += 1) {
    let sum = 0;
    for (let i = next.rowptr[r]; i < next.rowptr[r + 1]; i += 1) {
      sum += next.values[i] * vec[next.colidx[i]];
    }
    result[r] = sum;
  }
  next.muls.push([vec.slice(), result]);
  return next;
}
