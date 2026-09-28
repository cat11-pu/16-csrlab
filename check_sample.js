import fs from "node:fs";
import { nonzeroCount, at, transposed } from "./csr.js";
import { set, drop, transpose, mul } from "./ops.js";

const __lines = [];
function emit(label, value) {
  __lines.push([String(label).replace(/ =$/, ""), value]);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/scene.json", "utf8"));

function copy(s) {
  const src = s || {};
  return {
    rows: src.rows || 0, cols: src.cols || 0,
    rowptr: (src.rowptr || []).slice(), colidx: (src.colidx || []).slice(),
    values: (src.values || []).slice(), sets: src.sets || 0, updates: src.updates || 0,
    erases: src.erases || 0, shifts: src.shifts || 0, transposes: src.transposes || 0,
    muls: (src.muls || []).map(function (pair) { return [pair[0].slice(), pair[1].slice()]; })
  };
}
function fingerprint(s) {
  return JSON.stringify({ rows: s.rows, cols: s.cols, rowptr: s.rowptr, colidx: s.colidx,
                          values: s.values, sets: s.sets, updates: s.updates, erases: s.erases,
                          shifts: s.shifts, transposes: s.transposes, muls: s.muls });
}
function apply(one, event) {
  if (event.kind === "set") { return set(one, event.row, event.col, event.value); }
  if (event.kind === "drop") { return drop(one, event.row, event.col); }
  if (event.kind === "transpose") { return transpose(one); }
  return mul(one, event.vec);
}
function runEvents(seed, events) {
  let one = copy(seed);
  let failed = 0;
  for (const event of events || []) {
    try { one = apply(one, event); } catch (error) { failed += 1; }
  }
  return { state: one, failed: failed };
}

const events = spec.events || [];
const first = runEvents(spec.state, events);
const state = first.state;
const rowptr = state.rowptr || [];
const colidx = state.colidx || [];
const values = state.values || [];
const rows = state.rows || 0;
const cols = state.cols || 0;

emit("收尾后形状", [rows, cols]);
emit("收尾后行指针", rowptr.slice());
emit("收尾后列索引", colidx.slice());
emit("收尾后值", values.slice());
const perRow = [];
for (let r = 0; r < rows; r += 1) { perRow.push(nonzeroCount(state, r)); }
emit("每行非零", perRow);
emit("非零总数", colidx.length);
emit("插入次数", state.sets || 0);
emit("覆盖次数", state.updates || 0);
emit("擦除次数", state.erases || 0);
emit("移位总数", state.shifts || 0);
emit("转置次数", state.transposes || 0);
emit("乘向量记录", (state.muls || []).map(function (pair) { return [pair[0].slice(), pair[1].slice()]; }));

let ptrOk = rowptr.length === rows + 1 && (rowptr[0] || 0) === 0 && (rowptr[rows] || 0) === colidx.length;
for (let r = 0; r < rows; r += 1) {
  if ((rowptr[r] || 0) > (rowptr[r + 1] || 0)) { ptrOk = false; }
}
emit("行指针自洽", ptrOk);

let colsOk = true;
for (let r = 0; r < rows; r += 1) {
  for (let i = rowptr[r] || 0; i < (rowptr[r + 1] || 0); i += 1) {
    if (i > (rowptr[r] || 0) && colidx[i - 1] >= colidx[i]) { colsOk = false; }
    if (colidx[i] < 0 || colidx[i] >= cols) { colsOk = false; }
  }
}
emit("列索引升序", colsOk);

let valueOk = values.length === colidx.length;
for (const value of values) { if (!value) { valueOk = false; } }
emit("值全非零", valueOk);

let countOk = (rowptr[rows] || 0) === colidx.length;
let total = 0;
for (const row of perRow) { total += row; }
if (total !== colidx.length) { countOk = false; }
emit("非零数自洽", countOk);

const again = runEvents(spec.state, events);
emit("重放不新增", fingerprint(again.state) === fingerprint(state) ? 0 : 1);
emit("重放报错条数", again.failed);

const half = Math.ceil(events.length / 2);
const left = runEvents(spec.state, events.slice(0, half));
const mid = fingerprint(left.state);
const right = runEvents(left.state, events.slice(half));
emit("拆两轮中间态不同", mid !== fingerprint(state));
emit("拆两轮收尾态一致", fingerprint(right.state) === fingerprint(state));
emit("异常事件数", first.failed);

// ---- 异常路径探针：真调用实现，看它报出什么码 ----
try {
  set(copy(spec.state), rows, 0, 1);
  emit("行越界报码", "没有报错");
} catch (error) {
  emit("行越界报码", error && error.code ? error.code : String(error.message));
}
try {
  set(copy(spec.state), 0, cols, 1);
  emit("列越界报码", "没有报错");
} catch (error) {
  emit("列越界报码", error && error.code ? error.code : String(error.message));
}
try {
  set(copy(spec.state), 0, 0, 0);
  emit("零值报码", "没有报错");
} catch (error) {
  emit("零值报码", error && error.code ? error.code : String(error.message));
}
try {
  drop(copy(spec.state), rows - 1, cols - 1);
  emit("缺失擦除报码", "没有报错");
} catch (error) {
  emit("缺失擦除报码", error && error.code ? error.code : String(error.message));
}
try {
  mul(copy(spec.state), [1]);
  emit("维度不符报码", "没有报错");
} catch (error) {
  emit("维度不符报码", error && error.code ? error.code : String(error.message));
}

// ---- 期望值（参考模型算出）----
const EXPECTED = {
  "收尾后形状": [
    3,
    4
  ],
  "收尾后行指针": [
    0,
    4,
    6,
    6
  ],
  "收尾后列索引": [
    0,
    1,
    2,
    3,
    0,
    1
  ],
  "收尾后值": [
    2,
    7,
    4,
    5,
    3,
    9
  ],
  "每行非零": [
    4,
    2,
    0
  ],
  "非零总数": 6,
  "插入次数": 8,
  "覆盖次数": 1,
  "擦除次数": 2,
  "移位总数": 5,
  "转置次数": 2,
  "乘向量记录": [
    [
      [
        1,
        2,
        3
      ],
      [
        6,
        25,
        0,
        5
      ]
    ]
  ],
  "行指针自洽": true,
  "列索引升序": true,
  "值全非零": true,
  "非零数自洽": true,
  "重放不新增": 0,
  "重放报错条数": 0,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "异常事件数": 0,
  "行越界报码": "E_BAD_ROW",
  "列越界报码": "E_BAD_COL",
  "零值报码": "E_BAD_VALUE",
  "缺失擦除报码": "E_NO_NNZ",
  "维度不符报码": "E_DIM"
};
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  if (__same(found[1], want)) { console.log("一致 " + label + " = " + JSON.stringify(found[1])); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1])); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
