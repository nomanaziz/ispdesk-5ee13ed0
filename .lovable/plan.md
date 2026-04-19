

User wants 3 accounting pages redesigned to match the legacy app screenshots:

### 1. CashBook (`src/pages/dashboard/accounting/CashBook.tsx`)
Replace month-only view with **From/To date range** + Update/Clear filters. Layout = single table with two side-by-side sections:

```
| Debit                    | Credit                       |
| Particular | Taka        | Particular        | Taka     |
| Collected Bill | xxxx    | Paid Salary       | xxxx     |
| Installation Charge      | Expense                      |
| Other Service Sales      | Bandwidth Provider Bill      |
| Product Sales            | Withdraw                     |
| POP Bill                 | Purchase Paid Amount         |
| Bandwidth POP Bill       | Total                        |
| Income                   |                              |
| Total                    |                              |
| Cash on Hand (Debit Total - Credit Total, full-width row) |
```

Data sources (aggregate sums in date range):
- Debit: `bw_sales_invoices.paid` (Bandwidth POP Bill), `pop_bills.paid` (POP Bill), `customer_bills.paid` (Collected Bill), `installation_fees`, `service_invoices`, `product_invoices`, `income_entries` (Income)
- Credit: `salary_payments` / payroll, `expense_entries`, `bw_purchase_bills.paid`, withdrawals, purchase paid

### 2. TrialBalance (`src/pages/dashboard/accounting/TrialBalance.tsx`)
Replace simple summary with **Till Date** filter + grouped sections by account type:
- Asset / Expense / Income / Liabilities / Owner's Equity (each with header bar, rows, Total row, full-width totals row at bottom)
- Generate PDF / Generate CSV buttons (top-right) using existing `src/lib/reportExport.ts`
- Show negative balances as-is, account names clickable styled

### 3. ComparePL (`src/pages/dashboard/accounting/ComparePL.tsx`)
Replace month dropdowns with **4 date pickers**: From/To Date + Compare From/To Date.
Top: 3 summary cards (Net Profit For Date | Net Profit For Compare Date | Change In Net Profit with %).
Table: grouped by Income / Cost of Goods Sold / Gross Profit / Expense / Net Profit, each showing both period totals + Change amount + Change %. Per-account rows from `chart_of_accounts` joined with `income_entries` / `expense_entries` per account.
Generate PDF / CSV buttons.

### Shared
- Use existing `ReportLayout` pattern (`src/components/reports/ReportLayout.tsx`) where suitable for filter bar.
- Use `exportPDF` / `exportCSV` from `src/lib/reportExport.ts`.
- Bangla labels kept; numeric format `toLocaleString` with 2 decimals like screenshots.
- Table header uses dark navy bg (`bg-[#2c5f6e]` or `bg-primary`) white text matching screenshots.

### Files to edit
- `src/pages/dashboard/accounting/CashBook.tsx`
- `src/pages/dashboard/accounting/TrialBalance.tsx`
- `src/pages/dashboard/accounting/ComparePL.tsx`

No DB migration needed — all required tables exist (`income_entries`, `expense_entries`, `chart_of_accounts`, `bw_sales_invoices`, `pop_bills`, `customer_bills`, etc.). If a referenced table is missing during implementation, I'll fall back to whatever's available and note it.

