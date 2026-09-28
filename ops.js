// ops.js：置值、擦除、转置、乘向量
import { transposed } from "./csr.js";

function fail(code) {
  throw Object.assign(new Error(code), { code: code });
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
  return Number.isInteger(value) && value !== 0;
}

export function set(state, row, col, value) {
  if (!Number.isInteger(row) || row < 0 || row >= state.rows) { fail("E_BAD_ROW"); }
  if (!Number.isInteger(col) || col < 0 || col >= state.cols) { fail("E_BAD_COL"); }
  if (!isNonZeroInteger(value)) { fail("E_BAD_VALUE"); }
  const next = clone(state);
  const start = next.rowptr[row];
  const end = next.rowptr[row + 1];
  let pos = start;
  while (pos < end && next.colidx[pos] < col) { pos += 1; }
  if (pos < end && next.colidx[pos] === col) {
    next.values[pos] = value;
    next.updates += 1;
    return next;
  }
  next.colidx.splice(pos, 0, col);
  next.values.splice(pos, 0, value);
  next.shifts += end - pos;
  for (let r = row + 1; r <= next.rows; r += 1) {
    next.rowptr[r] += 1;
  }
  next.sets += 1;
  return next;
}

export function drop(state, row, col) {
  if (!Number.isInteger(row) || row < 0 || row >= state.rows) { fail("E_BAD_ROW"); }
  if (!Number.isInteger(col) || col < 0 || col >= state.cols) { fail("E_BAD_COL"); }
  const next = clone(state);
  const start = next.rowptr[row];
  const end = next.rowptr[row + 1];
  let pos = start;
  while (pos < end && next.colidx[pos] < col) { pos += 1; }
  if (pos === end || next.colidx[pos] !== col) { fail("E_NO_NNZ"); }
  next.colidx.splice(pos, 1);
  next.values.splice(pos, 1);
  for (let r = row + 1; r <= next.rows; r += 1) {
    next.rowptr[r] -= 1;
  }
  next.erases += 1;
  return next;
}

export function transpose(state) {
  const view = transposed(state);
  return {
    rows: view.rows,
    cols: view.cols,
    rowptr: view.rowptr,
    colidx: view.colidx,
    values: view.values,
    sets: state.sets,
    updates: state.updates,
    erases: state.erases,
    shifts: state.shifts,
    transposes: state.transposes + 1,
    muls: state.muls.map(function (pair) {
      return [pair[0].slice(), pair[1].slice()];
    })
  };
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
