# Forge Quick Start — v4.0.0

Get from zero to your first month's income statement in under 10 minutes.

---

## Step 1 — Export from Quicken

1. Open Quicken
2. **File → Export → Transactions to CSV**
3. Accounts: **All Accounts**
4. Date range: your earliest data through today
5. Save anywhere — filename doesn't matter

---

## Step 2 — Open Forge

Go to **https://luka731chris.github.io/Forge**

You'll see The Pour — the dark upload zone in the center of the screen.

---

## Step 3 — Import

Drag your Quicken CSV onto The Pour. Forge reads it, strips the preamble rows, deduplicates, and loads your full transaction history.

Optional extras (drag these on too if you have them):
- **Apple Card CSV** — exported from Wallet app → unlocks line-item Apple Card charges
- **Amazon order CSV** — from amazon.com → Returns & Orders → Download Order Report

---

## Step 4 — Income Statement

Click **Income** in the left nav.

The first thing you see is the Budget Pressure Bar for the current month — your deployable income vs fixed + variable spend.

Below it, the stepdown:

1. **Operating Income** — your actual checking deposits this month
2. **Pre-Committed Savings** — what was automatically transferred to savings on payday
3. **Deployable Cash** — what's left to fund all expenses
4. **Fixed Expenses** — obligations you can't immediately change (mortgage, utilities, etc.), sorted highest to lowest
5. **After Fixed** — running balance
6. **Variable & Discretionary** — the stuff you can actually influence this month
7. **Net Remaining** — the bottom line. Green = surplus, red = deficit.

---

## Step 5 — Reconcile

Expand the **Reconciliation** section at the bottom of the IS page.

Match the account balances shown to your Quicken accounts as of the last day of the month. They should match. If they do, the numbers are right.

---

## Forge Pulse (Mobile)

Open **https://luka731chris.github.io/Forge/forge-pulse.html** on your iPhone.

1. Add to Home Screen: Share → Add to Home Screen
2. Set a 6-digit PIN on first launch
3. Pull from Cloud (if sync is configured) or import files via the Settings tab

---

## Demo Mode

Not ready to import real data yet? Click **Demo** in the top-right corner of any page. Synthetic Pittsburgh family data loads instantly — all features work.

---

## What Each File Type Unlocks

| Without it | With it |
|-----------|---------|
| Quicken CSV only | All accounts, all transactions, IS works, reconciliation works |
| + Apple Card CSV | Apple Card charges shown as individual line items (not one lump payment) |
| + Amazon CSV | Amazon orders shown with product titles, categories, purchaser |
| + Net Worth export | Balance sheet tab fully populated |

---

## Common First Questions

**Why is my income statement blank?**
The IS only shows data for months where you have Quicken transactions. Select a month from the dropdown at the top right.

**Why does Pre-Committed Savings show zero?**
Forge detects savings auto-transfers by looking for checking→savings transfers near your payday. If your savings transfer happens on a different day or from a savings account (not checking), it may not be detected. Check the Settings tab to verify your accounts are mapped correctly.

**Why are some expenses uncategorized?**
The `other` bucket catches anything Forge couldn't map to a specific bucket. Go to Crosswalk tab to see exactly which Quicken categories are landing in `other` and why.

**How do I verify the numbers are right?**
Income Statement → Reconciliation section → compare account balances to Quicken Net Worth filtered to checking/savings/credit cards as of the last day of the month.
