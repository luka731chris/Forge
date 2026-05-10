# Forge Import Guide — v4.0.0

---

## Quicken Export (Primary — Required)

### Steps

1. Open Quicken → **File → Export → Transactions to QIF/CSV**
2. Select **All Accounts** (do not filter to one account — Forge needs the full register)
3. Date range: start from your earliest data; end = today
4. Format: **CSV** (comma-separated)
5. Save the file — any filename works

### What Forge Reads

Forge auto-detects the Quicken CSV by scanning the first 30 rows for a date column paired with an amount column. The following columns are used:

| Quicken Column | Forge Field |
|----------------|-------------|
| Date | `date` (YYYY-MM-DD normalized) |
| Payee / Description | `payee` |
| Amount | `amount` (negative = expense) |
| Category | `category` |
| Account | `account` |
| Memo/Notes | `memo` |
| Transaction Type | `type` |

Forge skips the Quicken preamble lines (account header rows) automatically.

### What to Upload Monthly

Export everything from the beginning each time. Forge deduplicates using `date|payee|amount|account` — re-importing old transactions is harmless and ensures nothing is missed.

---

## Apple Card CSV

### Steps

1. Open Wallet app on iPhone → tap Apple Card → tap the month → "Export Transactions"
2. Save the CSV — Forge detects it by `clearing date` + `merchant` column headers

### What Forge Does

- `Payment` rows (the lump-sum check Apple sends) are skipped via typeSkip at the top of the parse loop
- Individual charge rows get `_source: 'apple_card'`
- When Apple Card detail is loaded for a month, the matching Quicken payment row (checking debit to Apple) is automatically treated as a transfer — it won't double-count as an expense

### Monthly Checklist

- Export one CSV per month
- The filename can be anything — Forge detects format by column headers, not filename
- If you skip a month, the Quicken lump-sum payment stays as an expense (not ideal — upload the CSV)

---

## Amazon Order History

### Steps

1. Go to **amazon.com → Returns & Orders → Download Order Report**
2. Select date range (calendar year or rolling 12 months)
3. Download CSV

### What Forge Does

- Items get `_source: 'amazon_orders'`
- Purchaser attributed from filename: `amazon_chris.csv` → Chris; `amazon_kira.csv` → Kira
- Items appear in Detail Lens with purchaser badge
- The Quicken Amazon charge (lump-sum) stays in transactions as the payment record

### Filename Attribution

| Filename contains | Attributed to |
|------------------|---------------|
| `chris` | Chris |
| `kira` | Kira |
| `sam` | Sam |
| `whitney` | Whitney |
| `will` | Will |
| Anything else | unattributed |

---

## Quicken Net Worth Export

### Steps

1. Quicken → **Reports → Net Worth**
2. Set date to end of month
3. **Export → CSV**

### What Forge Does

- Populates the Balance Sheet tab with account-level balances
- Detected by "Net Worth" + account columns in the file

---

## Home Depot & Venmo

| File | Detection | Attribution |
|------|-----------|-------------|
| Home Depot | `order number` + `items ordered` columns | From filename |
| Venmo | `funding source` + `destination` columns | From filename |

Same filename-based purchaser attribution as Amazon.

---

## File Status Indicators

After import, Settings → Data & File Status shows:

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green dot (≤ 7 days old) | Recently imported — current |
| 🟡 Yellow dot (≤ 30 days) | Slightly stale — consider re-importing |
| 🔴 Red dot (> 30 days) | Stale — import fresh data |
| ○ Hollow dot | Not loaded — this file type has never been imported |

"Next from" sub-label shows the exact YYYY-MM-DD to use as the start date for your next Quicken export.

---

## Troubleshooting

**Transactions not appearing after import**
- Verify the file is a Quicken CSV (not a bank statement CSV — column headers differ)
- Check Settings → File Status — is the type shown as loaded?
- If you had demo data loaded, it was replaced on import (hard replace, not append)

**Apple Card charges doubled**
- The Quicken payment row and Apple Card detail CSV should complement each other, not stack
- Forge suppresses the Quicken payment row when Apple Card detail is loaded for that month
- If you see doubles: re-import both files after clearing data

**Pre-committed savings showing twice**
- Fixed in v4.0.0. If still occurring: verify source account is checking (not savings→savings transfer)
- Check Settings → All Uploaded Files for duplicate import entries

**Amazon items not in Detail Lens**
- Verify `_source` stamping by checking Settings → File Status for Amazon
- If hollow dot after import: filename may not contain a recognized file type header — open the CSV and verify it has `order id` and `asin` columns
