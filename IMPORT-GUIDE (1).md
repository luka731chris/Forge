# Forge Import Guide

Two import paths, one drop. Forge reads Quicken exports for full transaction history, and detail files (Amazon, Apple Card, any itemized CSV) for line-item intelligence and per-person analytics.

---

## Overview

| Zone | What goes here | What Forge does with it |
|------|---------------|------------------------|
| **Left — Quicken** | Transaction exports from Quicken | Full ledger: dates, amounts, payees, accounts, categories |
| **Right — Detail** | Amazon order history, Apple Card CSV, any itemized file | Line-item enrichment: individual purchases, categories, impulse scoring, purchaser attribution |

You can drop multiple files of either type at the same time. Forge processes them all in sequence and deduplicates automatically.

---

## Quicken Export — Full History (First Time)

The goal for your first import is to get everything — every account, every year you have. The more history Forge sees, the more accurate its seasonal patterns, trend baselines, and life-stage recommendations become.

### Mac

1. Open Quicken and sign in
2. In the **left sidebar**, click **All Transactions** — this shows every account together in one view
3. Clear any date filters so the full history is visible
4. **File → Export → Register Transactions to CSV File**
5. In the dialog: **Export: All visible transactions** · uncheck Scheduled Transactions
6. Click **Next** → choose a save location → **Save**
7. Drop the file onto the Quicken zone in The Pour → **Begin Forging**

### Windows

1. Open Quicken and sign in
2. **Reports → Banking → Transaction**
3. Set **Accounts: All Accounts** and date range from your earliest date through today
4. Run the report
5. Click the **Export icon** (green arrow at the top of the report) → **Export to CSV File**
6. Drop the file onto the Quicken zone → **Begin Forging**

### If Neither Works — Account by Account

Export each account individually (gear/Actions icon → Export to Excel workbook) and drop all the files at once. Forge merges them automatically.

> ⚠️ **Do not use** *File → Export → Quicken Transfer Format (.qxf)* — that file moves Quicken between computers. It cannot be imported here.

---

## Monthly Routine (2 Minutes)

Same export path, just change the date range to **Last 30–60 days, All Accounts**.

Forge deduplicates on `date|payee|amount|account` — it's always safe to re-import overlapping date ranges.

---

## Detail Files — Line-Item Enrichment

Detail files unmask lump-sum Quicken charges into individual line items. When you see "Amazon.com — $147.32" in your ledger, the Amazon order history tells you exactly what was bought. When you see "Apple Card — $89.00," the Apple Card statement tells you the merchant.

### Amazon Order History

Amazon changed their export in 2023. You must request the file — you cannot export directly.

1. On a **desktop browser**, go to amazon.com and sign in (cannot be done from the mobile app)
2. Click **Account & Lists → Account**
3. Scroll to **Manage your data** → **Request your data**
4. Select **Your Orders** → submit
5. Amazon sends a confirmation email immediately — **click the link to confirm**
6. Wait for a **second email with the download link** (usually a few hours, up to 24)
7. Download the ZIP file, unzip it, open the **Your Orders** folder
8. Use the file named **`Retail.OrderHistory.1.csv`**
9. Rename it to include the purchaser's first name if known (e.g. `Retail.OrderHistory.1_chris.csv`)
10. Drop onto the Detail zone in The Pour → **Begin Forging**

### Apple Card Monthly Statement

1. Open **Wallet** on iPhone
2. Tap your **Apple Card**
3. Scroll down to **Transactions** → tap any month's statement
4. Tap **Export Transactions** (or the share icon)
5. Save the CSV file to your computer
6. Rename to include the purchaser's name (e.g. `applecard_kira_march2026.csv`)
7. Drop onto the Detail zone → **Begin Forging**

### Other Sources

Any CSV file with **Date**, **Description/Merchant**, and **Amount** columns will be detected and imported. Examples:
- PayPal activity export
- Venmo transaction history
- Costco purchase history
- Store loyalty program export

Forge auto-detects the format. If it can't read the file, the result panel explains exactly what columns it expects.

