# Forge Import Guide

Everything you need to get your Quicken data into Forge — first time and every month after.

---

## The Two Workflows

| When | What to do |
|------|-----------|
| **First time** | Export your full history — as many years as Quicken has |
| **Every month** | Export the last 30–60 days and drop it in |

Forge deduplicates automatically. You cannot create duplicate transactions by importing a file twice or overlapping date ranges.

---

## First-Time Setup: Full History Export

This is a one-time step. The more history you give Forge, the more accurate its trend analysis, seasonal patterns, and year-over-year comparisons become. Do this once, then switch to the monthly routine.

### Step 1 — Export from Quicken

1. Open Quicken on your computer and sign in
2. In the menu bar, click **File → Export → Transactions to QIF**
   - If you don't see this exact option, look for **File → Export → Transactions**
3. In the export dialog:
   - **Accounts:** Select **All Accounts** — not just one account
   - **Date range:** Set the start date as far back as Quicken will allow (ideally 2017 or earlier)
   - **File type:** Save as **CSV** or **QIF** — both are supported
4. Click **Save** — Quicken creates the file on your computer

### Step 2 — Import into Forge

1. In Forge, click **+ The Pour** in the left navigation
2. Drag your exported file onto the **Quicken drop zone** (the left drop zone on The Pour page)
   - The zone turns **gold** as you hold the file over it
   - It flashes **green** with a ✓ when the file is accepted
   - The file appears in the queue below the drop zone
3. Click **Begin Forging**
4. A progress bar shows the import in progress
5. The **Import Results** panel shows what was imported, with a count of new transactions
6. After a successful import, Forge navigates to The Gauge (Dashboard) automatically

### What to Expect

- A full 5-year history from Quicken typically imports 10,000–30,000 transactions
- Import time: 5–30 seconds depending on file size
- Forge automatically creates accounts based on the account names in your Quicken file
- Categories and payee names come directly from your Quicken data — nothing is remapped

---

## Monthly Routine (2 minutes)

After your initial import, do this on the 1st of every month.

1. Open Quicken → **File → Export → Transactions**
2. Set the date range to **Last 30–60 days**, All Accounts, save as CSV
3. In Forge, go to **The Pour** and drop the file onto the Quicken drop zone
4. Click **Begin Forging**
5. Done — Forge merges the new transactions with your existing history

> **Tip:** Export 60 days instead of 30 to catch any late-posting transactions. Forge skips anything already in the ledger.

---

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Comma-separated values | `.csv` | Most reliable. Use this if Quicken offers a choice. |
| Quicken Interchange Format | `.qif` | Also reliable. Preserves account structure well. |
| Quicken Financial Exchange | `.qfx` | OFX format. Works but sometimes exports empty from newer Quicken versions. |
| Open Financial Exchange | `.ofx` | Same as QFX. |

### ⚠️ The File You Must NOT Use

**File → Export → Quicken Transfer Format (.qxf)** — this is the wrong export.

`.qxf` is used to move your entire Quicken installation to a new computer. It is an encrypted binary file with no readable transaction data inside. Forge detects this file and tells you exactly what to do instead.

The correct path is always: **File → Export → Transactions** (not "Transfer Format").

---

## CSV Column Requirements

If you export as CSV, Forge looks for these columns (case-insensitive, flexible naming):

| Column | Accepted Names |
|--------|---------------|
| Date | `date`, `transaction date`, `trans date`, `posted date`, `post date`, `value date` |
| Payee | `payee`, `description`, `merchant`, `name`, `memo`, `narrative`, `details` |
| Amount | `amount`, `transaction amount`, `value`, `debit/credit`, `net amount`, `withdrawal`, `deposit` |
| Category | `category`, `type`, `transaction type`, `class` (optional) |
| Account | `account`, `account name`, `account number` (optional) |

If the Account column is missing, Forge uses the filename as the account name.

---

## Amazon Order History

Forge can analyze your Amazon spending for impulse-buy patterns, category trends, and repeat purchases. This is optional — all other features work without it.

Amazon changed their export process in 2023. You cannot download order history directly — you must request it and wait for an email.

### How to Request Your Amazon Data

1. On a **desktop browser**, go to amazon.com and sign in (cannot be done from the mobile app)
2. Click **Account & Lists → Account**
3. Scroll down to **Manage your data** → click **Request your data**
4. Select **Your Orders** and submit the request
5. Amazon sends a **confirmation email immediately** — click the link in it to confirm your request
6. Wait for a **second email with your download link** (usually a few hours, sometimes up to 24)
7. Download the ZIP file
8. Unzip it and open the **Your Orders** folder
9. Find the file named **`Retail.OrderHistory.1.csv`**
10. Drag it onto the **Amazon drop zone** (the right drop zone on The Pour page)

### Monthly Amazon Refresh

Repeat the request process each month. Amazon will send you a new ZIP with your updated order history. Forge deduplicates automatically — orders already in the Watchlist are skipped.

---

## Removing Files Before Importing

Files added to the import queue appear below the drop zones with their filename, size, and source badge.

- **Remove one file:** Click the **✕** button on the right side of the file card
- **Remove all files:** Click **Clear all** above the file list
- **Clear everything and start over:** Click **↺ Clear** next to the Begin Forging button, or **↺ Clear upload page** near the top of the page

---

## Troubleshooting Import Errors

### "0 transactions imported"

**Most common cause:** The export dialog in Quicken was set to a single account or a very narrow date range.

Fix: Re-export with **All Accounts** selected and a wider date range.

### "File is not a recognized type"

You have a `.qxf` file (Quicken Transfer Format). This is the wrong export.

Fix: In Quicken, use **File → Export → Transactions** (not "Transfer Format").

### "No Date column found"

The CSV is missing the Date column, or the column header is named differently.

Fix: Open the CSV in Excel or Numbers and check the first row. The date column must have a header that includes the word "date". Re-export from Quicken with default CSV settings.

### "No amount column found"

Same issue — the amount column header is not being recognized.

Fix: The amount column must be named something containing "amount", "debit", "credit", "value", or "withdrawal". Re-export with default Quicken CSV settings.

### Import seems to work but transaction count is lower than expected

This is normal when re-importing. Forge shows the count of **new** transactions added, not the total in the file. If all transactions in the file already exist in the ledger, the count will be 0 — and that is correct behavior.

### Amazon: "0 items found"

You are using the wrong file from the ZIP.

Fix: Inside the ZIP Amazon sends you, open the **Your Orders** folder. Use only the file named **`Retail.OrderHistory.1.csv`**. Do not use any other file from the ZIP.

---

## What Forge Does With Your Data

1. **Parses** the file in-memory (never touches a server)
2. **Deduplicates** against your existing ledger using a `date|payee|amount|account` composite key
3. **Saves** all new transactions to `localStorage` under the key `ledger_v3`
4. **Auto-creates accounts** from account names found in the file
5. **Navigates** to The Gauge (Dashboard) after a successful import

All data stays in your browser. Nothing is uploaded anywhere. Clearing your browser's localStorage or using private/incognito mode will remove all Forge data.
