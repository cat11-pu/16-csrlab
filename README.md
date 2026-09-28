# csrlab

稀疏矩阵压缩行存储工作台（原生 ES 模块，零依赖）：上面一格热度画布看非零分布，右侧三元组表看逐条非零，底部按钮置值、擦除、转置、乘向量。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ 即可操作。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js