---

## Purchaser Attribution — Tagging Who Bought What

This is the key to per-person analytics. There are two ways to tell Forge who made a purchase:

### Method 1 — Filename Tagging (Detail Files)

Include a family member's first name in the filename before importing:

| Filename | Who gets credited |
|----------|------------------|
| `amazon_chris.csv` | Chris |
| `Retail.OrderHistory.1_kira.csv` | Kira |
| `applecard_sam.csv` | Sam |
| `amazon.csv` | Unattributed (shared) |

Forge checks the filename against the family member list in Settings (user1, user2, kids). If it finds a match, every item in that file is attributed to that person.

### Method 2 — Account Owners (Quicken Data)

For Quicken accounts that belong primarily to one person:

1. Import your Quicken data first (accounts are created automatically from your export)
2. Go to **Settings → Account Owners**
3. For each account, choose the family member from the dropdown
4. Click **Save Changes**

Once mapped, Forge attributes every transaction in that account to that person — enabling per-person trend alerts, spending comparisons, and Confluence insights from your Quicken data.

**Which method to use:** Use both. Filename tagging handles detail files (Amazon, Apple Card). Account Owners handles Quicken. Together they give Forge full purchaser coverage across all your data.

---

## Supported File Formats

### Quicken Zone (left)

| Format | Extension | Notes |
|--------|-----------|-------|
| Comma-separated values | `.csv` | Most reliable. Use this when Quicken offers a choice. |
| Quicken Interchange Format | `.qif` | Also reliable. |
| Quicken Financial Exchange | `.qfx` | OFX format. May export empty in newer Quicken versions. |
| Open Financial Exchange | `.ofx` | Same as QFX. |

### Detail Zone (right)

| Format | Auto-detected by | Notes |
|--------|-----------------|-------|
| Amazon order history | `asin` column, `product name` column, or `retail.orderhistory` in filename | Use `Retail.OrderHistory.1.csv` |
| Apple Card statement | `clearing date` column, `amount (usd)` column, or `apple` in filename | Monthly CSV from Wallet app |
| Generic enrichment | Date + description + amount columns found | PayPal, Venmo, Costco, store exports |

---

## Removing Files Before Importing

Files queued for import appear below the drop zones:

- **✕** on a file card — removes that file
- **Clear all** — removes all queued files
- **✕ Clear** button — removes all files and clears the result panel
- **↺ Clear upload page** — full reset to blank slate

---

## Troubleshooting

### "0 transactions imported" from Quicken

The most common cause is a single-account or narrow-date export.

- **Mac:** Make sure you clicked **All Transactions** in the sidebar before exporting, not an individual account
- **Windows:** Make sure you used **Reports → Banking → Transaction** with All Accounts selected

### "Forge couldn't read line-item detail from this file"

The detail file doesn't have the expected columns. Forge looks for date + description/merchant + amount. Check that:
- The file is a real transaction export, not a summary or report
- The CSV is not password-protected or encoded
- For Amazon: use `Retail.OrderHistory.1.csv` specifically, not other files in the ZIP

### "Purchaser not attributed" — items show no person badge

The filename didn't match any family member's name. Check:
- Settings → The Family has the correct first names entered
- The filename contains the first name (case-insensitive): `amazon_Chris.csv` or `amazon_chris.csv` both work

### "0 items" from Amazon file

You're using the wrong file. Inside the Amazon ZIP, open the **Your Orders** folder. Use only `Retail.OrderHistory.1.csv`.

### "Import seems to work but count is lower than expected"

Forge shows the count of **new** items added — not the total in the file. If all items already exist in the ledger, the count will be 0. That is correct behavior.

---

## Monthly Maintenance Checklist

```
□ Export Quicken (last 30–60 days, All Accounts)
□ Download Amazon order history if updated
□ Export Apple Card statement for the month
□ Rename detail files with purchaser names
□ Drop all files into Forge → Begin Forging
□ Open The Confluence with your partner
□ Run 6-step agenda (~35 min)
□ Export PDF Blueprint
```
