// csr.js：压缩行格式的三个低层算术
export function nonzeroCount(state, row) {
  if (!state || !Number.isInteger(row) || row < 0 || row >= state.rows) { return 0; }
  return state.rowptr[row + 1] - state.rowptr[row];
}

export function at(state, row, col) {
  if (!state || !Number.isInteger(row) || row < 0 || row >= state.rows) { return 0; }
  if (!Number.isInteger(col) || col < 0 || col >= state.cols) { return 0; }
  const start = state.rowptr[row];
  const end = state.rowptr[row + 1];
  for (let i = start; i < end; i += 1) {
    if (state.colidx[i] === col) { return state.values[i]; }
    if (state.colidx[i] > col) { return 0; }
  }
  return 0;
}

export function transposed(state) {
  const newRows = state.cols;
  const newCols = state.rows;
  const nnz = state.colidx.length;
  const counts = new Array(newRows).fill(0);
  for (let i = 0; i < nnz; i += 1) { counts[state.colidx[i]] += 1; }
  const rowptr = new Array(newRows + 1).fill(0);
  for (let r = 0; r < newRows; r += 1) {
    rowptr[r + 1] = rowptr[r] + counts[r];
  }
  const colidx = new Array(nnz);
  const values = new Array(nnz);
  const cursor = rowptr.slice(0, newRows);
  for (let r = 0; r < state.rows; r += 1) {
    for (let i = state.rowptr[r]; i < state.rowptr[r + 1]; i += 1) {
      const c = state.colidx[i];
      const pos = cursor[c];
      cursor[c] += 1;
      colidx[pos] = r;
      values[pos] = state.values[i];
    }
  }
  return { rows: newRows, cols: newCols, rowptr, colidx, values };
}
