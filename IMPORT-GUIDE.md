# Forge Import Guide

Everything you need to get data into Forge — Quicken exports, Net Worth reports, merchant CSVs, and the monthly update workflow.

---

## Quicken Exports

### All Transactions CSV (primary ledger)

This is the file you'll import most often. It contains every transaction across all accounts.

**Steps:**
1. Quicken → **Reports** tab
2. **Spending** → **All Transactions**
3. Set date range: from your earliest data through today (e.g., 1/1/2023 → today)
4. **Export** → **Export to CSV**
5. Save as something like `QuickenExportAll_260413.csv`
6. Drop onto Forge Import page

**What Forge does with it:**
- Skips the 4-line preamble Quicken adds (title, blank, date range, blank)
- Maps columns: Date, Account, Payee, Amount, Category, Memo
- Sets `isTransfer:true` for any transaction with a bracket category like `[Checking - PNC]`
- Runs `autoDetectNonRecurring()` after parsing to flag bonuses and large rare income
- Deduplicates: `date|payee|amount|account` — re-importing the same file adds zero duplicate rows

**File format Quicken uses:**
```
Transaction,,,,,,,,
,,,,,,,,
1/1/2023 through 4/13/2026,,,,,,,,
,,,,,,,,
Date,Account,Num,Payee,Memo,Category,Tag,Clr,Amount
5/6/2024,Checking - PNC,,Giant Eagle,,Food & Dining:Groceries,,,"-127.43"
```

---

### Net Worth CSV (balance sheet snapshots)

Export one of these for each historical comparison point you want available in the Balance Sheet dropdown.

**Steps:**
1. Quicken → **Reports** tab
2. **Net Worth & Balances** → **Net Worth**
3. Set the **"as of"** date to the period end you want
4. **Export** → **Export to CSV**
5. Name the file to reflect the date (see table below)
6. Drop onto Forge Import page — you can drop a NW file alone, no transaction file needed

**Recommended snapshot schedule:**

| Balance Sheet dropdown | As-of date to set | Suggested filename |
|---|---|---|
| YE 2024 | 12/31/2024 | `NetWorth_241231.csv` |
| Q1 2025 | 3/31/2025 | `NetWorth_250331.csv` |
| Q2 2025 | 6/30/2025 | `NetWorth_250630.csv` |
| Q3 2025 | 9/30/2025 | `NetWorth_250930.csv` |
| YE 2025 | 12/31/2025 | `NetWorth_251231.csv` |
| Current | Today (most recent) | `NetWorth_260413.csv` |

Upload each file once. Forge stores every snapshot in `forge_networth_hist` keyed by date — they accumulate without overwriting each other. The Balance Sheet comparison column uses the closest snapshot on or before the selected comparison date.

**Storage behavior:**

| Key | Cleared by Clear Data? | Cleared by? |
|---|---|---|
| `forge_networth` | Yes | Clear Data button |
| `forge_networth_hist` | **No** | "✕ Clear NW History" button in Balance Sheet header only |

This means you run through your 5–6 historical NW exports once, upload them all, and they persist permanently regardless of how many times you re-import your transaction file.

**What Forge parses from the NW file:**

Quicken Net Worth reports look like this:
```
Net Worth

As of 12/31/2025

ASSETS

Cash and Bank Accounts
   Checking - PNC                    15,432.00
   Savings - PNC                     22,100.00
...
```

Forge reads account name + balance pairs, skips all TOTAL/SUBTOTAL/NET WORTH summary rows, and stores `{ 'Checking - PNC': { value: 15432, date: '2025-12-31', source: 'quicken-nw' } }`.

---

## Merchant CSVs

Drop any of these alongside your Quicken file or by themselves. Forge auto-detects format from column headers — no configuration needed.

### Apple Card

**How to export:** Wallet app on iPhone → tap your Apple Card → scroll down → **Export Transactions** → choose date range → Share → save as CSV.

**What Forge detects:** `clearing date` + `merchant` + `amount (usd)` columns.

**What you get:**
- Payee = Merchant column (cleaner store name: "Giant Eagle" not "GIANT EAGLE 0382")
- `itemDetail` = Description column (the raw terminal string: "GIANT EAGLE 0382 PITT PA")
- Amounts negated (Apple exports charges as positive; Forge makes them negative)
- Account name = filename (e.g., `apple_card_chris.csv` → account "apple_card_chris")

