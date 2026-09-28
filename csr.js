// csr.js：压缩行格式的三个低层算术（基线：一律给零与空）
export function nonzeroCount(state, row) {
  return 0;
}

export function at(state, row, col) {
  return 0;
}

export function transposed(state) {
  return { rowptr: [], colidx: [], values: [] };
}
