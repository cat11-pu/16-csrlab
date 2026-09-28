// ops.js：置值、擦除、转置、乘向量（基线：一律原样返回）
import { nonzeroCount, at, transposed } from "./csr.js";

export function set(state, row, col, value) {
  return state;
}

export function drop(state, row, col) {
  return state;
}

export function transpose(state) {
  return state;
}

export function mul(state, vec) {
  return state;
}