**Tip:** Name the file with the person's name for attribution: `apple_card_chris.csv`, `apple_card_kira.csv`.

---

### Amazon Order History

**How to export:** amazon.com → Account → Order History Reports → choose "Items" report type → set date range → Request Report → Download CSV when ready.

**What Forge detects:** `order id` + `asin` + `total charged` columns.

**What you get:**
- Payee = product title (truncated to 60 chars + `…` if longer)
- `itemDetail` = full product title (e.g., "Milwaukee M18 FUEL 1/2 in. Hammer Drill/Driver Kit with Two Batteries")
- One transaction per order line item
- Amounts negated (Amazon exports as positive)

---

### Home Depot Orders

**How to export:** homedepot.com → Order History → select an order → Print/Save confirmation, or use the order export if available in your account.

**What Forge detects:** `order number` + `items ordered` + `order total` columns.

**What you get:**
- Payee = items ordered field
- `itemDetail` = same (full item description)
- Amounts negated

---

### Venmo Statement

**How to export:** venmo.com → Settings → Statements → Download CSV for the date range.

**What Forge detects:** `funding source` + `destination` + `amount (total)` columns.

**What you get:**
- Outgoing payments (negative): payee = "To" column
- Incoming payments (positive): payee = "From" column
- `itemDetail` = Note column (e.g., "Soccer fees", "Birthday gift", "Split dinner")
- Amounts use sign from the amount string itself (`- $50.00` = -50, `+ $100.00` = +100)

---

## How the Drop Zone Works

1. Drop one or more files (any combination of the above formats)
2. Forge reads each file, detects its format by column headers
3. Net Worth files go to `parseNetWorthCSV()` → stored in snapshot history
4. Transaction files go through the parser chain → appended to `txns[]` with dedup
5. Toast shows result: "✓ filename.csv — 847 transactions from 3 accounts"
6. If `WORKER_URL` is set and a file returns 0 rows, Smart Scan runs automatically as fallback

**Dedup:** `date|payee|amount|account` exact match. Re-importing the same Quicken export adds nothing. Uploading overlapping date ranges is safe.

---

## Monthly Update Workflow

End of month:

1. Quicken → All Transactions report → set date through end of month → Export CSV
2. Drop onto Forge Import
3. Verify the Data Validation page shows no new issues
4. Check Budget vs Actual for the closing month
5. Visit Balance Sheet — review the KPI tiles

Quarterly (or when you want fresh comparison data):

1. Quicken → Net Worth report → set to last day of the quarter
2. Export CSV → name it `NetWorth_YYMMDD.csv`
3. Drop onto Forge Import
4. Balance Sheet now has an accurate comparison point for that quarter

---

## What Quicken Categories Map to in Forge

Forge classifies transactions into buckets for the Income Statement waterfall and Budget vs Actual.

| Quicken category | Forge bucket |
|---|---|
| Net Salary, Direct Deposit, W-2 Income | paycheck |
| Interest Earned, Dividends | other_inc |
| Mortgage & Rent, --Split-- (House Loan payee) | mortgage |
| Auto Loan, --Split-- (Palisade payee) | car |
| Education, Tuition, Student Loan | education |
| Insurance | insurance |
| Childcare, Daycare | childcare |
| Electric, Gas & Electric | electric |
| Gas (utility), Natural Gas | gas_util |
| Water, Sewer | water |
| Internet, Cable & Internet | internet |
| Cell Phone, Mobile Phone | cell |
| Food & Dining:Groceries, Supermarkets | groceries |
| Auto & Transport:Gas, Gasoline | gas_car |
| Bus, Subway, Rideshare | transit |
| Health & Fitness, Doctor, Dentist, Pharmacy | healthcare |
| Food & Dining:Restaurants, Fast Food, Takeout | restaurants |
| Entertainment, Movies, Sports | entertainment |
| Home, Furnishings, Lawn & Garden | household |
| Personal Care, Salon, Barber | personal |
| Shopping:Clothing, Department Store | clothing |
| Travel, Hotels, Airlines, Vacation | travel |
| Streaming, Software subscriptions | subscriptions |
| Gifts, Charity, Donations | gifts |
| Everything else | other |

If transactions land in **Other / Uncategorized**, better Quicken category names will move them into the right bucket on the next import.
