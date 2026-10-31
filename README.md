# dsh-ap-three-way

AP invoice/PO/GRN three-way match with tolerance policy and exception workpaper for DeepSeek Harness.

> **Status: alpha / public-synthetic / partial / not counted / not GA.** No customer evidence, customer data, or production-readiness claim. All acceptance rows are `counted=false`.

## Install

```sh
dsh plugin --profile <profile> add dsh-ap-three-way
dsh --profile <profile> --dump-config | grep dsh-ap-three-way
```

Requires DSH `>=0.2.1-rc.3 <0.3.0` and Node `>=24.9 <25`.

<details>
<summary>中文摘要</summary>

发票/PO/GRN 三单匹配、容差与例外底稿。 安装：`dsh plugin --profile <profile> add dsh-ap-three-way`。公开/合成、alpha、非 GA。

</details>

## Tools

| Tool | What it does | Risk |
|---|---|---|
| `ap.import` | Import invoice, PO and GRN rows | R1 local write |
| `ap.import_invoice_xml` | Import an invoice XML fixture | R1 local write |
| `ap.match` | Three-way match with a 1% default price tolerance and quantity checks | R0 |
| `ap.export` | Export Matches/Exceptions xlsx | R1 local write |

## Input / output

**Input:** invoice, purchase-order and goods-receipt rows (CSV or invoice XML). **Output:** matched rows and an exceptions workpaper. Price tolerance defaults to 1% and is explicit in the result.

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `DSH_AP_HOME` | `$DSH_HOME/storages/dsh-ap-three-way` | local domain and exports |

## Limits / non-claims

- No PDF/OCR invoice extraction, ERP posting, or supplier portal integration.
- No multi-currency/FX engine and no Client surface.
- Synthetic invoice/PO/GRN fixtures only; no customer data.
- No customer evidence, customer data, or production-readiness claim; all fixtures are public/synthetic.

## Public sample

MIT synthetic invoice/PO/GRN scenarios; `ACCEPTANCE.csv` lists 5 public checks.

## Development

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm gate:sku05
```

## License

Apache-2.0. See `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES`.
