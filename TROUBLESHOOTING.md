# 排错指南 — dsh-ap-three-way

> 错误信息统一为 `<一句人话>（E_XXX）｜下一步：<动作>`。完整报错与堆栈只写日志，不打印内部路径。

## 1. 金额列读不懂

- **症状**：导入后提示「金额“abc”读不懂（E_AP_CSV_INVALID）｜下一步：把金额改成 1234.56 这样的纯数字，最多两位小数」。
- **原因**：`unit_price` / `amount` 列出现空值、字母、三位以上小数，或把负数写成了括号。
- **动作**：把该列改成 `1234.56` 这样的纯数字后重跑。

## 2. CSV 缺少必需列

- **症状**：导入后提示「CSV 缺少 supplier 列（E_AP_CSV_INVALID）｜下一步：按 README 的列名补齐第一行表头后重跑」。
- **原因**：发票 / PO / GRN 三个 CSV 的表头与文档不一致，或有中文列名、空格拼写差异。
- **动作**：按 README 的表头补齐：发票 `supplier,invoice_no,po_no,line_no,qty,unit_price,amount`，PO `po_no,line_no,qty,unit_price,amount`，GRN `po_no,line_no,qty`。

## 3. 容差参数超出范围

- **症状**：提示「容差参数 price_bps 超出范围（E_AP_POLICY）｜下一步：把 price_bps 设为 0–10000 的整数」。
- **原因**：`price_bps` / `qty_bps` / `amount_bps` 传了小数、负数或大于 10000 的值（10000 bps = 100%）。
- **动作**：改成 0–10000 的整数后重跑；例如 1% = `100`，12% = `1200`。

## 安装或激活失败

- DSH 需满足 `>=0.2.1-rc.3 <0.4.0`，Node 需满足 `>=24.9 <25`。
- 用临时 `DSH_HOME` 排除旧配置干扰：

```sh
export DSH_HOME="$(mktemp -d)"
dsh plugin --profile <profile> add dsh-ap-three-way
dsh --profile <profile> --dump-config | grep dsh-ap-three-way
```

## 自己复现

```sh
pnpm build
node samples/quickstart/run.mjs          # 合成样例，应输出 quickstart ok
node --test test/*.test.mjs              # 全绿
```

## 报告问题

请附版本号、最小合成输入和完整工具调用；**不要上传客户数据**。
<https://github.com/PerryLink/dsh-ap-three-way/issues>
