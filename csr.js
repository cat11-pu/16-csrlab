// csr.js：压缩行格式的三个低层算术
export function nonzeroCount(state, row) {
  return state.rowptr[row + 1] - state.rowptr[row];
}

export function at(state, row, col) {
  let lo = state.rowptr[row];
  let hi = state.rowptr[row + 1];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (state.colidx[mid] < col) { lo = mid + 1; }
    else { hi = mid; }
  }
  if (lo < state.rowptr[row + 1] && state.colidx[lo] === col) {
    return state.values[lo];
  }
  return 0;
}

export function transposed(state) {
  const rows = state.cols;
  const cols = state.rows;
  const nnz = state.colidx.length;
  const rowptr = new Array(rows + 1).fill(0);
  for (let i = 0; i < nnz; i += 1) {
    rowptr[state.colidx[i] + 1] += 1;
  }
  for (let r = 1; r <= rows; r += 1) {
    rowptr[r] += rowptr[r - 1];
  }
  const colidx = new Array(nnz).fill(0);
  const values = new Array(nnz).fill(0);
  const cursor = rowptr.slice(0, rows);
  for (let r = 0; r < state.rows; r += 1) {
    for (let i = state.rowptr[r]; i < state.rowptr[r + 1]; i += 1) {
      const dest = cursor[state.colidx[i]];
      cursor[state.colidx[i]] += 1;
      colidx[dest] = r;
      values[dest] = state.values[i];
    }
  }
  return { rows: rows, cols: cols, rowptr: rowptr, colidx: colidx, values: values };
}
